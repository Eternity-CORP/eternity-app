/**
 * Network Preferences Slice
 * User's preferred networks for receiving tokens
 * Uses defaultNetwork + tokenOverrides model
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NetworkId } from '@/src/constants/networks';
import {
  savePreferences,
  type NetworkPreferences,
} from '@/src/services/preferences-service';
import { getWalletFromMnemonic } from '@/src/services/wallet-service';
import { createLogger } from '@/src/utils/logger';

const log = createLogger('NetworkPreferencesSlice');

const STORAGE_KEY = '@ey_network_preferences_v2';

/**
 * Network preferences state
 */
interface NetworkPreferencesState {
  /** User's default network for receiving all tokens (null = sender's choice) */
  defaultNetwork: NetworkId | null;
  /** Token-specific network overrides (e.g., receive USDC on Arbitrum) */
  tokenOverrides: Record<string, NetworkId>;

  /** Sync state */
  status: 'idle' | 'loading' | 'saving' | 'succeeded' | 'failed';
  error: string | null;
  loaded: boolean;
  lastSyncedAt: string | null;
  pendingSync: boolean;
}

/**
 * Data structure for local storage
 */
interface StoredPreferences {
  defaultNetwork: NetworkId | null;
  tokenOverrides: Record<string, NetworkId>;
  lastSyncedAt: string | null;
}

const initialState: NetworkPreferencesState = {
  defaultNetwork: null,
  tokenOverrides: {},
  status: 'idle',
  error: null,
  loaded: false,
  lastSyncedAt: null,
  pendingSync: false,
};

/**
 * Load preferences from AsyncStorage
 */
export const loadPreferencesThunk = createAsyncThunk(
  'networkPreferences/load',
  async () => {
    log.debug('Loading preferences from storage');
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as StoredPreferences;
      log.debug('Preferences loaded', data);
      return data;
    }
    log.debug('No stored preferences found');
    return null;
  }
);

/**
 * Save preferences locally and sync to backend
 * If backend sync fails, marks pendingSync = true for later retry
 */
export const savePreferencesThunk = createAsyncThunk(
  'networkPreferences/save',
  async (_, { getState }) => {
    const state = getState() as {
      networkPreferences: NetworkPreferencesState;
      wallet: { mnemonic: string | null };
    };

    const { defaultNetwork, tokenOverrides } = state.networkPreferences;
    const { mnemonic } = state.wallet;

    // Prepare data for storage
    const dataToStore: StoredPreferences = {
      defaultNetwork,
      tokenOverrides,
      lastSyncedAt: state.networkPreferences.lastSyncedAt,
    };

    // Save to local storage first (offline-first approach)
    log.debug('Saving preferences to local storage');
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));

    // Attempt to sync to backend if wallet is available
    let syncedAt: string | null = null;
    let syncFailed = false;

    if (mnemonic) {
      try {
        log.debug('Syncing preferences to backend');
        const wallet = getWalletFromMnemonic(mnemonic, 0);
        const preferences: NetworkPreferences = {
          defaultNetwork,
          tokenOverrides,
        };
        await savePreferences(preferences, wallet);
        syncedAt = new Date().toISOString();

        // Update local storage with sync timestamp
        dataToStore.lastSyncedAt = syncedAt;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));

        log.info('Preferences synced to backend', { syncedAt });
      } catch (error) {
        log.warn('Failed to sync preferences to backend', error);
        syncFailed = true;
        // Don't throw - local save succeeded, just mark pending sync
      }
    } else {
      log.debug('No mnemonic available, skipping backend sync');
      syncFailed = true;
    }

    return {
      defaultNetwork,
      tokenOverrides,
      lastSyncedAt: syncedAt,
      pendingSync: syncFailed,
    };
  }
);

const networkPreferencesSlice = createSlice({
  name: 'networkPreferences',
  initialState,
  reducers: {
    /**
     * Set the default network for receiving all tokens
     * @param networkId - Preferred network or null for "sender's choice"
     */
    setDefaultNetwork: (state, action: PayloadAction<NetworkId | null>) => {
      state.defaultNetwork = action.payload;
      state.pendingSync = true; // Mark for sync
    },

    /**
     * Set a token-specific network override
     * @param symbol - Token symbol (e.g., 'USDC', 'ETH')
     * @param networkId - Preferred network for this token
     */
    setTokenOverride: (
      state,
      action: PayloadAction<{ symbol: string; networkId: NetworkId }>
    ) => {
      const { symbol, networkId } = action.payload;
      const normalizedSymbol = symbol.toUpperCase();
      state.tokenOverrides[normalizedSymbol] = networkId;
      state.pendingSync = true; // Mark for sync
    },

    /**
     * Remove a token-specific override (falls back to defaultNetwork)
     * @param symbol - Token symbol to remove override for
     */
    removeTokenOverride: (state, action: PayloadAction<string>) => {
      const normalizedSymbol = action.payload.toUpperCase();
      delete state.tokenOverrides[normalizedSymbol];
      state.pendingSync = true; // Mark for sync
    },

    /**
     * Clear all preferences (reset to initial state)
     */
    clearPreferences: (state) => {
      state.defaultNetwork = null;
      state.tokenOverrides = {};
      state.lastSyncedAt = null;
      state.pendingSync = true; // Mark for sync
    },
  },
  extraReducers: (builder) => {
    builder
      // Load preferences
      .addCase(loadPreferencesThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadPreferencesThunk.fulfilled, (state, action) => {
        if (action.payload) {
          state.defaultNetwork = action.payload.defaultNetwork ?? null;
          state.tokenOverrides = action.payload.tokenOverrides ?? {};
          state.lastSyncedAt = action.payload.lastSyncedAt ?? null;
        }
        state.status = 'succeeded';
        state.error = null;
        state.loaded = true;
      })
      .addCase(loadPreferencesThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load preferences';
        state.loaded = true; // Mark as loaded even on error to prevent infinite retries
      })
      // Save preferences
      .addCase(savePreferencesThunk.pending, (state) => {
        state.status = 'saving';
        state.error = null;
      })
      .addCase(savePreferencesThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.error = null;
        state.lastSyncedAt = action.payload.lastSyncedAt;
        state.pendingSync = action.payload.pendingSync;
      })
      .addCase(savePreferencesThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to save preferences';
        state.pendingSync = true; // Mark for retry
      });
  },
});

// Export actions
export const {
  setDefaultNetwork,
  setTokenOverride,
  removeTokenOverride,
  clearPreferences,
} = networkPreferencesSlice.actions;

// ============================================================================
// Selectors
// ============================================================================

type RootState = { networkPreferences: NetworkPreferencesState };

/**
 * Select the default network preference
 */
export const selectDefaultNetwork = (state: RootState): NetworkId | null => {
  return state.networkPreferences.defaultNetwork;
};

/**
 * Select all token overrides
 */
export const selectTokenOverrides = (
  state: RootState
): Record<string, NetworkId> => {
  return state.networkPreferences.tokenOverrides;
};

/**
 * Select whether preferences have been loaded from storage
 */
export const selectPreferencesLoaded = (state: RootState): boolean => {
  return state.networkPreferences.loaded;
};

/**
 * Select the current status
 */
export const selectPreferencesStatus = (
  state: RootState
): NetworkPreferencesState['status'] => {
  return state.networkPreferences.status;
};

/**
 * Select whether there's a pending sync to backend
 */
export const selectPendingSync = (state: RootState): boolean => {
  return state.networkPreferences.pendingSync;
};

/**
 * Select the preferred network for a specific token
 * Priority: tokenOverrides[symbol] > defaultNetwork > null (sender's choice)
 *
 * @param state - Redux state
 * @param symbol - Token symbol (e.g., 'USDC', 'ETH')
 * @returns The preferred network or null if no preference
 */
export const selectPreferredNetworkForToken = (
  state: RootState,
  symbol: string
): NetworkId | null => {
  const normalizedSymbol = symbol.toUpperCase();
  const override = state.networkPreferences.tokenOverrides[normalizedSymbol];
  if (override) {
    return override;
  }
  return state.networkPreferences.defaultNetwork;
};

export default networkPreferencesSlice.reducer;
