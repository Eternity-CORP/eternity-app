/**
 * Network Preferences Screen
 * Allows users to set preferred receiving network per token
 */

import { useEffect, useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { TokenIcon } from '@/src/components/TokenIcon';
import { NetworkDot } from '@/src/components/NetworkBadge';
import { theme } from '@/src/constants/theme';
import {
  NetworkId,
  SUPPORTED_NETWORKS,
  TIER1_NETWORK_IDS,
} from '@/src/constants/networks';
import {
  loadPreferencesThunk,
  setTokenPreferenceThunk,
  selectAllPreferences,
  selectPreferencesStatus,
} from '@/src/store/slices/network-preferences-slice';

interface TokenRowProps {
  symbol: string;
  name: string;
  iconUrl?: string;
  currentPreference: NetworkId | null;
  availableNetworks: NetworkId[];
  onPreferenceChange: (networkId: NetworkId | null) => void;
}

function TokenRow({
  symbol,
  name,
  iconUrl,
  currentPreference,
  availableNetworks,
  onPreferenceChange,
}: TokenRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleSelect = useCallback(
    (networkId: NetworkId | null) => {
      onPreferenceChange(networkId);
      setIsExpanded(false);
    },
    [onPreferenceChange]
  );

  const currentNetwork = currentPreference
    ? SUPPORTED_NETWORKS[currentPreference]
    : null;

  return (
    <View style={styles.tokenRow}>
      {/* Token info */}
      <View style={styles.tokenInfo}>
        <TokenIcon symbol={symbol} iconUrl={iconUrl} size={36} />
        <View style={styles.tokenText}>
          <Text style={[styles.tokenName, theme.typography.body]}>
            {name || symbol}
          </Text>
          <Text style={[styles.tokenSymbol, theme.typography.caption]}>
            {symbol}
          </Text>
        </View>
      </View>

      {/* Network selector */}
      <TouchableOpacity
        style={styles.networkSelector}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        {currentNetwork ? (
          <>
            <NetworkDot networkId={currentPreference!} size={10} />
            <Text style={[styles.networkName, theme.typography.body]}>
              {currentNetwork.shortName}
            </Text>
          </>
        ) : (
          <Text style={[styles.anyNetwork, theme.typography.body]}>
            Any network
          </Text>
        )}
        <FontAwesome
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={12}
          color={theme.colors.textTertiary}
        />
      </TouchableOpacity>

      {/* Dropdown options */}
      {isExpanded && (
        <View style={styles.dropdown}>
          {/* Any network option */}
          <TouchableOpacity
            style={[
              styles.dropdownItem,
              currentPreference === null && styles.dropdownItemSelected,
            ]}
            onPress={() => handleSelect(null)}
          >
            <Text
              style={[
                styles.dropdownText,
                theme.typography.body,
                currentPreference === null && styles.dropdownTextSelected,
              ]}
            >
              Any network
            </Text>
            {currentPreference === null && (
              <FontAwesome
                name="check"
                size={14}
                color={theme.colors.buttonPrimary}
              />
            )}
          </TouchableOpacity>

          {/* Network options */}
          {availableNetworks.map((networkId) => {
            const network = SUPPORTED_NETWORKS[networkId];
            const isSelected = currentPreference === networkId;

            return (
              <TouchableOpacity
                key={networkId}
                style={[
                  styles.dropdownItem,
                  isSelected && styles.dropdownItemSelected,
                ]}
                onPress={() => handleSelect(networkId)}
              >
                <View style={styles.dropdownItemContent}>
                  <NetworkDot networkId={networkId} size={10} />
                  <Text
                    style={[
                      styles.dropdownText,
                      theme.typography.body,
                      isSelected && styles.dropdownTextSelected,
                    ]}
                  >
                    {network.name}
                  </Text>
                </View>
                {isSelected && (
                  <FontAwesome
                    name="check"
                    size={14}
                    color={theme.colors.buttonPrimary}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function NetworkPreferencesScreen() {
  const dispatch = useAppDispatch();
  const preferences = useAppSelector(selectAllPreferences);
  const status = useAppSelector(selectPreferencesStatus);
  const aggregatedBalances = useAppSelector(
    (state) => state.balance.aggregatedBalances
  );

  // Load preferences on mount
  useEffect(() => {
    dispatch(loadPreferencesThunk());
  }, [dispatch]);

  const handlePreferenceChange = useCallback(
    (symbol: string, networkId: NetworkId | null) => {
      dispatch(setTokenPreferenceThunk({ symbol, networkId }));
    },
    [dispatch]
  );

  const isLoading = status === 'loading';

  // Get unique tokens from balances
  const tokens = aggregatedBalances.map((balance) => ({
    symbol: balance.symbol,
    name: balance.name,
    iconUrl: balance.iconUrl,
    networks: balance.networks.map((n) => n.networkId),
  }));

  // Add common tokens if not in balances
  const commonTokens = ['ETH', 'USDC', 'USDT', 'DAI'];
  const existingSymbols = new Set(tokens.map((t) => t.symbol));

  for (const symbol of commonTokens) {
    if (!existingSymbols.has(symbol)) {
      tokens.push({
        symbol,
        name: symbol,
        iconUrl: undefined,
        networks: TIER1_NETWORK_IDS,
      });
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Network Preferences" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.buttonPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Network Preferences" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* Info box */}
        <View style={styles.infoBox}>
          <FontAwesome
            name="info-circle"
            size={20}
            color={theme.colors.buttonPrimary}
          />
          <Text style={[styles.infoText, theme.typography.caption]}>
            When you receive tokens, this preference tells senders which network
            you prefer. "Any network" means you'll receive on the sender's
            network with no conversion fees.
          </Text>
        </View>

        {/* Token list */}
        <View style={styles.tokenList}>
          <Text style={[styles.sectionTitle, theme.typography.caption]}>
            When I receive:
          </Text>

          {tokens.map((token) => (
            <TokenRow
              key={token.symbol}
              symbol={token.symbol}
              name={token.name}
              iconUrl={token.iconUrl}
              currentPreference={preferences[token.symbol] ?? null}
              availableNetworks={
                token.networks.length > 0 ? token.networks : TIER1_NETWORK_IDS
              }
              onPreferenceChange={(networkId) =>
                handlePreferenceChange(token.symbol, networkId)
              }
            />
          ))}
        </View>

        {/* Note about syncing */}
        <View style={styles.noteBox}>
          <FontAwesome
            name="cloud"
            size={16}
            color={theme.colors.textTertiary}
          />
          <Text style={[styles.noteText, theme.typography.caption]}>
            Preferences are synced with your @username so senders can see them
            when sending to you.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.xl,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  infoText: {
    flex: 1,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  tokenList: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tokenRow: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  tokenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  tokenText: {
    flex: 1,
  },
  tokenName: {
    color: theme.colors.textPrimary,
  },
  tokenSymbol: {
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  networkSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  networkName: {
    color: theme.colors.textPrimary,
  },
  anyNetwork: {
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  dropdown: {
    marginTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  dropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  dropdownText: {
    color: theme.colors.textPrimary,
  },
  dropdownTextSelected: {
    color: theme.colors.buttonPrimary,
    fontWeight: '600',
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.sm,
  },
  noteText: {
    flex: 1,
    color: theme.colors.textTertiary,
    lineHeight: 18,
  },
});
