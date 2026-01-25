/**
 * Network Settings Screen
 * Allows user to configure per-token network preferences for receiving funds
 */

import { StyleSheet, View, Text, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, memo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '@/src/utils/logger';
import { TokenNetworkPicker } from '@/src/components/TokenNetworkPicker';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import {
  selectPreferredNetwork,
  setTokenPreference,
  saveNetworkPreferencesThunk,
  loadNetworkPreferencesThunk,
  selectNetworkPreferencesLoaded,
} from '@/src/store/slices/network-preferences-slice';
import { selectAggregatedBalances } from '@/src/store/slices/balance-slice';
import type { AggregatedTokenBalance } from '@/src/services/network-service';
import type { NetworkId } from '@/src/constants/networks';

const TESTNET_TOGGLE_KEY = '@ey_show_testnets';
const logger = createLogger('NetworkSettings');

/**
 * Wrapper component for each token's network picker
 * Needs to be separate component to properly use hooks
 */
interface TokenPickerItemProps {
  token: AggregatedTokenBalance;
  onPreferenceChange: (symbol: string, networkId: NetworkId | null) => void;
}

const TokenPickerItem = memo(({ token, onPreferenceChange }: TokenPickerItemProps) => {
  // Get current preference for this token
  const selectedNetwork = useAppSelector((state) =>
    selectPreferredNetwork(state, token.symbol)
  );

  // Get available networks for this token
  const availableNetworks = token.networks.map(
    (n) => n.networkId as NetworkId
  );

  const handleSelect = useCallback(
    (networkId: NetworkId | null) => {
      onPreferenceChange(token.symbol, networkId);
    },
    [onPreferenceChange, token.symbol]
  );

  return (
    <View style={styles.tokenPickerWrapper}>
      <TokenNetworkPicker
        symbol={token.symbol}
        name={token.name}
        iconUrl={token.iconUrl}
        selectedNetwork={selectedNetwork}
        availableNetworks={availableNetworks}
        onSelect={handleSelect}
      />
    </View>
  );
});

TokenPickerItem.displayName = 'TokenPickerItem';

export default function NetworkSettingsScreen() {
  const dispatch = useAppDispatch();
  const [showTestnets, setShowTestnets] = useState(false);

  // Get aggregated balances (tokens user holds)
  const aggregatedBalances = useAppSelector(selectAggregatedBalances);

  // Check if network preferences are loaded
  const preferencesLoaded = useAppSelector(selectNetworkPreferencesLoaded);

  // Load network preferences on mount
  useEffect(() => {
    if (!preferencesLoaded) {
      dispatch(loadNetworkPreferencesThunk());
    }
  }, [dispatch, preferencesLoaded]);

  // Load testnet toggle setting
  useEffect(() => {
    AsyncStorage.getItem(TESTNET_TOGGLE_KEY).then((stored) => {
      if (stored) {
        setShowTestnets(stored === 'true');
      }
    });
  }, []);

  // Handle token network preference change
  const handleTokenPreferenceChange = useCallback(
    async (symbol: string, networkId: NetworkId | null) => {
      try {
        dispatch(setTokenPreference({ symbol, networkId }));
        await dispatch(saveNetworkPreferencesThunk()).unwrap();
        logger.info('Network preference saved', { symbol, networkId });
      } catch (error) {
        logger.error('Failed to save network preference', { symbol, error });
      }
    },
    [dispatch]
  );

  // Handle testnet toggle
  const handleTestnetToggle = useCallback(async (value: boolean) => {
    setShowTestnets(value);
    try {
      await AsyncStorage.setItem(TESTNET_TOGGLE_KEY, value.toString());
    } catch (error) {
      logger.error('Failed to save testnet toggle', { error });
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Network Preferences" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, theme.typography.heading]}>
            Receiving Preferences
          </Text>
          <Text
            style={[
              styles.sectionDesc,
              theme.typography.caption,
              { color: theme.colors.textSecondary },
            ]}
          >
            Choose which network you prefer to receive each token on. Select "Any network" to receive on the sender's network (no conversion fees).
          </Text>

          {aggregatedBalances.length === 0 ? (
            <View style={styles.emptyState}>
              <Text
                style={[
                  styles.emptyStateText,
                  theme.typography.body,
                  { color: theme.colors.textSecondary },
                ]}
              >
                No tokens found. Add funds to your wallet to configure network preferences.
              </Text>
            </View>
          ) : (
            <View style={styles.tokenList}>
              {aggregatedBalances.map((token) => (
                <TokenPickerItem
                  key={token.symbol}
                  token={token}
                  onPreferenceChange={handleTokenPreferenceChange}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={[styles.toggleLabel, theme.typography.body]}>
              Show Testnets
            </Text>
            <Text
              style={[
                styles.toggleDesc,
                theme.typography.caption,
                { color: theme.colors.textSecondary },
              ]}
            >
              Display test networks for development
            </Text>
          </View>
          <Switch
            value={showTestnets}
            onValueChange={handleTestnetToggle}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.accent + '50',
            }}
            thumbColor={
              showTestnets ? theme.colors.accent : theme.colors.textTertiary
            }
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1 },
  container: { padding: theme.spacing.xl },
  section: { marginBottom: theme.spacing.xl },
  sectionTitle: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  sectionDesc: { marginBottom: theme.spacing.lg },
  emptyState: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    textAlign: 'center',
  },
  tokenList: {
    gap: theme.spacing.md,
  },
  tokenPickerWrapper: {
    // Wrapper for spacing between pickers
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  toggleInfo: { flex: 1 },
  toggleLabel: { color: theme.colors.textPrimary, marginBottom: 2 },
  toggleDesc: {},
});
