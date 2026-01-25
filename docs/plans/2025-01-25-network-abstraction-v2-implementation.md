# Network Abstraction v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement recipient network preferences with auto-sync, enabling senders to automatically route transfers to recipient's preferred network.

**Architecture:** Preferences stored by address (single source of truth), fetched on recipient input, used by routing service. Default network + token overrides with priority resolution.

**Tech Stack:** Redux Toolkit, AsyncStorage, TypeScript, React Native, Backend API (NestJS/PostgreSQL)

---

## Task 1: Create Preferences Service

**Files:**
- Create: `apps/mobile/src/services/preferences-service.ts`

**Step 1: Create the service file**

```typescript
/**
 * Preferences Service
 * Handles fetching and saving network preferences by address
 */

import type { HDNodeWallet } from 'ethers';
import { apiClient, ApiError } from './api-client';
import { createLogger } from '@/src/utils/logger';
import type { NetworkId } from '@/src/constants/networks';

const log = createLogger('PreferencesService');

/**
 * User's network preferences
 */
export interface NetworkPreferences {
  defaultNetwork: NetworkId | null;
  tokenOverrides: Record<string, NetworkId>;
  updatedAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

/**
 * Popular tokens for token override selection
 */
export const POPULAR_TOKENS = [
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'USDT', name: 'Tether' },
  { symbol: 'DAI', name: 'Dai' },
  { symbol: 'WETH', name: 'Wrapped Ether' },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin' },
  { symbol: 'MATIC', name: 'Polygon' },
  { symbol: 'ARB', name: 'Arbitrum' },
  { symbol: 'OP', name: 'Optimism' },
  { symbol: 'LINK', name: 'Chainlink' },
] as const;

/**
 * Sleep helper for retry logic
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with retry and exponential backoff
 */
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delay = 500
): Promise<T | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries) {
        log.warn('All retries failed', { error });
        return null;
      }
      await sleep(delay * (i + 1));
    }
  }
  return null;
}

/**
 * Get preferences by address
 */
export async function getAddressPreferences(
  address: string
): Promise<NetworkPreferences | null> {
  try {
    const data = await apiClient.get<ApiResponse<{ preferences: NetworkPreferences }>>(
      `/api/address/${encodeURIComponent(address.toLowerCase())}/preferences`
    );
    return data.data?.preferences ?? null;
  } catch (error) {
    if (ApiError.isApiError(error) && error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Get preferences by address with retry
 */
export async function getAddressPreferencesWithRetry(
  address: string
): Promise<NetworkPreferences | null> {
  return fetchWithRetry(() => getAddressPreferences(address));
}

/**
 * Save preferences (authenticated via signature)
 */
export async function savePreferences(
  preferences: NetworkPreferences,
  wallet: HDNodeWallet
): Promise<void> {
  const address = wallet.address.toLowerCase();
  const timestamp = Date.now();
  const message = `E-Y:preferences:${address}:${timestamp}`;
  const signature = await wallet.signMessage(message);

  try {
    await apiClient.put('/api/preferences', {
      defaultNetwork: preferences.defaultNetwork,
      tokenOverrides: preferences.tokenOverrides,
      address,
      signature,
      timestamp,
    });
    log.info('Preferences saved', { address });
  } catch (error) {
    if (ApiError.isApiError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Failed to save preferences');
  }
}

/**
 * Resolve preferred network for a token
 * Priority: tokenOverrides[token] > defaultNetwork > null (any)
 */
export function resolvePreferredNetwork(
  preferences: NetworkPreferences | null,
  tokenSymbol: string
): NetworkId | null {
  if (!preferences) return null;

  // 1. Token-specific override (highest priority)
  const override = preferences.tokenOverrides[tokenSymbol.toUpperCase()];
  if (override) return override;

  // 2. Default network
  return preferences.defaultNetwork;
}
```

**Step 2: Export from services index**

Modify `apps/mobile/src/services/index.ts` - add export:

```typescript
export {
  getAddressPreferences,
  getAddressPreferencesWithRetry,
  savePreferences,
  resolvePreferredNetwork,
  POPULAR_TOKENS,
  type NetworkPreferences,
} from './preferences-service';
```

**Step 3: Commit**

```bash
git add apps/mobile/src/services/preferences-service.ts apps/mobile/src/services/index.ts
git commit -m "feat: add preferences service for network preferences by address"
```

---

## Task 2: Update Network Preferences Slice

**Files:**
- Modify: `apps/mobile/src/store/slices/network-preferences-slice.ts`

**Step 1: Update the state interface and initial state**

Replace the entire file with new data model:

```typescript
/**
 * Network Preferences Slice
 * User's receiving network preferences (default + token overrides)
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NetworkId } from '@/src/constants/networks';
import { savePreferences, type NetworkPreferences } from '@/src/services/preferences-service';
import { getWalletFromMnemonic } from '@/src/services/wallet-service';
import { createLogger } from '@/src/utils/logger';

const log = createLogger('NetworkPreferencesSlice');
const STORAGE_KEY = '@ey_network_preferences_v2';

/**
 * State interface
 */
interface NetworkPreferencesState {
  // User's preferences
  defaultNetwork: NetworkId | null;
  tokenOverrides: Record<string, NetworkId>;

  // Sync state
  status: 'idle' | 'loading' | 'saving' | 'succeeded' | 'failed';
  error: string | null;
  loaded: boolean;
  lastSyncedAt: string | null;

  // Pending sync (if backend save failed)
  pendingSync: boolean;
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
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as {
        defaultNetwork: NetworkId | null;
        tokenOverrides: Record<string, NetworkId>;
        lastSyncedAt: string | null;
      };
    }
    return null;
  }
);

/**
 * Save preferences locally and sync to backend
 */
export const savePreferencesThunk = createAsyncThunk(
  'networkPreferences/save',
  async (
    _,
    { getState }
  ) => {
    const state = getState() as {
      networkPreferences: NetworkPreferencesState;
      wallet: { mnemonic: string | null; currentAccountIndex: number };
    };

    const { defaultNetwork, tokenOverrides } = state.networkPreferences;
    const { mnemonic, currentAccountIndex } = state.wallet;

    // Save locally first
    const dataToStore = { defaultNetwork, tokenOverrides, lastSyncedAt: new Date().toISOString() };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));

    // Sync to backend if wallet available
    if (mnemonic) {
      try {
        const wallet = getWalletFromMnemonic(mnemonic, currentAccountIndex);
        await savePreferences({ defaultNetwork, tokenOverrides }, wallet);
        log.info('Preferences synced to backend');
        return { ...dataToStore, pendingSync: false };
      } catch (error) {
        log.warn('Failed to sync preferences to backend', { error });
        return { ...dataToStore, pendingSync: true };
      }
    }

    return { ...dataToStore, pendingSync: false };
  }
);

const networkPreferencesSlice = createSlice({
  name: 'networkPreferences',
  initialState,
  reducers: {
    /**
     * Set default receiving network
     */
    setDefaultNetwork: (state, action: PayloadAction<NetworkId | null>) => {
      state.defaultNetwork = action.payload;
    },

    /**
     * Set token override
     */
    setTokenOverride: (state, action: PayloadAction<{ symbol: string; networkId: NetworkId }>) => {
      const { symbol, networkId } = action.payload;
      state.tokenOverrides[symbol.toUpperCase()] = networkId;
    },

    /**
     * Remove token override
     */
    removeTokenOverride: (state, action: PayloadAction<string>) => {
      const symbol = action.payload.toUpperCase();
      delete state.tokenOverrides[symbol];
    },

    /**
     * Clear all preferences
     */
    clearPreferences: (state) => {
      state.defaultNetwork = null;
      state.tokenOverrides = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // Load
      .addCase(loadPreferencesThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadPreferencesThunk.fulfilled, (state, action) => {
        if (action.payload) {
          state.defaultNetwork = action.payload.defaultNetwork;
          state.tokenOverrides = action.payload.tokenOverrides || {};
          state.lastSyncedAt = action.payload.lastSyncedAt;
        }
        state.status = 'succeeded';
        state.loaded = true;
        state.error = null;
      })
      .addCase(loadPreferencesThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load preferences';
        state.loaded = true;
      })
      // Save
      .addCase(savePreferencesThunk.pending, (state) => {
        state.status = 'saving';
      })
      .addCase(savePreferencesThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.lastSyncedAt = action.payload.lastSyncedAt;
        state.pendingSync = action.payload.pendingSync;
        state.error = null;
      })
      .addCase(savePreferencesThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to save preferences';
        state.pendingSync = true;
      });
  },
});

export const {
  setDefaultNetwork,
  setTokenOverride,
  removeTokenOverride,
  clearPreferences,
} = networkPreferencesSlice.actions;

// Selectors
type RootState = { networkPreferences: NetworkPreferencesState };

export const selectDefaultNetwork = (state: RootState) => state.networkPreferences.defaultNetwork;
export const selectTokenOverrides = (state: RootState) => state.networkPreferences.tokenOverrides;
export const selectPreferencesLoaded = (state: RootState) => state.networkPreferences.loaded;
export const selectPreferencesStatus = (state: RootState) => state.networkPreferences.status;
export const selectPendingSync = (state: RootState) => state.networkPreferences.pendingSync;

/**
 * Get preferred network for a specific token
 */
export const selectPreferredNetworkForToken = (state: RootState, symbol: string): NetworkId | null => {
  const override = state.networkPreferences.tokenOverrides[symbol.toUpperCase()];
  if (override) return override;
  return state.networkPreferences.defaultNetwork;
};

export default networkPreferencesSlice.reducer;
```

**Step 2: Commit**

```bash
git add apps/mobile/src/store/slices/network-preferences-slice.ts
git commit -m "feat: update network-preferences-slice with default network + token overrides"
```

---

## Task 3: Update Send Slice with Recipient Preferences

**Files:**
- Modify: `apps/mobile/src/store/slices/send-slice.ts`

**Step 1: Add recipient preferences state and thunk**

Add to the SendState interface (after line 33):

```typescript
  // Recipient's network preferences
  recipientPreferences: {
    defaultNetwork: NetworkId | null;
    tokenOverrides: Record<string, NetworkId>;
  } | null;
  recipientPreferencesStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  recipientPreferencesError: string | null;
```

Add to initialState (after line 48):

```typescript
  recipientPreferences: null,
  recipientPreferencesStatus: 'idle',
  recipientPreferencesError: null,
```

Add import at top:

```typescript
import type { NetworkId } from '@/src/constants/networks';
import { getAddressPreferencesWithRetry, resolvePreferredNetwork } from '@/src/services/preferences-service';
import { lookupUsername } from '@/src/services/username-service';
import { isAddress } from 'ethers';
```

Add new thunk after sendTransactionThunk:

```typescript
/**
 * Fetch recipient's network preferences
 */
export const fetchRecipientPreferencesThunk = createAsyncThunk(
  'send/fetchRecipientPreferences',
  async (recipient: string) => {
    // Resolve address if username
    let address = recipient;

    if (recipient.startsWith('@')) {
      const resolved = await lookupUsername(recipient);
      if (!resolved) {
        throw new Error('Username not found');
      }
      address = resolved;
    } else if (!isAddress(recipient)) {
      throw new Error('Invalid address');
    }

    // Fetch preferences with retry
    const preferences = await getAddressPreferencesWithRetry(address);
    return preferences;
  }
);
```

Add to reducers (after resetSend):

```typescript
    clearRecipientPreferences: (state) => {
      state.recipientPreferences = null;
      state.recipientPreferencesStatus = 'idle';
      state.recipientPreferencesError = null;
    },
```

Add extraReducers for the new thunk:

```typescript
      // Fetch recipient preferences
      .addCase(fetchRecipientPreferencesThunk.pending, (state) => {
        state.recipientPreferencesStatus = 'loading';
        state.recipientPreferencesError = null;
      })
      .addCase(fetchRecipientPreferencesThunk.fulfilled, (state, action) => {
        state.recipientPreferences = action.payload;
        state.recipientPreferencesStatus = 'succeeded';
        state.recipientPreferencesError = null;
      })
      .addCase(fetchRecipientPreferencesThunk.rejected, (state, action) => {
        state.recipientPreferences = null;
        state.recipientPreferencesStatus = 'failed';
        state.recipientPreferencesError = action.error.message || 'Failed to fetch preferences';
      })
```

Export the new action:

```typescript
export const { setStep, setSelectedToken, setRecipient, setAmount, resetSend, setSplitBillContext, setScheduledPaymentContext, clearRecipientPreferences } = sendSlice.actions;
```

**Step 2: Commit**

```bash
git add apps/mobile/src/store/slices/send-slice.ts
git commit -m "feat: add recipient preferences to send-slice"
```

---

## Task 4: Update Recipient Screen to Fetch Preferences

**Files:**
- Modify: `apps/mobile/app/send/recipient.tsx`

**Step 1: Import and dispatch preferences fetch**

Add import:

```typescript
import { setRecipient, setStep, fetchRecipientPreferencesThunk, clearRecipientPreferences } from '@/src/store/slices/send-slice';
```

In the component, after username/address is validated successfully, dispatch the preferences fetch. Find the handleContinue function and modify it:

```typescript
  const handleContinue = useCallback(() => {
    const finalAddress = resolvedAddress || input;
    if (!finalAddress || !validateAddress(finalAddress)) {
      setError('Invalid address');
      return;
    }

    // Don't allow sending to self
    if (finalAddress.toLowerCase() === currentAccount?.address.toLowerCase()) {
      setError("Can't send to yourself");
      return;
    }

    dispatch(setRecipient(finalAddress));

    // Fetch recipient preferences in background
    dispatch(fetchRecipientPreferencesThunk(resolvedUsername || finalAddress));

    dispatch(setStep('token'));
    router.push('/send/token');
  }, [dispatch, resolvedAddress, resolvedUsername, input, currentAccount?.address]);
```

Also clear preferences when input changes significantly. In useEffect for input change, add:

```typescript
  // Clear recipient preferences when input changes
  useEffect(() => {
    dispatch(clearRecipientPreferences());
  }, [input, dispatch]);
```

**Step 2: Commit**

```bash
git add apps/mobile/app/send/recipient.tsx
git commit -m "feat: fetch recipient preferences on recipient input"
```

---

## Task 5: Update Confirm Screen to Use Recipient Preferences

**Files:**
- Modify: `apps/mobile/app/send/confirm.tsx`

**Step 1: Use recipient preferences from send state**

Replace the current routing calculation useEffect with one that uses recipientPreferences:

Find lines ~74-100 and replace:

```typescript
  // Get recipient's preferred network for the selected token
  const recipientPreferredNetwork = useMemo(() => {
    if (!send.recipientPreferences) return null;

    // Priority: token override > default network > null
    const override = send.recipientPreferences.tokenOverrides[send.selectedToken?.toUpperCase() || ''];
    if (override) return override;
    return send.recipientPreferences.defaultNetwork;
  }, [send.recipientPreferences, send.selectedToken]);

  // Calculate transfer route for cross-network sends
  useEffect(() => {
    async function calculateRoute() {
      if (!currentAccount?.address || !send.recipient || !send.amount || !send.selectedToken) {
        return;
      }

      setRoutingStatus('loading');
      try {
        const result = await calculateTransferRoute(
          aggregatedBalances,
          send.selectedToken,
          send.amount,
          recipientPreferredNetwork,  // Now uses actual preference!
          currentAccount.address,
          send.recipient
        );
        setRoutingResult(result);
      } catch (error) {
        console.error('Failed to calculate route:', error);
        setRoutingResult(null);
      } finally {
        setRoutingStatus('done');
      }
    }
    calculateRoute();
  }, [currentAccount?.address, send.recipient, send.amount, send.selectedToken, aggregatedBalances, recipientPreferredNetwork]);
```

Add a warning banner if preferences fetch failed. Add after the routing status indicator:

```typescript
        {/* Preferences fetch warning */}
        {send.recipientPreferencesStatus === 'failed' && (
          <View style={styles.warningCard}>
            <FontAwesome name="exclamation-triangle" size={16} color={theme.colors.warning} />
            <Text style={[theme.typography.caption, { color: theme.colors.warning, flex: 1, marginLeft: 8 }]}>
              Couldn't load recipient's network preferences. Sending on cheapest available network.
            </Text>
          </View>
        )}
```

Add the style:

```typescript
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning + '15',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.warning + '30',
  },
```

**Step 2: Commit**

```bash
git add apps/mobile/app/send/confirm.tsx
git commit -m "feat: use recipient preferences in confirm screen routing"
```

---

## Task 6: Redesign Network Settings UI

**Files:**
- Modify: `apps/mobile/app/settings/networks.tsx`

**Step 1: Rewrite with new UI (default network + token overrides)**

Replace entire file:

```typescript
/**
 * Network Settings Screen
 * Configure default receiving network and token-specific overrides
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { FontAwesome } from '@expo/vector-icons';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import {
  selectDefaultNetwork,
  selectTokenOverrides,
  selectPreferencesLoaded,
  setDefaultNetwork,
  setTokenOverride,
  removeTokenOverride,
  loadPreferencesThunk,
  savePreferencesThunk,
} from '@/src/store/slices/network-preferences-slice';
import { POPULAR_TOKENS } from '@/src/services/preferences-service';
import { NetworkId, SUPPORTED_NETWORKS } from '@/src/constants/networks';

const NETWORK_OPTIONS: { id: NetworkId | null; name: string; recommended?: boolean }[] = [
  { id: null, name: 'Any network (sender chooses)' },
  { id: 'base', name: 'Base', recommended: true },
  { id: 'polygon', name: 'Polygon' },
  { id: 'arbitrum', name: 'Arbitrum' },
  { id: 'optimism', name: 'Optimism' },
  { id: 'ethereum', name: 'Ethereum' },
];

export default function NetworkSettingsScreen() {
  const dispatch = useAppDispatch();
  const defaultNetwork = useAppSelector(selectDefaultNetwork);
  const tokenOverrides = useAppSelector(selectTokenOverrides);
  const loaded = useAppSelector(selectPreferencesLoaded);

  const [showAddOverride, setShowAddOverride] = useState(false);
  const [selectedToken, setSelectedToken] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    if (!loaded) {
      dispatch(loadPreferencesThunk());
    }
  }, [dispatch, loaded]);

  // Handle default network change
  const handleDefaultNetworkChange = useCallback((networkId: NetworkId | null) => {
    dispatch(setDefaultNetwork(networkId));
    dispatch(savePreferencesThunk());
  }, [dispatch]);

  // Handle add token override
  const handleAddOverride = useCallback((symbol: string, networkId: NetworkId) => {
    dispatch(setTokenOverride({ symbol, networkId }));
    dispatch(savePreferencesThunk());
    setShowAddOverride(false);
    setSelectedToken(null);
  }, [dispatch]);

  // Handle remove token override
  const handleRemoveOverride = useCallback((symbol: string) => {
    Alert.alert(
      'Remove Override',
      `Remove network preference for ${symbol}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            dispatch(removeTokenOverride(symbol));
            dispatch(savePreferencesThunk());
          },
        },
      ]
    );
  }, [dispatch]);

  // Get tokens not yet overridden
  const availableTokens = POPULAR_TOKENS.filter(
    t => !tokenOverrides[t.symbol.toUpperCase()]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Network Preferences" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <FontAwesome name="info-circle" size={16} color={theme.colors.accent} />
          <Text style={styles.infoText}>
            Choose which network you prefer to receive tokens on. Senders will see your preference.
          </Text>
        </View>

        {/* Default Network Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Default Receiving Network</Text>
          <Text style={styles.sectionDesc}>
            Applies to all tokens unless overridden below
          </Text>

          <View style={styles.optionsContainer}>
            {NETWORK_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id || 'any'}
                style={[
                  styles.optionItem,
                  defaultNetwork === option.id && styles.optionItemSelected,
                ]}
                onPress={() => handleDefaultNetworkChange(option.id)}
              >
                <View style={styles.optionRadio}>
                  {defaultNetwork === option.id && <View style={styles.optionRadioInner} />}
                </View>
                <Text style={styles.optionText}>{option.name}</Text>
                {option.recommended && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>Lowest fees</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Token Overrides Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Token Exceptions</Text>
              <Text style={styles.sectionDesc}>
                Override default for specific tokens
              </Text>
            </View>
            {availableTokens.length > 0 && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddOverride(true)}
              >
                <FontAwesome name="plus" size={14} color={theme.colors.accent} />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {Object.keys(tokenOverrides).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No exceptions set</Text>
            </View>
          ) : (
            <View style={styles.overridesList}>
              {Object.entries(tokenOverrides).map(([symbol, networkId]) => (
                <View key={symbol} style={styles.overrideItem}>
                  <View style={styles.overrideInfo}>
                    <Text style={styles.overrideToken}>{symbol}</Text>
                    <FontAwesome name="arrow-right" size={12} color={theme.colors.textTertiary} style={{ marginHorizontal: 8 }} />
                    <Text style={styles.overrideNetwork}>
                      {SUPPORTED_NETWORKS[networkId]?.name || networkId}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveOverride(symbol)}
                  >
                    <FontAwesome name="times" size={16} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Add Override Modal/Sheet would go here */}
        {showAddOverride && (
          <View style={styles.addOverrideSection}>
            <Text style={styles.sectionTitle}>Select Token</Text>
            <View style={styles.tokenGrid}>
              {availableTokens.map((token) => (
                <TouchableOpacity
                  key={token.symbol}
                  style={[
                    styles.tokenChip,
                    selectedToken === token.symbol && styles.tokenChipSelected,
                  ]}
                  onPress={() => setSelectedToken(token.symbol)}
                >
                  <Text style={[
                    styles.tokenChipText,
                    selectedToken === token.symbol && styles.tokenChipTextSelected,
                  ]}>
                    {token.symbol}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedToken && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Select Network</Text>
                <View style={styles.networkGrid}>
                  {NETWORK_OPTIONS.filter(o => o.id !== null).map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={styles.networkChip}
                      onPress={() => handleAddOverride(selectedToken, option.id!)}
                    >
                      <Text style={styles.networkChipText}>{option.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowAddOverride(false);
                setSelectedToken(null);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1 },
  content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl },

  infoBanner: {
    flexDirection: 'row',
    backgroundColor: theme.colors.accent + '15',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  infoText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },

  section: { marginBottom: theme.spacing.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },

  optionsContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  optionItemSelected: {
    backgroundColor: theme.colors.accent + '10',
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  optionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accent,
  },
  optionText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  recommendedBadge: {
    backgroundColor: theme.colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recommendedText: {
    ...theme.typography.label,
    color: theme.colors.success,
    fontSize: 10,
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  addButtonText: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    fontWeight: '600',
  },

  emptyState: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },

  overridesList: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  overrideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  overrideInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overrideToken: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  overrideNetwork: {
    ...theme.typography.body,
    color: theme.colors.accent,
  },
  removeButton: {
    padding: theme.spacing.sm,
  },

  addOverrideSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  tokenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  tokenChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tokenChipSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  tokenChipText: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  tokenChipTextSelected: {
    color: '#FFFFFF',
  },
  networkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  networkChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  networkChipText: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
  },
  cancelButton: {
    alignItems: 'center',
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  cancelButtonText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
});
```

**Step 2: Commit**

```bash
git add apps/mobile/app/settings/networks.tsx
git commit -m "feat: redesign network settings with default network + token overrides"
```

---

## Task 7: Update Username Service to Return Preferences

**Files:**
- Modify: `apps/mobile/src/services/username-service.ts`

**Step 1: Update lookupUsername to include preferences**

Update the interface and function:

```typescript
interface UsernameData {
  username: string;
  address: string;
  preferences?: {
    defaultNetwork: string | null;
    tokenOverrides: Record<string, string>;
  };
}

/**
 * Lookup username -> address (with preferences)
 */
export async function lookupUsername(username: string): Promise<{ address: string; preferences?: NetworkPreferences } | null> {
  const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;

  try {
    const data = await apiClient.get<ApiResponse<UsernameData>>(
      `/api/username/${encodeURIComponent(normalizedUsername)}`
    );
    if (!data.data?.address) return null;

    return {
      address: data.data.address,
      preferences: data.data.preferences ? {
        defaultNetwork: data.data.preferences.defaultNetwork as NetworkId | null,
        tokenOverrides: data.data.preferences.tokenOverrides as Record<string, NetworkId>,
      } : undefined,
    };
  } catch (error) {
    if (ApiError.isApiError(error) && error.statusCode === 404) {
      return null;
    }
    log.warn('Username lookup failed', error);
    return null;
  }
}
```

Add import at top:

```typescript
import type { NetworkId } from '@/src/constants/networks';
import type { NetworkPreferences } from './preferences-service';
```

**Step 2: Update usages of lookupUsername**

In `apps/mobile/app/send/recipient.tsx`, update the lookup handling:

```typescript
const address = result?.address || result; // Handle both old and new format
```

**Step 3: Commit**

```bash
git add apps/mobile/src/services/username-service.ts apps/mobile/app/send/recipient.tsx
git commit -m "feat: update username service to return preferences with lookup"
```

---

## Task 8: Backend API (Specification)

**Files:**
- Create: `docs/plans/2025-01-25-backend-preferences-api.md`

**Note:** This task documents the backend API needed. Implementation depends on your backend setup.

```markdown
# Backend API for Preferences

## Endpoints

### GET /api/address/:address/preferences
Returns preferences for an address.

Response:
```json
{
  "success": true,
  "data": {
    "address": "0x...",
    "preferences": {
      "defaultNetwork": "base",
      "tokenOverrides": { "USDC": "polygon" }
    }
  }
}
```

### PUT /api/preferences
Save preferences (authenticated).

Request:
```json
{
  "defaultNetwork": "base",
  "tokenOverrides": { "USDC": "polygon" },
  "address": "0x...",
  "signature": "0x...",
  "timestamp": 1706198400000
}
```

### GET /api/username/:username
Updated to include preferences.

Response:
```json
{
  "success": true,
  "data": {
    "username": "alice",
    "address": "0x...",
    "preferences": {
      "defaultNetwork": "base",
      "tokenOverrides": {}
    }
  }
}
```

## Database

```sql
CREATE TABLE address_preferences (
  address VARCHAR(42) PRIMARY KEY,
  default_network VARCHAR(20),
  token_overrides JSONB DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT NOW()
);
```
```

**Step 1: Create the spec file**

**Step 2: Commit**

```bash
git add docs/plans/2025-01-25-backend-preferences-api.md
git commit -m "docs: add backend preferences API specification"
```

---

## Summary

| Task | Description | Complexity |
|------|-------------|------------|
| 1 | Create preferences-service.ts | Medium |
| 2 | Update network-preferences-slice | Medium |
| 3 | Add recipient preferences to send-slice | Medium |
| 4 | Fetch preferences on recipient input | Low |
| 5 | Use preferences in confirm screen | Low |
| 6 | Redesign network settings UI | High |
| 7 | Update username service | Low |
| 8 | Backend API spec | Documentation |

**Total estimated tasks: 8**
**Dependencies:** Task 1 must be done first. Tasks 2-7 can be parallelized after Task 1.
