/**
 * Network Preferences Redux Slice
 * Manages user preferences for receiving tokens on specific networks
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { NetworkId } from '@/src/constants/networks';
import {
  loadNetworkPreferences,
  saveNetworkPreferences,
  clearNetworkPreferences,
} from '@/src/services/preferences-service';

/**
 * Token symbol -> preferred network ID (null = any network)
 * "Any network" means receive on sender's network (no conversion fees)
 */
export type TokenNetworkPreferences = Record<string, NetworkId | null>;

interface NetworkPreferencesState {
  // Token preferences: { USDC: 'arbitrum', USDT: null, ... }
  tokenPreferences: TokenNetworkPreferences;
  // Loading state
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  // Sync status with backend
  syncStatus: 'synced' | 'pending' | 'failed';
  lastSyncedAt: number | null;
}

const initialState: NetworkPreferencesState = {
  tokenPreferences: {},
  status: 'idle',
  error: null,
  syncStatus: 'synced',
  lastSyncedAt: null,
};

/**
 * Load preferences from local storage
 */
export const loadPreferencesThunk = createAsyncThunk(
  'networkPreferences/load',
  async () => {
    const preferences = await loadNetworkPreferences();
    return preferences;
  }
);

/**
 * Save preferences to local storage and sync to backend
 */
export const savePreferencesThunk = createAsyncThunk(
  'networkPreferences/save',
  async (preferences: TokenNetworkPreferences) => {
    await saveNetworkPreferences(preferences);
    // TODO: Sync to backend for @username lookups (E-41)
    return preferences;
  }
);

/**
 * Set preference for a single token
 */
export const setTokenPreferenceThunk = createAsyncThunk(
  'networkPreferences/setToken',
  async (
    { symbol, networkId }: { symbol: string; networkId: NetworkId | null },
    { getState }
  ) => {
    const state = getState() as { networkPreferences: NetworkPreferencesState };
    const updated = {
      ...state.networkPreferences.tokenPreferences,
      [symbol]: networkId,
    };

    // Remove null entries to keep storage clean
    if (networkId === null) {
      delete updated[symbol];
    }

    await saveNetworkPreferences(updated);
    return updated;
  }
);

/**
 * Clear all preferences
 */
export const clearPreferencesThunk = createAsyncThunk(
  'networkPreferences/clear',
  async () => {
    await clearNetworkPreferences();
  }
);

const networkPreferencesSlice = createSlice({
  name: 'networkPreferences',
  initialState,
  reducers: {
    // Optimistic update for UI
    setTokenPreference: (
      state,
      action: PayloadAction<{ symbol: string; networkId: NetworkId | null }>
    ) => {
      const { symbol, networkId } = action.payload;
      if (networkId === null) {
        delete state.tokenPreferences[symbol];
      } else {
        state.tokenPreferences[symbol] = networkId;
      }
      state.syncStatus = 'pending';
    },

    // Mark sync status
    setSyncStatus: (
      state,
      action: PayloadAction<'synced' | 'pending' | 'failed'>
    ) => {
      state.syncStatus = action.payload;
      if (action.payload === 'synced') {
        state.lastSyncedAt = Date.now();
      }
    },

    // Reset state
    resetPreferences: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Load preferences
      .addCase(loadPreferencesThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadPreferencesThunk.fulfilled, (state, action) => {
        state.tokenPreferences = action.payload;
        state.status = 'succeeded';
      })
      .addCase(loadPreferencesThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load preferences';
      })

      // Save preferences
      .addCase(savePreferencesThunk.pending, (state) => {
        state.syncStatus = 'pending';
      })
      .addCase(savePreferencesThunk.fulfilled, (state, action) => {
        state.tokenPreferences = action.payload;
        state.syncStatus = 'synced';
        state.lastSyncedAt = Date.now();
      })
      .addCase(savePreferencesThunk.rejected, (state, action) => {
        state.syncStatus = 'failed';
        state.error = action.error.message || 'Failed to save preferences';
      })

      // Set single token preference
      .addCase(setTokenPreferenceThunk.fulfilled, (state, action) => {
        state.tokenPreferences = action.payload;
        state.syncStatus = 'synced';
        state.lastSyncedAt = Date.now();
      })
      .addCase(setTokenPreferenceThunk.rejected, (state, action) => {
        state.syncStatus = 'failed';
        state.error = action.error.message || 'Failed to save preference';
      })

      // Clear preferences
      .addCase(clearPreferencesThunk.fulfilled, (state) => {
        state.tokenPreferences = {};
        state.syncStatus = 'synced';
        state.lastSyncedAt = Date.now();
      });
  },
});

export const { setTokenPreference, setSyncStatus, resetPreferences } =
  networkPreferencesSlice.actions;

// Selectors
export const selectTokenPreference = (
  state: { networkPreferences: NetworkPreferencesState },
  symbol: string
): NetworkId | null => {
  return state.networkPreferences.tokenPreferences[symbol] ?? null;
};

export const selectAllPreferences = (state: {
  networkPreferences: NetworkPreferencesState;
}): TokenNetworkPreferences => {
  return state.networkPreferences.tokenPreferences;
};

export const selectPreferencesStatus = (state: {
  networkPreferences: NetworkPreferencesState;
}): NetworkPreferencesState['status'] => {
  return state.networkPreferences.status;
};

export default networkPreferencesSlice.reducer;
