/**
 * Scanning Redux Slice
 * Manages smart scanning state for Tier 2 network balances
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  scanTier2Networks,
  dismissAlert,
  snoozeAlert,
  shouldScan,
  type Tier2TokenBalance,
} from '@/src/services/smart-scanning-service';

export interface ScanningState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  lastScanTimestamp: number | null;
  foundBalances: Tier2TokenBalance[];
  totalUsdValue: number;
  error: string | null;
  // Track which alerts are currently visible
  visibleAlerts: Tier2TokenBalance[];
}

const initialState: ScanningState = {
  status: 'idle',
  lastScanTimestamp: null,
  foundBalances: [],
  totalUsdValue: 0,
  error: null,
  visibleAlerts: [],
};

/**
 * Scan Tier 2 networks for token balances
 */
export const scanNetworksThunk = createAsyncThunk(
  'scanning/scanNetworks',
  async (walletAddress: string, { rejectWithValue }) => {
    try {
      const result = await scanTier2Networks(walletAddress);
      return result;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Scan failed');
    }
  }
);

/**
 * Check if scan is needed and run if so
 */
export const checkAndScanThunk = createAsyncThunk(
  'scanning/checkAndScan',
  async (walletAddress: string, { dispatch }) => {
    if (shouldScan()) {
      return dispatch(scanNetworksThunk(walletAddress)).unwrap();
    }
    return null;
  }
);

const scanningSlice = createSlice({
  name: 'scanning',
  initialState,
  reducers: {
    /**
     * Dismiss an alert for a specific token on a network
     */
    dismissTokenAlert: (
      state,
      action: PayloadAction<{ networkId: string; tokenSymbol: string }>
    ) => {
      const { networkId, tokenSymbol } = action.payload;
      dismissAlert(networkId, tokenSymbol);
      state.visibleAlerts = state.visibleAlerts.filter(
        (a) => !(a.networkId === networkId && a.tokenSymbol === tokenSymbol)
      );
    },

    /**
     * Snooze an alert for a specific token on a network
     */
    snoozeTokenAlert: (
      state,
      action: PayloadAction<{ networkId: string; tokenSymbol: string }>
    ) => {
      const { networkId, tokenSymbol } = action.payload;
      snoozeAlert(networkId, tokenSymbol);
      state.visibleAlerts = state.visibleAlerts.filter(
        (a) => !(a.networkId === networkId && a.tokenSymbol === tokenSymbol)
      );
    },

    /**
     * Clear all scanning state
     */
    resetScanning: () => initialState,

    /**
     * Update visible alerts (e.g., after bridge)
     */
    removeAlert: (
      state,
      action: PayloadAction<{ networkId: string; tokenSymbol: string }>
    ) => {
      const { networkId, tokenSymbol } = action.payload;
      state.visibleAlerts = state.visibleAlerts.filter(
        (a) => !(a.networkId === networkId && a.tokenSymbol === tokenSymbol)
      );
      state.foundBalances = state.foundBalances.filter(
        (b) => !(b.networkId === networkId && b.tokenSymbol === tokenSymbol)
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(scanNetworksThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(scanNetworksThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.lastScanTimestamp = action.payload.timestamp;
        state.foundBalances = action.payload.balances;
        state.totalUsdValue = action.payload.totalUsdValue;
        state.visibleAlerts = action.payload.balances;
        state.error = null;
      })
      .addCase(scanNetworksThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string || 'Scan failed';
      });
  },
});

export const {
  dismissTokenAlert,
  snoozeTokenAlert,
  resetScanning,
  removeAlert,
} = scanningSlice.actions;

export default scanningSlice.reducer;
