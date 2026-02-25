/**
 * Split Bill Create - Step 1: Token Selection
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { setSelectedToken, setStep, resetSplitCreate, setSelectedNetwork } from '@/src/store/slices/split-create-slice';
import { selectIsTestAccount } from '@/src/store/slices/wallet-slice';
import { TokenIcon } from '@/src/components/TokenIcon';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { SUPPORTED_NETWORKS, TIER1_NETWORK_IDS, type NetworkId } from '@e-y/shared';

export default function SplitTokenScreen() {
  const dispatch = useAppDispatch();
  const { theme: dynamicTheme } = useTheme();
  const balance = useAppSelector((state) => state.balance);
  const splitCreate = useAppSelector((state) => state.splitCreate);
  const isTestAccount = useAppSelector(selectIsTestAccount);

  // Reset state when starting new flow
  useEffect(() => {
    dispatch(resetSplitCreate());
  }, [dispatch]);

  const handleNetworkSelect = (networkId: NetworkId) => {
    dispatch(setSelectedNetwork(networkId));
  };

  const handleTokenSelect = (token: string) => {
    dispatch(setSelectedToken(token));
    dispatch(setStep('amount'));
    router.push('/split/create/amount');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Split Bill" />

      <View style={styles.container}>
        <Text style={[styles.stepIndicator, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
          Step 1 of 6
        </Text>
        <Text style={[styles.subtitle, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>
          Select token to split
        </Text>

        {/* Network selector — only for real accounts */}
        {!isTestAccount && (
          <View style={styles.networkSection}>
            <Text style={[styles.networkLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
              Network
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.networkScroll}>
              {TIER1_NETWORK_IDS.map((id) => {
                const net = SUPPORTED_NETWORKS[id];
                const isSelected = id === splitCreate.selectedNetwork;
                return (
                  <TouchableOpacity
                    key={id}
                    onPress={() => handleNetworkSelect(id)}
                    style={[
                      styles.networkChip,
                      {
                        borderColor: isSelected ? net.color + '60' : 'rgba(255,255,255,0.08)',
                        backgroundColor: isSelected ? net.color + '20' : 'transparent',
                      },
                    ]}
                  >
                    <Text style={[styles.networkChipText, { color: isSelected ? net.color : 'rgba(255,255,255,0.4)' }]}>
                      {net.shortName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <ScrollView style={styles.tokenList} contentContainerStyle={styles.tokenListContent}>
          {balance.balances.map((token) => (
            <TouchableOpacity
              key={token.token}
              style={[styles.tokenItem, { backgroundColor: dynamicTheme.colors.surface }]}
              onPress={() => handleTokenSelect(token.symbol)}
            >
              <TokenIcon symbol={token.symbol} iconUrl={token.iconUrl} size={40} />
              <View style={styles.tokenInfo}>
                <Text style={[styles.tokenName, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>
                  {token.name || token.symbol}
                </Text>
                <Text style={[styles.tokenSymbol, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                  {token.symbol}
                </Text>
              </View>
              <View style={styles.tokenBalance}>
                <Text style={[styles.balance, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>
                  {parseFloat(token.balance).toFixed(6)}
                </Text>
                <Text style={[styles.balanceUsd, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                  {token.usdValue ? `$${token.usdValue.toFixed(2)}` : '$0.00'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
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
    padding: theme.spacing.xl,
  },
  stepIndicator: {
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xl,
  },
  networkSection: {
    marginBottom: theme.spacing.lg,
  },
  networkLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  networkScroll: {
    flexGrow: 0,
  },
  networkChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  networkChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tokenList: {
    flex: 1,
  },
  tokenListContent: {
    gap: theme.spacing.md,
  },
  tokenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.md,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenName: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs / 2,
  },
  tokenSymbol: {
    // Styled inline
  },
  tokenBalance: {
    alignItems: 'flex-end',
  },
  balance: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs / 2,
  },
  balanceUsd: {
    // Styled inline
  },
});
