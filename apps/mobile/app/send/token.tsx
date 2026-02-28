/**
 * Send Screen 1: Token Selection
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { setSelectedToken, setStep, resetSend } from '@/src/store/slices/send-slice';
import { TokenIcon } from '@/src/components/TokenIcon';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';

export default function TokenSelectionScreen() {
  const { theme: dynamicTheme } = useTheme();
  const dispatch = useAppDispatch();
  const balance = useAppSelector((state) => state.balance);

  // Reset send state when starting new send flow
  useEffect(() => {
    dispatch(resetSend());
  }, [dispatch]);

  const handleTokenSelect = (token: string) => {
    dispatch(setSelectedToken(token));
    dispatch(setStep('recipient'));
    router.push('/send/recipient');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Send" />

      <Text style={[styles.subtitle, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
        Select token to send
      </Text>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {balance.balances.map((token) => (
          <TouchableOpacity
            key={token.token}
            style={[styles.tokenItem, { backgroundColor: dynamicTheme.colors.surface }]}
            onPress={() => handleTokenSelect(token.symbol)}
          >
            <TokenIcon symbol={token.symbol} iconUrl={token.iconUrl} size={40} />
            <View style={styles.tokenInfo}>
              <Text style={[styles.tokenName, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>
                {token.symbol}
              </Text>
              <Text style={[styles.tokenSymbol, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                {token.name || token.symbol}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.xl,
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
