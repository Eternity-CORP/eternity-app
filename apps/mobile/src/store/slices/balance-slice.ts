/**
 * Balance Redux Slice
 * Manages token balances and USD values
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { fetchEthBalance, fetchEthUsdPrice, calculateTotalUsdValue, type TokenBalance } from '@/src/services/balance-service';

interface BalanceState {
  balances: TokenBalance[];
  totalUsdValue: number;
  ethUsdPrice: number;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  lastUpdated: number | null;
}

const initialState: BalanceState = {
  balances: [],
  totalUsdValue: 0,
  ethUsdPrice: 0,
  status: 'idle',
  error: null,
  lastUpdated: null,
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
 * Fetch balances for an address
 */
export const fetchBalancesThunk = createAsyncThunk(
  'balance/fetchBalances',
  async (address: string) => {
    // Fetch ETH balance
    const ethBalance = await fetchEthBalance(address);
    
    // Fetch ETH USD price
    const ethPrice = await fetchEthUsdPrice();
    
    // Calculate USD value
    const ethUsdValue = parseFloat(ethBalance.balance) * ethPrice;
    
    const balances: TokenBalance[] = [
      {
        ...ethBalance,
        usdValue: ethUsdValue,
      },
    ];
    
    return {
      balances,
      ethPrice,
      totalUsdValue: calculateTotalUsdValue(balances),
    };
  }
);

const balanceSlice = createSlice({
  name: 'balance',
  initialState,
  reducers: {
    clearBalances: (state) => {
      state.balances = [];
      state.totalUsdValue = 0;
      state.status = 'idle';
      state.error = null;
      state.lastUpdated = null;
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
      // Fetch balances
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
      });
  },
});

export const { clearBalances } = balanceSlice.actions;
export default balanceSlice.reducer;
