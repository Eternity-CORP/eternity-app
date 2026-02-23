import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { TokenIcon } from '@/src/components/TokenIcon';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { SUPPORTED_NETWORKS, type NetworkId } from '@/src/constants/networks';
import type { AggregatedTokenBalance } from '@/src/services/network-service';

interface TokenBalance {
  token: string;
  symbol: string;
  name?: string;
  balance: string;
  usdValue?: number;
  iconUrl?: string;
}

interface TokensListProps {
  balances: TokenBalance[];
  isLoading: boolean;
  aggregatedBalances?: AggregatedTokenBalance[];
}

export function TokensList({ balances, isLoading, aggregatedBalances }: TokensListProps) {
  const { theme: dynamicTheme, isDark } = useTheme();

  return (
    <View style={styles.tokensSection}>
      <Text style={[styles.sectionTitle, { color: dynamicTheme.colors.textSecondary }]}>Tokens</Text>

      {balances.map((token) => (
        <TouchableOpacity
          key={token.token}
          style={[styles.tokenItem, { backgroundColor: dynamicTheme.colors.surface, borderColor: isDark ? 'transparent' : dynamicTheme.colors.border }]}
          onPress={() => router.push(`/token/${token.symbol}`)}
          activeOpacity={0.7}
        >
          <TokenIcon symbol={token.symbol} iconUrl={token.iconUrl} size={44} />
          <View style={styles.tokenInfo}>
            <Text style={[styles.tokenName, { color: dynamicTheme.colors.textPrimary }]}>{token.name || token.symbol}</Text>
            <Text style={[styles.tokenSymbol, { color: dynamicTheme.colors.textSecondary }]}>{token.symbol}</Text>
          </View>
          <View style={styles.tokenBalance}>
            <Text style={[styles.tokenBalanceValue, { color: dynamicTheme.colors.textPrimary }]}>
              {parseFloat(token.balance).toFixed(4)}
            </Text>
            <Text style={[styles.tokenBalanceUsd, { color: dynamicTheme.colors.textSecondary }]}>
              ${token.usdValue?.toFixed(2) || '0.00'}
            </Text>
            {aggregatedBalances && (() => {
              const agg = aggregatedBalances.find(a => a.symbol === token.symbol);
              if (!agg) return null;
              const activeNetworks = agg.networks.filter(n => parseFloat(n.balance) > 0);
              if (activeNetworks.length <= 1) return null;
              return (
                <View style={styles.networkDots}>
                  {activeNetworks.map(n => (
                    <View
                      key={n.networkId}
                      style={[
                        styles.networkDot,
                        { backgroundColor: SUPPORTED_NETWORKS[n.networkId as NetworkId]?.color || '#666' },
                      ]}
                    />
                  ))}
                </View>
              );
            })()}
          </View>
        </TouchableOpacity>
      ))}

      {balances.length === 0 && !isLoading && (
        <View style={styles.emptyState}>
          <FontAwesome name="inbox" size={32} color={dynamicTheme.colors.textTertiary} />
          <Text style={[styles.emptyStateText, { color: dynamicTheme.colors.textTertiary }]}>No tokens yet</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tokensSection: {
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  tokenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tokenInfo: {
    flex: 1,
  },
  tokenName: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  tokenSymbol: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  tokenBalance: {
    alignItems: 'flex-end',
  },
  tokenBalanceValue: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  tokenBalanceUsd: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  networkDots: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 3,
    marginTop: 3,
  },
  networkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl * 2,
    gap: theme.spacing.md,
  },
  emptyStateText: {
    ...theme.typography.body,
    color: theme.colors.textTertiary,
  },
});
