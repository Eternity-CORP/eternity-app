/**
 * Token Details Screen
 * Shows detailed information about a specific token with price chart
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Linking, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import * as Clipboard from 'expo-clipboard';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { setSelectedToken } from '@/src/store/slices/send-slice';
import { selectTransactionsForAddress } from '@/src/store/slices/transaction-slice';
import { formatUsdValue, type TokenBalance } from '@/src/services/balance-service';
import { fetchPriceChartData, fetchPriceChartByContract, type PriceChartData, type PricePoint } from '@/src/services/price-chart-service';
import { truncateAddress } from '@/src/utils/format';
import { TokenIcon } from '@/src/components/TokenIcon';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

const NETWORK = process.env.EXPO_PUBLIC_NETWORK || 'sepolia';
const CHART_WIDTH = Dimensions.get('window').width - theme.spacing.xl * 2;
const CHART_HEIGHT = 150;

type TimeRange = '24h' | '7d' | '30d';

const getExplorerUrl = (contractAddress: string): string => {
  return NETWORK === 'mainnet'
    ? `https://etherscan.io/token/${contractAddress}`
    : `https://sepolia.etherscan.io/token/${contractAddress}`;
};

/**
 * Simple line chart component for price data
 */
function PriceChart({
  data,
  width,
  height,
  isPositive,
}: {
  data: PricePoint[];
  width: number;
  height: number;
  isPositive: boolean;
}) {
  const path = useMemo(() => {
    if (data.length < 2) return '';

    const prices = data.map((p) => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    const padding = 10;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = data.map((point, index) => {
      const x = padding + (index / (data.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight;
      return { x, y };
    });

    const pathData = points.reduce((acc, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      return `${acc} L ${point.x} ${point.y}`;
    }, '');

    return pathData;
  }, [data, width, height]);

  if (data.length < 2) {
    return (
      <View style={[styles.chartPlaceholder, { width, height }]}>
        <Text style={[styles.chartPlaceholderText, theme.typography.caption, { color: theme.colors.textTertiary }]}>
          No chart data available
        </Text>
      </View>
    );
  }

  const color = isPositive ? theme.colors.success : theme.colors.error;

  return (
    <Svg width={width} height={height}>
      <Path d={path} stroke={color} strokeWidth={2} fill="none" />
    </Svg>
  );
}

export default function TokenDetailsScreen() {
  const { symbol } = useLocalSearchParams<{ symbol: string }>();
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const balance = useAppSelector((state) => state.balance);
  const currentAccount = getCurrentAccount(wallet);
  const transactions = useAppSelector((state) =>
    selectTransactionsForAddress(state, currentAccount?.address || null)
  );

  const [chartData, setChartData] = useState<PriceChartData | null>(null);
  const [chartLoading, setChartLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [showDetails, setShowDetails] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Find the token in balances
  const token = useMemo(() => {
    return balance.balances.find((b) => b.symbol === symbol);
  }, [balance.balances, symbol]);

  // Filter transactions for this token
  const tokenTransactions = useMemo(() => {
    if (!token) return [];
    return transactions.filter((tx) => tx.token === token.symbol).slice(0, 10);
  }, [transactions, token]);

  // Fetch chart data
  useEffect(() => {
    async function loadChartData() {
      if (!token) return;

      setChartLoading(true);
      const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;

      let data: PriceChartData | null = null;

      // Use contract address for ERC-20 tokens, symbol for ETH
      if (token.token === 'ETH') {
        data = await fetchPriceChartData(token.symbol, days);
      } else {
        // Try by symbol first (for known tokens like USDC)
        data = await fetchPriceChartData(token.symbol, days);
        // If that fails, try by contract address
        if (!data) {
          data = await fetchPriceChartByContract(token.token, days);
        }
      }

      setChartData(data);
      setChartLoading(false);
    }

    loadChartData();
  }, [token, timeRange]);

  const handleCopy = async (text: string, field: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSend = () => {
    if (token) {
      dispatch(setSelectedToken(token.symbol));
      router.push('/send/recipient');
    }
  };

  const handleReceive = () => {
    router.push('/receive');
  };

  const handleTransactionPress = (txHash: string) => {
    router.push(`/transaction/${txHash}`);
  };

  const handleOpenExplorer = () => {
    if (token && token.token !== 'ETH') {
      Linking.openURL(getExplorerUrl(token.token));
    }
  };

  // Loading/Error state
  if (!token) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Token" />
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-triangle" size={48} color={theme.colors.error} />
          <Text style={[styles.errorText, theme.typography.heading, { color: theme.colors.textPrimary }]}>
            Token not found
          </Text>
          <Text style={[styles.errorSubtext, theme.typography.body, { color: theme.colors.textSecondary }]}>
            This token is not in your wallet
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPositive = chartData ? chartData.priceChangePercentage24h >= 0 : true;
  const priceChangeColor = isPositive ? theme.colors.success : theme.colors.error;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title={token.symbol} />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Token Header */}
        <View style={styles.tokenHeader}>
          <TokenIcon symbol={token.symbol} iconUrl={token.iconUrl} size={64} />
          <Text style={[styles.tokenName, theme.typography.heading, { fontSize: 24 }]}>
            {token.name || token.symbol}
          </Text>
        </View>

        {/* Balance Section */}
        <View style={styles.balanceSection}>
          <Text style={[styles.balanceAmount, theme.typography.displayLarge]}>
            {token.balance} {token.symbol}
          </Text>
          <Text style={[styles.balanceUsd, theme.typography.body, { color: theme.colors.textSecondary }]}>
            ≈ {token.usdValue ? formatUsdValue(token.usdValue) : '$0.00'}
          </Text>

          {/* Price Change */}
          {chartData && chartData.currentPrice > 0 && (
            <View style={styles.priceChangeRow}>
              <FontAwesome
                name={isPositive ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={priceChangeColor}
              />
              <Text style={[styles.priceChangeText, theme.typography.caption, { color: priceChangeColor }]}>
                {isPositive ? '+' : ''}{chartData.priceChangePercentage24h.toFixed(2)}% (24h)
              </Text>
            </View>
          )}
        </View>

        {/* Price Chart */}
        <View style={styles.chartSection}>
          {/* Time Range Selector */}
          <View style={styles.timeRangeRow}>
            {(['24h', '7d', '30d'] as TimeRange[]).map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.timeRangeButton,
                  timeRange === range && styles.timeRangeButtonActive,
                ]}
                onPress={() => setTimeRange(range)}
              >
                <Text
                  style={[
                    styles.timeRangeText,
                    theme.typography.caption,
                    { color: timeRange === range ? theme.colors.buttonPrimaryText : theme.colors.textSecondary },
                  ]}
                >
                  {range}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Chart */}
          <View style={styles.chartContainer}>
            {chartLoading ? (
              <View style={[styles.chartPlaceholder, { height: CHART_HEIGHT }]}>
                <ActivityIndicator size="small" color={theme.colors.buttonPrimary} />
              </View>
            ) : chartData && chartData.prices.length > 0 ? (
              <PriceChart
                data={chartData.prices}
                width={CHART_WIDTH}
                height={CHART_HEIGHT}
                isPositive={isPositive}
              />
            ) : (
              <View style={[styles.chartPlaceholder, { height: CHART_HEIGHT }]}>
                <Text style={[styles.chartPlaceholderText, theme.typography.caption, { color: theme.colors.textTertiary }]}>
                  No price data available
                </Text>
              </View>
            )}
          </View>

          {/* Price Stats */}
          {chartData && chartData.currentPrice > 0 && (
            <View style={styles.priceStats}>
              <View style={styles.priceStat}>
                <Text style={[styles.priceStatLabel, theme.typography.caption, { color: theme.colors.textTertiary }]}>
                  Current
                </Text>
                <Text style={[styles.priceStatValue, theme.typography.body]}>
                  ${chartData.currentPrice.toFixed(2)}
                </Text>
              </View>
              <View style={styles.priceStat}>
                <Text style={[styles.priceStatLabel, theme.typography.caption, { color: theme.colors.textTertiary }]}>
                  24h High
                </Text>
                <Text style={[styles.priceStatValue, theme.typography.body]}>
                  ${chartData.high24h.toFixed(2)}
                </Text>
              </View>
              <View style={styles.priceStat}>
                <Text style={[styles.priceStatLabel, theme.typography.caption, { color: theme.colors.textTertiary }]}>
                  24h Low
                </Text>
                <Text style={[styles.priceStatValue, theme.typography.body]}>
                  ${chartData.low24h.toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]} onPress={handleSend}>
            <FontAwesome name="arrow-up" size={16} color={theme.colors.buttonPrimaryText} />
            <Text style={[styles.actionButtonText, theme.typography.heading, { color: theme.colors.buttonPrimaryText }]}>
              Send
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]} onPress={handleReceive}>
            <FontAwesome name="arrow-down" size={16} color={theme.colors.textPrimary} />
            <Text style={[styles.actionButtonText, theme.typography.heading, { color: theme.colors.textPrimary }]}>
              Receive
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transaction History */}
        <View style={styles.transactionsSection}>
          <Text style={[styles.sectionTitle, theme.typography.heading]}>
            Transactions
          </Text>

          {tokenTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome name="exchange" size={32} color={theme.colors.textTertiary} />
              <Text style={[styles.emptyText, theme.typography.body, { color: theme.colors.textSecondary }]}>
                No {token.symbol} transactions
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {tokenTransactions.map((tx) => (
                <TouchableOpacity
                  key={tx.hash}
                  style={styles.transactionItem}
                  onPress={() => handleTransactionPress(tx.hash)}
                >
                  <View style={styles.transactionIcon}>
                    <FontAwesome
                      name={tx.direction === 'sent' ? 'arrow-up' : 'arrow-down'}
                      size={14}
                      color={tx.direction === 'sent' ? theme.colors.error : theme.colors.success}
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={[styles.transactionDirection, theme.typography.body]}>
                      {tx.direction === 'sent' ? 'Sent' : 'Received'}
                    </Text>
                    <Text style={[styles.transactionDate, theme.typography.caption, { color: theme.colors.textTertiary }]}>
                      {new Date(tx.timestamp).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[styles.transactionAmount, theme.typography.body, { color: tx.direction === 'sent' ? theme.colors.textPrimary : theme.colors.success }]}>
                    {tx.direction === 'sent' ? '-' : '+'}{tx.amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Token Details (Expandable) */}
        {token.token !== 'ETH' && (
          <>
            <TouchableOpacity
              style={styles.expandHeader}
              onPress={() => setShowDetails(!showDetails)}
            >
              <FontAwesome
                name={showDetails ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={theme.colors.textSecondary}
              />
              <Text style={[styles.expandText, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                Token Details
              </Text>
            </TouchableOpacity>

            {showDetails && (
              <View style={styles.detailsCard}>
                {/* Contract Address */}
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                    Contract
                  </Text>
                  <View style={styles.detailValue}>
                    <Text style={[styles.addressText, theme.typography.body]} numberOfLines={1}>
                      {truncateAddress(token.token, 10)}
                    </Text>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => handleCopy(token.token, 'contract')}
                    >
                      <FontAwesome
                        name={copiedField === 'contract' ? 'check' : 'copy'}
                        size={14}
                        color={copiedField === 'contract' ? theme.colors.success : theme.colors.textTertiary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Network */}
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                    Network
                  </Text>
                  <Text style={[styles.detailText, theme.typography.body]}>
                    Ethereum {NETWORK === 'mainnet' ? 'Mainnet' : 'Sepolia'}
                  </Text>
                </View>

                {/* Decimals */}
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                    Decimals
                  </Text>
                  <Text style={[styles.detailText, theme.typography.body]}>
                    {token.decimals}
                  </Text>
                </View>

                {/* View on Explorer */}
                <TouchableOpacity style={styles.explorerButton} onPress={handleOpenExplorer}>
                  <FontAwesome name="external-link" size={14} color={theme.colors.buttonPrimary} />
                  <Text style={[styles.explorerButtonText, theme.typography.caption, { color: theme.colors.buttonPrimary }]}>
                    View on Etherscan
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
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
    gap: theme.spacing.lg,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  errorText: {
    textAlign: 'center',
  },
  errorSubtext: {
    textAlign: 'center',
  },
  // Token Header
  tokenHeader: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  tokenName: {
    color: theme.colors.textPrimary,
  },
  // Balance Section
  balanceSection: {
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  balanceAmount: {
    color: theme.colors.textPrimary,
  },
  balanceUsd: {
    // Color set inline
  },
  priceChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  priceChangeText: {
    // Color set inline
  },
  // Chart Section
  chartSection: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  timeRangeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
  },
  timeRangeButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.background,
  },
  timeRangeButtonActive: {
    backgroundColor: theme.colors.buttonPrimary,
  },
  timeRangeText: {
    fontWeight: '600',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPlaceholder: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  chartPlaceholderText: {
    textAlign: 'center',
  },
  priceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.buttonSecondaryBorder,
  },
  priceStat: {
    alignItems: 'center',
    gap: theme.spacing.xs / 2,
  },
  priceStatLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceStatValue: {
    color: theme.colors.textPrimary,
  },
  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  actionButtonPrimary: {
    backgroundColor: theme.colors.buttonPrimary,
  },
  actionButtonSecondary: {
    backgroundColor: theme.colors.buttonSecondary,
    borderWidth: 1,
    borderColor: theme.colors.buttonSecondaryBorder,
  },
  actionButtonText: {
    // Color set inline
  },
  // Transactions
  transactionsSection: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  emptyText: {
    textAlign: 'center',
  },
  transactionsList: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.buttonSecondaryBorder,
  },
  transactionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDirection: {
    color: theme.colors.textPrimary,
  },
  transactionDate: {
    marginTop: 2,
  },
  transactionAmount: {
    // Color set inline
  },
  // Token Details
  expandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  expandText: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    flex: 0.35,
  },
  detailValue: {
    flex: 0.65,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  detailText: {
    color: theme.colors.textPrimary,
    textAlign: 'right',
    flex: 0.65,
  },
  addressText: {
    color: theme.colors.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  copyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  explorerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.buttonSecondaryBorder,
  },
  explorerButtonText: {
    fontWeight: '600',
  },
});
