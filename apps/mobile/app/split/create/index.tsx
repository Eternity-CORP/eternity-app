/**
 * Split Bill Create - Step 1: Token Selection
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { setSelectedToken, setStep, resetSplitCreate } from '@/src/store/slices/split-create-slice';
import { TokenIcon } from '@/src/components/TokenIcon';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';

export default function SplitTokenScreen() {
  const dispatch = useAppDispatch();
  const balance = useAppSelector((state) => state.balance);
  const splitCreate = useAppSelector((state) => state.splitCreate);

  // Reset state when starting new flow
  useEffect(() => {
    dispatch(resetSplitCreate());
  }, [dispatch]);

  const handleTokenSelect = (token: string) => {
    dispatch(setSelectedToken(token));
    dispatch(setStep('amount'));
    router.push('/split/create/amount');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Split Bill" />

      <View style={styles.container}>
        <Text style={[styles.stepIndicator, theme.typography.caption, { color: theme.colors.textSecondary }]}>
          Step 1 of 6
        </Text>
        <Text style={[styles.subtitle, theme.typography.heading]}>
          Select token to split
        </Text>

        <ScrollView style={styles.tokenList} contentContainerStyle={styles.tokenListContent}>
          {balance.balances.map((token) => (
            <TouchableOpacity
              key={token.token}
              style={styles.tokenItem}
              onPress={() => handleTokenSelect(token.symbol)}
            >
              <TokenIcon symbol={token.symbol} iconUrl={token.iconUrl} size={40} />
              <View style={styles.tokenInfo}>
                <Text style={[styles.tokenName, theme.typography.heading]}>
                  {token.name || token.symbol}
                </Text>
                <Text style={[styles.tokenSymbol, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                  {token.symbol}
                </Text>
              </View>
              <View style={styles.tokenBalance}>
                <Text style={[styles.balance, theme.typography.heading]}>
                  {parseFloat(token.balance).toFixed(6)}
                </Text>
                <Text style={[styles.balanceUsd, theme.typography.caption, { color: theme.colors.textSecondary }]}>
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
