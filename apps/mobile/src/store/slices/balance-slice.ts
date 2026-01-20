/**
 * Balance Redux Slice
 * Manages token balances and USD values across multiple networks
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  fetchAllBalances,
  fetchEthUsdPrice,
  calculateTotalUsdValue,
  type TokenBalance
} from '@/src/services/balance-service';
import {
  fetchAllNetworkBalances,
  type AggregatedTokenBalance,
  type NetworkTokenBalance,
  type MultiNetworkBalanceResult,
} from '@/src/services/network-service';
import { NetworkId, TIER1_NETWORK_IDS } from '@/src/constants/networks';

interface BalanceState {
  // Legacy: single-network balances (for backwards compatibility)
  balances: TokenBalance[];

  // New: multi-network aggregated balances
  aggregatedBalances: AggregatedTokenBalance[];

  // New: per-network breakdown
  networkBalances: Record<NetworkId, NetworkTokenBalance[]>;

  // Networks that failed to fetch
  failedNetworks: NetworkId[];

  totalUsdValue: number;
  ethUsdPrice: number;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  lastUpdated: number | null;

  // Track which mode we're in
  isMultiNetworkEnabled: boolean;
}

const initialState: BalanceState = {
  balances: [],
  aggregatedBalances: [],
  networkBalances: {} as Record<NetworkId, NetworkTokenBalance[]>,
  failedNetworks: [],
  totalUsdValue: 0,
  ethUsdPrice: 0,
  status: 'idle',
  error: null,
  lastUpdated: null,
  isMultiNetworkEnabled: true, // Enable by default
};

/**
 * Fetch ETH USD price
 */
export const fetchEthPriceThunk = createAsyncThunk(
  'balance/fetchEthPrice',
  async () => {
    const price = await fetchEthUsdPrice();
    return price;
  }
);

/**
 * Fetch balances for an address (legacy single-network)
 * Fetches ETH + all ERC-20 tokens with prices
 */
export const fetchBalancesThunk = createAsyncThunk(
  'balance/fetchBalances',
  async (address: string) => {
    const result = await fetchAllBalances(address);
    return result;
  }
);

/**
 * Fetch balances from all supported networks
 * This is the new multi-network approach
 */
export const fetchMultiNetworkBalancesThunk = createAsyncThunk(
  'balance/fetchMultiNetworkBalances',
  async (address: string): Promise<MultiNetworkBalanceResult> => {
    const result = await fetchAllNetworkBalances(address, TIER1_NETWORK_IDS);
    return result;
  }
);

const balanceSlice = createSlice({
  name: 'balance',
  initialState,
  reducers: {
    clearBalances: (state) => {
      state.balances = [];
      state.aggregatedBalances = [];
      state.networkBalances = {} as Record<NetworkId, NetworkTokenBalance[]>;
      state.failedNetworks = [];
      state.totalUsdValue = 0;
      state.status = 'idle';
      state.error = null;
      state.lastUpdated = null;
    },
    setMultiNetworkEnabled: (state, action: PayloadAction<boolean>) => {
      state.isMultiNetworkEnabled = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch ETH price
      .addCase(fetchEthPriceThunk.fulfilled, (state, action) => {
        state.ethUsdPrice = action.payload;
        // Update USD values for existing balances
        state.balances = state.balances.map((balance) => {
          if (balance.token === 'ETH') {
            return {
              ...balance,
              usdValue: parseFloat(balance.balance) * action.payload,
            };
          }
          return balance;
        });
        state.totalUsdValue = calculateTotalUsdValue(state.balances);
      })
      // Fetch balances (legacy single-network)
      .addCase(fetchBalancesThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchBalancesThunk.fulfilled, (state, action) => {
        state.balances = action.payload.balances;
        state.ethUsdPrice = action.payload.ethPrice;
        state.totalUsdValue = action.payload.totalUsdValue;
        state.status = 'succeeded';
        state.lastUpdated = Date.now();
        state.error = null;
      })
      .addCase(fetchBalancesThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch balances';
      })
      // Fetch multi-network balances (new)
      .addCase(fetchMultiNetworkBalancesThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchMultiNetworkBalancesThunk.fulfilled, (state, action) => {
        state.aggregatedBalances = action.payload.aggregatedBalances;
        state.networkBalances = action.payload.networkBalances;
        state.failedNetworks = action.payload.failedNetworks;
        state.totalUsdValue = action.payload.totalUsdValue;
        state.lastUpdated = action.payload.lastUpdated;
        state.status = 'succeeded';
        state.error = null;

        // Also update legacy balances for backwards compatibility
        // Convert aggregated balances to legacy format
        state.balances = action.payload.aggregatedBalances.map((agg) => ({
          token: agg.symbol,
          symbol: agg.symbol,
          name: agg.name,
          balance: agg.totalBalance,
          balanceRaw: '0', // Not available in aggregated format
          decimals: agg.decimals,
          usdValue: agg.totalUsdValue,
          iconUrl: agg.iconUrl,
          lastUpdated: action.payload.lastUpdated,
        }));
      })
      .addCase(fetchMultiNetworkBalancesThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to fetch multi-network balances';
      });
  },
});

export const { clearBalances, setMultiNetworkEnabled } = balanceSlice.actions;

// Selectors
export const selectAggregatedBalances = (state: { balance: BalanceState }) =>
  state.balance.aggregatedBalances;

export const selectNetworkBalances = (state: { balance: BalanceState }) =>
  state.balance.networkBalances;

export const selectFailedNetworks = (state: { balance: BalanceState }) =>
  state.balance.failedNetworks;

export const selectTokenNetworkBreakdown = (
  state: { balance: BalanceState },
  symbol: string
) => {
  const token = state.balance.aggregatedBalances.find(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase()
  );
  return token?.networks || [];
};

export const selectIsMultiNetworkEnabled = (state: { balance: BalanceState }) =>
  state.balance.isMultiNetworkEnabled;

export default balanceSlice.reducer;
