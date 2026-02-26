/**
 * BLIK Receive - Token Selection Screen
 * Select which token to receive
 * Shows token balances and USD values (consistent with Send flow)
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppSelector } from '@/src/store/hooks';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { TokenIcon } from '@/src/components/TokenIcon';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

// Fallback tokens if balance is empty
const FALLBACK_TOKENS: Array<{
  symbol: string;
  name: string;
  balance?: string;
  usdValue?: number;
  iconUrl?: string;
}> = [
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'USDT', name: 'Tether USD' },
];

export default function BlikReceiveTokenScreen() {
  const { theme: dynamicTheme } = useTheme();
  const balance = useAppSelector((state) => state.balance);

  // Use tokens from balance if available (with balance + USD), otherwise fallback
  const tokens = balance.balances.length > 0
    ? balance.balances.map((b) => ({
        symbol: b.symbol,
        name: b.name || b.symbol,
        balance: b.balance,
        usdValue: b.usdValue,
        iconUrl: b.iconUrl,
      }))
    : FALLBACK_TOKENS;

  const handleSelectToken = (token: string) => {
    router.push({
      pathname: '/blik/receive/amount',
      params: { token },
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Receive BLIK" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.subtitle, theme.typography.body, { color: dynamicTheme.colors.textSecondary }]}>
          Which token do you want to receive?
        </Text>

        <View style={styles.tokenList}>
          {tokens.map((token) => (
            <TouchableOpacity
              key={token.symbol}
              style={[styles.tokenItem, { backgroundColor: dynamicTheme.colors.surface }]}
              onPress={() => handleSelectToken(token.symbol)}
              activeOpacity={0.7}
            >
              <TokenIcon symbol={token.symbol} iconUrl={token.iconUrl} size={40} />
              <View style={styles.tokenInfo}>
                <Text style={[styles.tokenName, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>
                  {token.name}
                </Text>
                <Text style={[styles.tokenSymbol, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                  {token.symbol}
                </Text>
              </View>
              <View style={styles.tokenBalance}>
                {token.balance != null ? (
                  <>
                    <Text style={[styles.balanceText, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>
                      {parseFloat(token.balance).toFixed(6)}
                    </Text>
                    <Text style={[styles.balanceUsd, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                      {token.usdValue ? `$${token.usdValue.toFixed(2)}` : '$0.00'}
                    </Text>
                  </>
                ) : (
                  <FontAwesome name="chevron-right" size={16} color={dynamicTheme.colors.textTertiary} />
                )}
              </View>
            </TouchableOpacity>
          ))}
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
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  tokenList: {
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
    // color set inline
  },
  tokenBalance: {
    alignItems: 'flex-end',
  },
  balanceText: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs / 2,
  },
  balanceUsd: {
    // color set inline
  },
});
