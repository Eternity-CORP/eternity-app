/**
 * BLIK Receive - Token Selection Screen
 * Select which token to receive
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppSelector } from '@/src/store/hooks';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { TokenIcon } from '@/src/components/TokenIcon';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

// Fallback tokens if balance is empty
const FALLBACK_TOKENS: Array<{ symbol: string; name: string; iconUrl?: string }> = [
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'USDC', name: 'USD Coin' },
  { symbol: 'USDT', name: 'Tether USD' },
];

export default function BlikReceiveTokenScreen() {
  const balance = useAppSelector((state) => state.balance);

  // Use tokens from balance if available, otherwise fallback
  const tokens = balance.balances.length > 0
    ? balance.balances.map((b) => ({
        symbol: b.symbol,
        name: b.name || b.symbol,
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
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Receive BLIK" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.subtitle, theme.typography.body, { color: theme.colors.textSecondary }]}>
          Which token do you want to receive?
        </Text>

        <View style={styles.tokenList}>
          {tokens.map((token) => (
            <TouchableOpacity
              key={token.symbol}
              style={styles.tokenItem}
              onPress={() => handleSelectToken(token.symbol)}
              activeOpacity={0.7}
            >
              <TokenIcon symbol={token.symbol} iconUrl={token.iconUrl} size={48} />
              <View style={styles.tokenInfo}>
                <Text style={[styles.tokenName, theme.typography.heading]}>
                  {token.name}
                </Text>
                <Text style={[styles.tokenSymbol, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                  {token.symbol}
                </Text>
              </View>
              <FontAwesome name="chevron-right" size={16} color={theme.colors.textTertiary} />
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
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
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
    gap: theme.spacing.lg,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenName: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  tokenSymbol: {
    // color set inline
  },
});
