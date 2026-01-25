/**
 * Network Preferences Slice
 * Per-token network preferences for receiving tokens
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NetworkId } from '@/src/constants/networks';

const NETWORK_PREFERENCES_STORAGE_KEY = '@ey_network_preferences';

/**
 * Default behavior when no preference is set for a token
 * - 'sender_network': Receive on sender's network (no bridging)
 * - 'cheapest_gas': Auto-select network with lowest gas fees
 */
export type DefaultNetworkBehavior = 'sender_network' | 'cheapest_gas';

/**
 * Per-token network preference
 */
export interface TokenNetworkPreference {
  preferredNetwork: NetworkId | null; // null = no preference (any network)
  updatedAt: string; // ISO timestamp
}

/**
 * Network preferences state
 */
interface NetworkPreferencesState {
  // Per-token preferences: which network user prefers to receive each token on
  tokenPreferences: {
    [tokenSymbol: string]: TokenNetworkPreference;
  };
  // Default behavior when no preference is set
  defaultBehavior: DefaultNetworkBehavior;
  // Loading state
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  // Whether preferences have been loaded from storage
  loaded: boolean;
}

const initialState: NetworkPreferencesState = {
  tokenPreferences: {},
  defaultBehavior: 'sender_network',
  status: 'idle',
  error: null,
  loaded: false,
};

/**
 * Data structure for storage (excludes transient state)
 */
interface StoredNetworkPreferences {
  tokenPreferences: NetworkPreferencesState['tokenPreferences'];
  defaultBehavior: DefaultNetworkBehavior;
}

/**
 * Load network preferences from AsyncStorage
 */
export const loadNetworkPreferencesThunk = createAsyncThunk(
  'networkPreferences/load',
  async () => {
    const stored = await AsyncStorage.getItem(NETWORK_PREFERENCES_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as StoredNetworkPreferences;
    }
    return null;
  }
);

/**
 * Save network preferences to AsyncStorage
 */
export const saveNetworkPreferencesThunk = createAsyncThunk(
  'networkPreferences/save',
  async (_, { getState }) => {
    const state = getState() as { networkPreferences: NetworkPreferencesState };
    const dataToStore: StoredNetworkPreferences = {
      tokenPreferences: state.networkPreferences.tokenPreferences,
      defaultBehavior: state.networkPreferences.defaultBehavior,
    };
    await AsyncStorage.setItem(
      NETWORK_PREFERENCES_STORAGE_KEY,
      JSON.stringify(dataToStore)
    );
    return dataToStore;
  }
);

const networkPreferencesSlice = createSlice({
  name: 'networkPreferences',
  initialState,
  reducers: {
    /**
     * Set preferred network for a specific token
     * @param symbol - Token symbol (e.g., 'USDC', 'ETH')
     * @param networkId - Preferred network or null for "any network"
     */
    setTokenPreference: (
      state,
      action: PayloadAction<{ symbol: string; networkId: NetworkId | null }>
    ) => {
      const { symbol, networkId } = action.payload;
      state.tokenPreferences[symbol] = {
        preferredNetwork: networkId,
        updatedAt: new Date().toISOString(),
      };
    },

    /**
     * Clear preference for a specific token (removes from preferences)
     * Different from setting to null - this removes the entry entirely
     */
    clearTokenPreference: (state, action: PayloadAction<string>) => {
      const symbol = action.payload;
      delete state.tokenPreferences[symbol];
    },

    /**
     * Set default behavior when no preference is set
     */
    setDefaultBehavior: (
      state,
      action: PayloadAction<DefaultNetworkBehavior>
    ) => {
      state.defaultBehavior = action.payload;
    },

    /**
     * Clear all preferences (reset to initial state)
     */
    clearAllPreferences: (state) => {
      state.tokenPreferences = {};
      state.defaultBehavior = 'sender_network';
    },
  },
  extraReducers: (builder) => {
    builder
      // Load preferences
      .addCase(loadNetworkPreferencesThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadNetworkPreferencesThunk.fulfilled, (state, action) => {
        if (action.payload) {
          state.tokenPreferences = action.payload.tokenPreferences || {};
          state.defaultBehavior =
            action.payload.defaultBehavior || 'sender_network';
        }
        state.status = 'succeeded';
        state.error = null;
        state.loaded = true;
      })
      .addCase(loadNetworkPreferencesThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load network preferences';
        state.loaded = true; // Mark as loaded even on error to prevent infinite retries
      })
      // Save preferences
      .addCase(saveNetworkPreferencesThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(saveNetworkPreferencesThunk.fulfilled, (state) => {
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(saveNetworkPreferencesThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to save network preferences';
      });
  },
});

// Export actions
export const {
  setTokenPreference,
  clearTokenPreference,
  setDefaultBehavior,
  clearAllPreferences,
} = networkPreferencesSlice.actions;

// ============================================================================
// Selectors
// ============================================================================

type RootState = { networkPreferences: NetworkPreferencesState };

/**
 * Select the full preference object for a token (includes updatedAt)
 */
export const selectTokenPreference = (
  state: RootState,
  symbol: string
): TokenNetworkPreference | undefined => {
  return state.networkPreferences.tokenPreferences[symbol];
};

/**
 * Select just the preferred network for a token (or null if no preference)
 */
export const selectPreferredNetwork = (
  state: RootState,
  symbol: string
): NetworkId | null => {
  const preference = state.networkPreferences.tokenPreferences[symbol];
  return preference?.preferredNetwork ?? null;
};

/**
 * Select the default behavior setting
 */
export const selectDefaultBehavior = (state: RootState): DefaultNetworkBehavior => {
  return state.networkPreferences.defaultBehavior;
};

/**
 * Select all token preferences
 */
export const selectAllTokenPreferences = (
  state: RootState
): NetworkPreferencesState['tokenPreferences'] => {
  return state.networkPreferences.tokenPreferences;
};

/**
 * Select whether preferences have been loaded
 */
export const selectNetworkPreferencesLoaded = (state: RootState): boolean => {
  return state.networkPreferences.loaded;
};

/**
 * Select the loading status
 */
export const selectNetworkPreferencesStatus = (
  state: RootState
): NetworkPreferencesState['status'] => {
  return state.networkPreferences.status;
};

/**
 * Select any error message
 */
export const selectNetworkPreferencesError = (
  state: RootState
): string | null => {
  return state.networkPreferences.error;
};

export default networkPreferencesSlice.reducer;
