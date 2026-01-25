# Network Preferences Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the full network preferences system from the approved design, enabling per-token network preferences, smart routing, and bridge integration.

**Architecture:** Per-token preferences stored in Redux with AsyncStorage persistence, smart routing logic to determine optimal transfer path, LI.FI integration for cross-network bridging, and UI components to display bridge costs and alternatives.

**Tech Stack:** Redux Toolkit, AsyncStorage, LI.FI SDK, React Native, TypeScript

---

## Current State Analysis

**Already Implemented:**
- `NetworkSelector.tsx` - Network selection component (global, not per-token)
- `NetworkBadge.tsx` - Network indicator badges
- `BalanceBreakdown.tsx` - Expandable balance view by network
- `network-service.ts` - Multi-network balance fetching
- `balance-slice.ts` - Multi-network balance state
- `settings/networks.tsx` - Basic network settings (not linked to navigation)

**NOT Implemented:**
- Per-token network preferences (design says per-token, current is global)
- `network-preferences-slice.ts` - Redux state for preferences
- Bridge service integration (LI.FI SDK)
- Smart routing for transfers
- Send flow UI showing bridge costs
- Link to network settings from profile/settings menu

---

## Task 1: Add Network Settings Link to Profile

**Files:**
- Create: `apps/mobile/app/profile/settings.tsx`
- Modify: `apps/mobile/app/profile/_layout.tsx`

**Step 1: Create profile settings screen with network settings link**

Create `apps/mobile/app/profile/settings.tsx`:
```typescript
/**
 * Profile Settings Screen
 * Links to various settings including network preferences
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';

interface SettingItem {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  route: string;
}

const SETTINGS_ITEMS: SettingItem[] = [
  {
    id: 'networks',
    icon: 'globe',
    title: 'Network Preferences',
    subtitle: 'Choose preferred networks for receiving tokens',
    route: '/settings/networks',
  },
  {
    id: 'username',
    icon: 'at',
    title: 'Username',
    subtitle: 'Manage your global username',
    route: '/profile/username',
  },
  {
    id: 'privacy',
    icon: 'shield',
    title: 'Privacy',
    subtitle: 'Control your privacy settings',
    route: '/profile/privacy',
  },
];

export default function ProfileSettingsScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Settings" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {SETTINGS_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.settingItem}
            onPress={() => router.push(item.route as any)}
          >
            <View style={styles.settingIcon}>
              <FontAwesome name={item.icon as any} size={20} color={theme.colors.accent} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>{item.title}</Text>
              <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
            </View>
            <FontAwesome name="chevron-right" size={14} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  settingSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
```

**Step 2: Update profile layout to include settings route**

Add to `apps/mobile/app/profile/_layout.tsx` a route for settings.

**Step 3: Run and verify settings link navigates to network preferences**

Run: `npx expo start` and navigate Profile → Settings → Network Preferences
Expected: Screen opens with network selection

**Step 4: Commit**

```bash
git add apps/mobile/app/profile/settings.tsx apps/mobile/app/profile/_layout.tsx
git commit -m "feat: add network settings link to profile"
```

---

## Task 2: Create Network Preferences Redux Slice

**Files:**
- Create: `apps/mobile/src/store/slices/network-preferences-slice.ts`
- Modify: `apps/mobile/src/store/index.ts`

**Step 1: Write the failing test**

Create test for network preferences slice (optional for slice files).

**Step 2: Create network-preferences-slice.ts**

```typescript
/**
 * Network Preferences Redux Slice
 * Manages per-token network preferences for receiving tokens
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkId } from '@/src/constants/networks';

const STORAGE_KEY = '@ey_network_preferences';

export interface TokenNetworkPreference {
  preferredNetwork: NetworkId | null; // null = no preference (receive on sender's network)
  updatedAt: string;
}

export interface NetworkPreferencesState {
  // Per-token preferences
  tokenPreferences: Record<string, TokenNetworkPreference>;
  // Default behavior when no preference set
  defaultBehavior: 'sender_network' | 'cheapest_gas';
  // Loading state
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: NetworkPreferencesState = {
  tokenPreferences: {},
  defaultBehavior: 'sender_network',
  status: 'idle',
  error: null,
};

/**
 * Load preferences from AsyncStorage
 */
export const loadNetworkPreferencesThunk = createAsyncThunk(
  'networkPreferences/load',
  async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Pick<NetworkPreferencesState, 'tokenPreferences' | 'defaultBehavior'>;
    }
    return null;
  }
);

/**
 * Save preferences to AsyncStorage
 */
export const saveNetworkPreferencesThunk = createAsyncThunk(
  'networkPreferences/save',
  async (_, { getState }) => {
    const state = (getState() as { networkPreferences: NetworkPreferencesState }).networkPreferences;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      tokenPreferences: state.tokenPreferences,
      defaultBehavior: state.defaultBehavior,
    }));
  }
);

const networkPreferencesSlice = createSlice({
  name: 'networkPreferences',
  initialState,
  reducers: {
    setTokenPreference: (
      state,
      action: PayloadAction<{ symbol: string; networkId: NetworkId | null }>
    ) => {
      const { symbol, networkId } = action.payload;
      state.tokenPreferences[symbol.toUpperCase()] = {
        preferredNetwork: networkId,
        updatedAt: new Date().toISOString(),
      };
    },
    clearTokenPreference: (state, action: PayloadAction<string>) => {
      const symbol = action.payload.toUpperCase();
      delete state.tokenPreferences[symbol];
    },
    setDefaultBehavior: (
      state,
      action: PayloadAction<'sender_network' | 'cheapest_gas'>
    ) => {
      state.defaultBehavior = action.payload;
    },
    clearAllPreferences: (state) => {
      state.tokenPreferences = {};
      state.defaultBehavior = 'sender_network';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadNetworkPreferencesThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadNetworkPreferencesThunk.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (action.payload) {
          state.tokenPreferences = action.payload.tokenPreferences;
          state.defaultBehavior = action.payload.defaultBehavior;
        }
      })
      .addCase(loadNetworkPreferencesThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to load preferences';
      });
  },
});

export const {
  setTokenPreference,
  clearTokenPreference,
  setDefaultBehavior,
  clearAllPreferences,
} = networkPreferencesSlice.actions;

// Selectors
export const selectTokenPreference = (
  state: { networkPreferences: NetworkPreferencesState },
  symbol: string
): TokenNetworkPreference | undefined =>
  state.networkPreferences.tokenPreferences[symbol.toUpperCase()];

export const selectPreferredNetwork = (
  state: { networkPreferences: NetworkPreferencesState },
  symbol: string
): NetworkId | null =>
  state.networkPreferences.tokenPreferences[symbol.toUpperCase()]?.preferredNetwork || null;

export const selectDefaultBehavior = (
  state: { networkPreferences: NetworkPreferencesState }
) => state.networkPreferences.defaultBehavior;

export const selectAllTokenPreferences = (
  state: { networkPreferences: NetworkPreferencesState }
) => state.networkPreferences.tokenPreferences;

export default networkPreferencesSlice.reducer;
```

**Step 3: Add slice to store**

Update `apps/mobile/src/store/index.ts` to include the new slice.

**Step 4: Run app to verify no errors**

Run: `npx expo start`
Expected: App starts without errors

**Step 5: Commit**

```bash
git add apps/mobile/src/store/slices/network-preferences-slice.ts apps/mobile/src/store/index.ts
git commit -m "feat: add network-preferences-slice for per-token preferences"
```

---

## Task 3: Update Network Settings Screen with Per-Token Preferences

**Files:**
- Modify: `apps/mobile/app/settings/networks.tsx`

**Step 1: Read current implementation**

Read `apps/mobile/app/settings/networks.tsx` to understand current structure.

**Step 2: Update to show per-token preferences**

Replace the current global network selector with per-token preference UI matching the design:
- List tokens user holds (from balance-slice)
- For each token, show dropdown: "Any network" or specific network
- "Any network" = receive on sender's network (no conversion fees)
- Load/save from network-preferences-slice

**Step 3: Test the updated screen**

Run: `npx expo start`, navigate to Settings → Network Preferences
Expected: See list of tokens with network dropdowns

**Step 4: Commit**

```bash
git add apps/mobile/app/settings/networks.tsx
git commit -m "feat: update network settings with per-token preferences"
```

---

## Task 4: Create Token Network Preference Picker Component

**Files:**
- Create: `apps/mobile/src/components/TokenNetworkPicker.tsx`

**Step 1: Create the component**

```typescript
/**
 * TokenNetworkPicker Component
 * Allows user to select preferred network for a specific token
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { theme } from '@/src/constants/theme';
import { NetworkId, SUPPORTED_NETWORKS, getNetworkConfig } from '@/src/constants/networks';
import { NetworkDot } from './NetworkBadge';
import { TokenIcon } from './TokenIcon';

interface Props {
  symbol: string;
  name: string;
  iconUrl?: string;
  selectedNetwork: NetworkId | null; // null = "Any network"
  availableNetworks: NetworkId[]; // Networks where user has this token
  onSelect: (networkId: NetworkId | null) => void;
}

export function TokenNetworkPicker({
  symbol,
  name,
  iconUrl,
  selectedNetwork,
  availableNetworks,
  onSelect,
}: Props) {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedLabel = selectedNetwork
    ? getNetworkConfig(selectedNetwork).name
    : 'Any network';

  const handleSelect = (networkId: NetworkId | null) => {
    onSelect(networkId);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => setModalVisible(true)}
      >
        <TokenIcon symbol={symbol} iconUrl={iconUrl} size={40} />

        <View style={styles.tokenInfo}>
          <Text style={styles.tokenSymbol}>{symbol}</Text>
          <Text style={styles.tokenName}>{name}</Text>
        </View>

        <View style={styles.selectedNetwork}>
          {selectedNetwork && (
            <NetworkDot networkId={selectedNetwork} size={8} />
          )}
          <Text style={styles.selectedLabel}>{selectedLabel}</Text>
          <FontAwesome name="chevron-down" size={12} color={theme.colors.textTertiary} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Receive {symbol} on</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <FontAwesome name="times" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.optionsList}>
              {/* Any network option */}
              <TouchableOpacity
                style={[
                  styles.optionItem,
                  selectedNetwork === null && styles.optionItemSelected,
                ]}
                onPress={() => handleSelect(null)}
              >
                <View style={styles.optionIcon}>
                  <FontAwesome name="globe" size={20} color={theme.colors.textSecondary} />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Any network</Text>
                  <Text style={styles.optionSubtitle}>
                    Receive on sender's network (no conversion fees)
                  </Text>
                </View>
                {selectedNetwork === null && (
                  <FontAwesome name="check" size={16} color={theme.colors.accent} />
                )}
              </TouchableOpacity>

              {/* Network options */}
              {availableNetworks.map((networkId) => {
                const network = getNetworkConfig(networkId);
                return (
                  <TouchableOpacity
                    key={networkId}
                    style={[
                      styles.optionItem,
                      selectedNetwork === networkId && styles.optionItemSelected,
                    ]}
                    onPress={() => handleSelect(networkId)}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: network.color + '20' }]}>
                      <NetworkDot networkId={networkId} size={12} />
                    </View>
                    <View style={styles.optionInfo}>
                      <Text style={styles.optionTitle}>{network.name}</Text>
                    </View>
                    {selectedNetwork === networkId && (
                      <FontAwesome name="check" size={16} color={theme.colors.accent} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenSymbol: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  tokenName: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  selectedNetwork: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  selectedLabel: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
  },
  optionsList: {
    padding: theme.spacing.md,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  optionItemSelected: {
    backgroundColor: theme.colors.accent + '10',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  optionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
```

**Step 2: Test component**

Import and use in network settings screen.

**Step 3: Commit**

```bash
git add apps/mobile/src/components/TokenNetworkPicker.tsx
git commit -m "feat: add TokenNetworkPicker component for per-token preferences"
```

---

## Task 5: Create Bridge Service with LI.FI Integration

**Files:**
- Create: `apps/mobile/src/services/bridge-service.ts`

**Step 1: Install LI.FI SDK**

Run: `cd apps/mobile && pnpm add @lifi/sdk`

**Step 2: Create bridge-service.ts**

```typescript
/**
 * Bridge Service
 * Handles cross-network bridging using LI.FI SDK
 */

import { createLogger } from '@/src/utils/logger';
import { NetworkId, getNetworkConfig } from '@/src/constants/networks';

const log = createLogger('BridgeService');

// LI.FI API base URL
const LIFI_API_URL = 'https://li.quest/v1';

export interface BridgeQuote {
  id: string;
  fromNetwork: NetworkId;
  toNetwork: NetworkId;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  toAmountMin: string; // Minimum amount after slippage
  estimatedGas: string;
  estimatedGasUsd: number;
  bridgeFee: string;
  bridgeFeeUsd: number;
  totalFeeUsd: number;
  estimatedTime: number; // seconds
  priceImpact: string; // percentage
  route: BridgeRoute;
}

export interface BridgeRoute {
  steps: BridgeStep[];
  totalTime: number;
}

export interface BridgeStep {
  type: 'swap' | 'bridge' | 'cross';
  tool: string; // e.g., "stargate", "hop", "across"
  fromNetwork: NetworkId;
  toNetwork: NetworkId;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  estimatedTime: number;
}

export interface BridgeExecutionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Map our network IDs to LI.FI chain IDs
 */
const NETWORK_TO_CHAIN_ID: Record<NetworkId, number> = {
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
};

/**
 * Get bridge quote from LI.FI
 */
export async function getBridgeQuote(
  fromNetwork: NetworkId,
  toNetwork: NetworkId,
  fromToken: string, // Token symbol or address
  toToken: string,
  amount: string, // In token units (e.g., "100" for 100 USDC)
  fromAddress: string,
  toAddress: string
): Promise<BridgeQuote | null> {
  try {
    const fromChainId = NETWORK_TO_CHAIN_ID[fromNetwork];
    const toChainId = NETWORK_TO_CHAIN_ID[toNetwork];

    if (!fromChainId || !toChainId) {
      log.warn('Unsupported network for bridging', { fromNetwork, toNetwork });
      return null;
    }

    const params = new URLSearchParams({
      fromChain: fromChainId.toString(),
      toChain: toChainId.toString(),
      fromToken,
      toToken,
      fromAmount: amount,
      fromAddress,
      toAddress,
      slippage: '0.005', // 0.5% default slippage
    });

    const response = await fetch(`${LIFI_API_URL}/quote?${params}`);

    if (!response.ok) {
      const error = await response.json();
      log.warn('LI.FI quote failed', error);
      return null;
    }

    const data = await response.json();

    return {
      id: data.id,
      fromNetwork,
      toNetwork,
      fromToken,
      toToken,
      fromAmount: amount,
      toAmount: data.estimate.toAmount,
      toAmountMin: data.estimate.toAmountMin,
      estimatedGas: data.estimate.gasCosts?.[0]?.amount || '0',
      estimatedGasUsd: parseFloat(data.estimate.gasCosts?.[0]?.amountUSD || '0'),
      bridgeFee: data.estimate.feeCosts?.[0]?.amount || '0',
      bridgeFeeUsd: parseFloat(data.estimate.feeCosts?.[0]?.amountUSD || '0'),
      totalFeeUsd:
        parseFloat(data.estimate.gasCosts?.[0]?.amountUSD || '0') +
        parseFloat(data.estimate.feeCosts?.[0]?.amountUSD || '0'),
      estimatedTime: data.estimate.executionDuration || 300,
      priceImpact: data.estimate.priceImpact || '0',
      route: {
        steps: data.includedSteps?.map((step: any) => ({
          type: step.type,
          tool: step.tool,
          fromNetwork: Object.keys(NETWORK_TO_CHAIN_ID).find(
            (k) => NETWORK_TO_CHAIN_ID[k as NetworkId] === step.action.fromChainId
          ) as NetworkId,
          toNetwork: Object.keys(NETWORK_TO_CHAIN_ID).find(
            (k) => NETWORK_TO_CHAIN_ID[k as NetworkId] === step.action.toChainId
          ) as NetworkId,
          fromToken: step.action.fromToken.symbol,
          toToken: step.action.toToken.symbol,
          fromAmount: step.estimate.fromAmount,
          toAmount: step.estimate.toAmount,
          estimatedTime: step.estimate.executionDuration || 60,
        })) || [],
        totalTime: data.estimate.executionDuration || 300,
      },
    };
  } catch (error) {
    log.error('Failed to get bridge quote', error);
    return null;
  }
}

/**
 * Check if bridging is needed and get quote
 */
export async function checkBridgeNeeded(
  senderNetwork: NetworkId,
  recipientPreferredNetwork: NetworkId | null,
  token: string,
  amount: string,
  fromAddress: string,
  toAddress: string
): Promise<{ needed: boolean; quote?: BridgeQuote }> {
  // No bridging needed if:
  // 1. Recipient has no preference (receive on sender's network)
  // 2. Sender's network matches recipient's preference
  if (!recipientPreferredNetwork || senderNetwork === recipientPreferredNetwork) {
    return { needed: false };
  }

  // Get bridge quote
  const quote = await getBridgeQuote(
    senderNetwork,
    recipientPreferredNetwork,
    token,
    token, // Same token
    amount,
    fromAddress,
    toAddress
  );

  return {
    needed: true,
    quote: quote || undefined,
  };
}

/**
 * Check if bridge fee is expensive relative to amount
 * Returns warning level: 'none' | 'warning' | 'expensive'
 */
export function checkBridgeCostLevel(
  amountUsd: number,
  bridgeFeeUsd: number
): 'none' | 'warning' | 'expensive' {
  const feePercentage = (bridgeFeeUsd / amountUsd) * 100;

  if (feePercentage > 10) {
    return 'expensive'; // More than 10% of amount
  } else if (feePercentage > 5) {
    return 'warning'; // 5-10% of amount
  }
  return 'none';
}

/**
 * Format estimated time for display
 */
export function formatBridgeTime(seconds: number): string {
  if (seconds < 60) {
    return `~${seconds}s`;
  } else if (seconds < 3600) {
    return `~${Math.round(seconds / 60)} min`;
  }
  return `~${Math.round(seconds / 3600)} hr`;
}
```

**Step 3: Test bridge service (manual)**

Run: Create a test script or use in dev mode to verify LI.FI API works.

**Step 4: Commit**

```bash
git add apps/mobile/src/services/bridge-service.ts package.json pnpm-lock.yaml
git commit -m "feat: add bridge-service with LI.FI integration"
```

---

## Task 6: Create Smart Routing Service

**Files:**
- Create: `apps/mobile/src/services/routing-service.ts`

**Step 1: Create routing-service.ts**

```typescript
/**
 * Routing Service
 * Determines optimal transfer path based on balances and preferences
 */

import { createLogger } from '@/src/utils/logger';
import { NetworkId } from '@/src/constants/networks';
import { AggregatedTokenBalance } from './network-service';
import { getBridgeQuote, BridgeQuote, checkBridgeCostLevel } from './bridge-service';

const log = createLogger('RoutingService');

export interface TransferRoute {
  type: 'direct' | 'bridge' | 'consolidation';
  fromNetwork: NetworkId;
  toNetwork: NetworkId;
  amount: string;
  token: string;
  // For bridge transfers
  bridgeQuote?: BridgeQuote;
  bridgeCostLevel?: 'none' | 'warning' | 'expensive';
  // For consolidation (multiple source networks)
  sources?: {
    network: NetworkId;
    amount: string;
    bridgeQuote?: BridgeQuote;
  }[];
  // Alternative route (e.g., send without bridging)
  alternative?: {
    description: string;
    network: NetworkId;
  };
}

export interface RoutingResult {
  canSend: boolean;
  route?: TransferRoute;
  error?: string;
  // UI hints
  showBridgeCost: boolean;
  showConsolidationOption: boolean;
  showAlternative: boolean;
}

/**
 * Calculate optimal transfer route
 */
export async function calculateTransferRoute(
  aggregatedBalances: AggregatedTokenBalance[],
  token: string,
  amount: string,
  recipientPreferredNetwork: NetworkId | null,
  fromAddress: string,
  toAddress: string
): Promise<RoutingResult> {
  const tokenBalance = aggregatedBalances.find(
    (t) => t.symbol.toUpperCase() === token.toUpperCase()
  );

  if (!tokenBalance) {
    return { canSend: false, error: 'Token not found', showBridgeCost: false, showConsolidationOption: false, showAlternative: false };
  }

  const requiredAmount = parseFloat(amount);
  const totalBalance = parseFloat(tokenBalance.totalBalance);

  // Check if user has enough total balance
  if (totalBalance < requiredAmount) {
    return { canSend: false, error: 'Insufficient balance', showBridgeCost: false, showConsolidationOption: false, showAlternative: false };
  }

  // Sort networks by balance (highest first)
  const sortedNetworks = [...tokenBalance.networks].sort(
    (a, b) => parseFloat(b.balance) - parseFloat(a.balance)
  );

  // Case 1: No recipient preference - choose best network
  if (!recipientPreferredNetwork) {
    // Find network with sufficient balance
    const bestNetwork = sortedNetworks.find(
      (n) => parseFloat(n.balance) >= requiredAmount
    );

    if (bestNetwork) {
      // Direct transfer on sender's chosen network
      return {
        canSend: true,
        route: {
          type: 'direct',
          fromNetwork: bestNetwork.networkId as NetworkId,
          toNetwork: bestNetwork.networkId as NetworkId,
          amount,
          token,
        },
        showBridgeCost: false,
        showConsolidationOption: false,
        showAlternative: false,
      };
    }

    // Need consolidation
    return {
      canSend: true,
      route: {
        type: 'consolidation',
        fromNetwork: sortedNetworks[0].networkId as NetworkId,
        toNetwork: sortedNetworks[0].networkId as NetworkId,
        amount,
        token,
        sources: sortedNetworks.map((n) => ({
          network: n.networkId as NetworkId,
          amount: n.balance,
        })),
      },
      showBridgeCost: true,
      showConsolidationOption: true,
      showAlternative: false,
    };
  }

  // Case 2: Recipient has preference
  const preferredNetworkBalance = sortedNetworks.find(
    (n) => n.networkId === recipientPreferredNetwork
  );

  // Check if we have enough on preferred network
  if (
    preferredNetworkBalance &&
    parseFloat(preferredNetworkBalance.balance) >= requiredAmount
  ) {
    // Perfect match - direct transfer
    return {
      canSend: true,
      route: {
        type: 'direct',
        fromNetwork: recipientPreferredNetwork,
        toNetwork: recipientPreferredNetwork,
        amount,
        token,
      },
      showBridgeCost: false,
      showConsolidationOption: false,
      showAlternative: false,
    };
  }

  // Need to bridge from another network
  const sourceNetwork = sortedNetworks.find(
    (n) => parseFloat(n.balance) >= requiredAmount && n.networkId !== recipientPreferredNetwork
  );

  if (sourceNetwork) {
    // Get bridge quote
    const bridgeQuote = await getBridgeQuote(
      sourceNetwork.networkId as NetworkId,
      recipientPreferredNetwork,
      token,
      token,
      amount,
      fromAddress,
      toAddress
    );

    const costLevel = bridgeQuote
      ? checkBridgeCostLevel(
          requiredAmount * (bridgeQuote.totalFeeUsd / parseFloat(bridgeQuote.fromAmount)),
          bridgeQuote.totalFeeUsd
        )
      : 'none';

    return {
      canSend: true,
      route: {
        type: 'bridge',
        fromNetwork: sourceNetwork.networkId as NetworkId,
        toNetwork: recipientPreferredNetwork,
        amount,
        token,
        bridgeQuote: bridgeQuote || undefined,
        bridgeCostLevel: costLevel,
        alternative: {
          description: `Send to ${sourceNetwork.networkId} without conversion fees`,
          network: sourceNetwork.networkId as NetworkId,
        },
      },
      showBridgeCost: true,
      showConsolidationOption: false,
      showAlternative: costLevel !== 'none',
    };
  }

  // Need consolidation + bridge
  return {
    canSend: true,
    route: {
      type: 'consolidation',
      fromNetwork: sortedNetworks[0].networkId as NetworkId,
      toNetwork: recipientPreferredNetwork,
      amount,
      token,
      sources: sortedNetworks.map((n) => ({
        network: n.networkId as NetworkId,
        amount: n.balance,
      })),
    },
    showBridgeCost: true,
    showConsolidationOption: true,
    showAlternative: false,
  };
}
```

**Step 2: Test routing service**

Run: Manual testing with different balance scenarios.

**Step 3: Commit**

```bash
git add apps/mobile/src/services/routing-service.ts
git commit -m "feat: add routing-service for smart transfer routing"
```

---

## Task 7: Create Bridge Cost Banner Component

**Files:**
- Create: `apps/mobile/src/components/BridgeCostBanner.tsx`

**Step 1: Create the component**

```typescript
/**
 * BridgeCostBanner Component
 * Shows bridge/conversion costs in send flow
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { theme } from '@/src/constants/theme';
import { BridgeQuote, formatBridgeTime } from '@/src/services/bridge-service';
import { NetworkBadge } from './NetworkBadge';
import { NetworkId } from '@/src/constants/networks';

interface Props {
  recipientName?: string;
  recipientNetwork: NetworkId;
  senderNetwork: NetworkId;
  bridgeQuote: BridgeQuote;
  costLevel: 'none' | 'warning' | 'expensive';
  onSendWithoutBridge?: () => void;
  alternativeNetwork?: NetworkId;
}

export function BridgeCostBanner({
  recipientName,
  recipientNetwork,
  senderNetwork,
  bridgeQuote,
  costLevel,
  onSendWithoutBridge,
  alternativeNetwork,
}: Props) {
  const showWarning = costLevel === 'warning' || costLevel === 'expensive';

  return (
    <View style={[styles.container, showWarning && styles.containerWarning]}>
      {/* Recipient preference info */}
      <View style={styles.row}>
        <FontAwesome name="star" size={14} color={theme.colors.accent} />
        <Text style={styles.text}>
          {recipientName || 'Recipient'} receives on{' '}
          <Text style={styles.networkName}>{recipientNetwork}</Text>
        </Text>
      </View>

      {/* Conversion info */}
      <View style={styles.conversionBox}>
        <View style={styles.conversionRow}>
          <FontAwesome name="exchange" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.conversionText}>
            Your {bridgeQuote.fromToken} is on {senderNetwork}
          </Text>
        </View>
        <View style={styles.conversionDetails}>
          <Text style={styles.conversionLabel}>
            🔄 Conversion: ~${bridgeQuote.totalFeeUsd.toFixed(2)}, {formatBridgeTime(bridgeQuote.estimatedTime)}
          </Text>
        </View>
      </View>

      {/* Fee breakdown */}
      <View style={styles.feeSection}>
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Network fee</Text>
          <Text style={styles.feeValue}>~${bridgeQuote.estimatedGasUsd.toFixed(2)}</Text>
        </View>
        <View style={styles.feeRow}>
          <Text style={styles.feeLabel}>Conversion fee</Text>
          <Text style={styles.feeValue}>~${bridgeQuote.bridgeFeeUsd.toFixed(2)}</Text>
        </View>
        <View style={[styles.feeRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total fees</Text>
          <Text style={[styles.totalValue, showWarning && styles.totalValueWarning]}>
            ~${bridgeQuote.totalFeeUsd.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Alternative option */}
      {alternativeNetwork && onSendWithoutBridge && (
        <TouchableOpacity style={styles.alternativeButton} onPress={onSendWithoutBridge}>
          <FontAwesome name="lightbulb-o" size={14} color={theme.colors.accent} />
          <Text style={styles.alternativeText}>
            Or send to {alternativeNetwork} without conversion fees
          </Text>
        </TouchableOpacity>
      )}

      {/* Warning for expensive bridges */}
      {costLevel === 'expensive' && (
        <View style={styles.warningBanner}>
          <FontAwesome name="exclamation-triangle" size={14} color="#F59E0B" />
          <Text style={styles.warningText}>
            Conversion fee is high relative to amount. Consider the alternative.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  containerWarning: {
    borderWidth: 1,
    borderColor: '#F59E0B40',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  text: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  networkName: {
    fontWeight: '600',
    color: theme.colors.accent,
  },
  conversionBox: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  conversionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  conversionText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  conversionDetails: {
    marginLeft: theme.spacing.md + 14, // Align with text
  },
  conversionLabel: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
  },
  feeSection: {
    gap: theme.spacing.sm,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feeLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  feeValue: {
    ...theme.typography.caption,
    color: theme.colors.textPrimary,
  },
  totalRow: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  totalLabel: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  totalValue: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  totalValueWarning: {
    color: '#F59E0B',
  },
  alternativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.accent + '10',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  alternativeText: {
    ...theme.typography.caption,
    color: theme.colors.accent,
    flex: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: '#F59E0B15',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  warningText: {
    ...theme.typography.caption,
    color: '#F59E0B',
    flex: 1,
  },
});
```

**Step 2: Commit**

```bash
git add apps/mobile/src/components/BridgeCostBanner.tsx
git commit -m "feat: add BridgeCostBanner component for send flow"
```

---

## Task 8: Update Send Confirm Screen with Bridge Costs

**Files:**
- Modify: `apps/mobile/app/send/confirm.tsx`

**Step 1: Read current confirm screen**

Already read above.

**Step 2: Add bridge cost display**

Update confirm.tsx to:
1. Calculate transfer route using routing-service
2. Show BridgeCostBanner if bridge is needed
3. Show alternative option if bridge is expensive
4. Update fee display to include bridge fees

**Step 3: Test the updated flow**

Run: `npx expo start`, try sending to recipient with preference
Expected: See bridge cost banner with fees and alternative

**Step 4: Commit**

```bash
git add apps/mobile/app/send/confirm.tsx
git commit -m "feat: add bridge cost display to send confirm screen"
```

---

## Task 9: Add Consolidation Option UI

**Files:**
- Create: `apps/mobile/src/components/ConsolidationBanner.tsx`
- Modify: `apps/mobile/app/send/confirm.tsx`

**Step 1: Create ConsolidationBanner component**

```typescript
/**
 * ConsolidationBanner Component
 * Shows when amount requires collecting from multiple networks
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { theme } from '@/src/constants/theme';
import { NetworkId } from '@/src/constants/networks';
import { NetworkDot } from './NetworkBadge';

interface Source {
  network: NetworkId;
  amount: string;
}

interface Props {
  sources: Source[];
  totalAmount: string;
  token: string;
  estimatedFee: number;
  onCollectFromBoth: () => void;
  onSendMax: (maxAmount: string, network: NetworkId) => void;
}

export function ConsolidationBanner({
  sources,
  totalAmount,
  token,
  estimatedFee,
  onCollectFromBoth,
  onSendMax,
}: Props) {
  // Find the network with highest balance
  const maxSource = sources.reduce((max, s) =>
    parseFloat(s.amount) > parseFloat(max.amount) ? s : max
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <FontAwesome name="exclamation-circle" size={16} color="#F59E0B" />
        <Text style={styles.headerText}>
          Your {token} is on different networks
        </Text>
      </View>

      {/* Balance breakdown */}
      <View style={styles.balances}>
        {sources.map((source) => (
          <View key={source.network} style={styles.balanceRow}>
            <NetworkDot networkId={source.network} size={8} />
            <Text style={styles.balanceText}>
              {parseFloat(source.amount).toFixed(4)} on {source.network}
            </Text>
          </View>
        ))}
      </View>

      {/* Options */}
      <View style={styles.options}>
        <TouchableOpacity style={styles.optionButton} onPress={onCollectFromBoth}>
          <View style={styles.optionRadio}>
            <View style={styles.optionRadioInner} />
          </View>
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>Collect from both</Text>
            <Text style={styles.optionSubtitle}>~${estimatedFee.toFixed(2)} fee</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => onSendMax(maxSource.amount, maxSource.network)}
        >
          <View style={styles.optionRadio} />
          <View style={styles.optionInfo}>
            <Text style={styles.optionTitle}>
              Send {parseFloat(maxSource.amount).toFixed(4)} (max from one network)
            </Text>
            <Text style={styles.optionSubtitle}>No conversion fee</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F59E0B15',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#F59E0B40',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  headerText: {
    ...theme.typography.body,
    color: '#F59E0B',
    fontWeight: '600',
  },
  balances: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  balanceText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  options: {
    gap: theme.spacing.sm,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accent,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  optionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
```

**Step 2: Integrate with confirm screen**

Update confirm.tsx to show ConsolidationBanner when routing requires consolidation.

**Step 3: Commit**

```bash
git add apps/mobile/src/components/ConsolidationBanner.tsx apps/mobile/app/send/confirm.tsx
git commit -m "feat: add consolidation option UI for multi-network sends"
```

---

## Task 10: Export New Components from Index

**Files:**
- Modify: `apps/mobile/src/components/index.ts` (if exists)

**Step 1: Export new components**

Add exports for:
- `TokenNetworkPicker`
- `BridgeCostBanner`
- `ConsolidationBanner`

**Step 2: Commit**

```bash
git add apps/mobile/src/components/index.ts
git commit -m "feat: export new network preference components"
```

---

## Task 11: Integration Testing & Cleanup

**Files:**
- Various files for fixes

**Step 1: Run full app and test all flows**

Test scenarios:
1. Settings → Network Preferences → Set USDC preference to Arbitrum
2. Send USDC when sender has it on Polygon → Should show bridge cost
3. Send USDC when balance is split → Should show consolidation option
4. Send to recipient without preference → Should pick best network

**Step 2: Fix any issues found**

Document and fix bugs.

**Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete network preferences implementation (E-XX)"
```

---

## Summary

| Task | Description | Status |
|------|-------------|--------|
| 1 | Add network settings link to profile | Pending |
| 2 | Create network-preferences-slice | Pending |
| 3 | Update network settings with per-token UI | Pending |
| 4 | Create TokenNetworkPicker component | Pending |
| 5 | Create bridge-service with LI.FI | Pending |
| 6 | Create routing-service | Pending |
| 7 | Create BridgeCostBanner component | Pending |
| 8 | Update send confirm with bridge costs | Pending |
| 9 | Add consolidation option UI | Pending |
| 10 | Export new components | Pending |
| 11 | Integration testing & cleanup | Pending |

---

**Implementation approach:**
- Each task is atomic and testable
- Tasks build on each other (slice before UI, services before components)
- UI matches the approved design document
- Bridge integration uses LI.FI API (no SDK install needed initially, can use REST API)
