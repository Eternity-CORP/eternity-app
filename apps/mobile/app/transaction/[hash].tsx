/**
 * Transaction Details Screen
 * Shows detailed information about a specific transaction
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { fetchTransactionDetailsThunk, clearSelectedTransaction } from '@/src/store/slices/transaction-slice';
import { truncateAddress } from '@/src/utils/format';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

const NETWORK = process.env.EXPO_PUBLIC_NETWORK || 'sepolia';

const getExplorerUrl = (txHash: string): string => {
  return NETWORK === 'mainnet'
    ? `https://etherscan.io/tx/${txHash}`
    : `https://sepolia.etherscan.io/tx/${txHash}`;
};

export default function TransactionDetailsScreen() {
  const { hash } = useLocalSearchParams<{ hash: string }>();
  const dispatch = useAppDispatch();
  const { theme: dynamicTheme } = useTheme();
  const wallet = useAppSelector((state) => state.wallet);
  const transactionState = useAppSelector((state) => state.transaction);
  const currentAccount = getCurrentAccount(wallet);
  const tx = transactionState.selectedTransaction;

  const [showDetails, setShowDetails] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fetch transaction details
  useEffect(() => {
    if (hash && currentAccount?.address) {
      dispatch(fetchTransactionDetailsThunk({
        txHash: hash,
        userAddress: currentAccount.address,
      }));
    }

    return () => {
      dispatch(clearSelectedTransaction());
    };
  }, [hash, currentAccount?.address, dispatch]);

  const handleCopy = async (text: string, field: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenExplorer = () => {
    if (hash) {
      Linking.openURL(getExplorerUrl(hash));
    }
  };

  // Calculate gas cost
  const getGasCost = (): { eth: string; usd: string } | null => {
    if (!tx?.gasUsed || !tx?.gasPrice) return null;
    const gasUsed = BigInt(tx.gasUsed);
    const gasPrice = BigInt(tx.gasPrice);
    const gasCostWei = gasUsed * gasPrice;
    const gasCostEth = Number(gasCostWei) / 1e18;
    // Rough ETH price estimate (should come from price service in production)
    const ethPrice = 2500;
    return {
      eth: gasCostEth.toFixed(6),
      usd: (gasCostEth * ethPrice).toFixed(2),
    };
  };

  const gasCost = getGasCost();

  // Loading state
  if (transactionState.status === 'loading' && !tx) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
        <ScreenHeader title="Transaction" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={dynamicTheme.colors.buttonPrimary} />
          <Text style={[styles.loadingText, theme.typography.body, { color: dynamicTheme.colors.textSecondary }]}>
            Loading transaction details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (transactionState.error || !tx) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
        <ScreenHeader title="Transaction" />
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-triangle" size={48} color={dynamicTheme.colors.error} />
          <Text style={[styles.errorText, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>
            Transaction not found
          </Text>
          <Text style={[styles.errorSubtext, theme.typography.body, { color: dynamicTheme.colors.textSecondary }]}>
            {transactionState.error || 'Unable to load transaction details'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = tx.status === 'confirmed'
    ? dynamicTheme.colors.success
    : tx.status === 'pending'
      ? '#FFA500'
      : dynamicTheme.colors.error;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Transaction" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Main Amount Section */}
        <View style={styles.amountSection}>
          <View style={[styles.directionIcon, { backgroundColor: tx.direction === 'sent' ? dynamicTheme.colors.error + '20' : dynamicTheme.colors.success + '20' }]}>
            <FontAwesome
              name={tx.direction === 'sent' ? 'arrow-up' : 'arrow-down'}
              size={32}
              color={tx.direction === 'sent' ? dynamicTheme.colors.error : dynamicTheme.colors.success}
            />
          </View>
          <Text style={[styles.directionText, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
            {tx.direction === 'sent' ? 'SENT' : 'RECEIVED'}
          </Text>
          <Text
            style={[styles.amountText, { color: dynamicTheme.colors.textPrimary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {tx.direction === 'sent' ? '-' : '+'}{tx.amount} {tx.token}
          </Text>

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, theme.typography.caption, { color: statusColor }]}>
              {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
            </Text>
          </View>
        </View>

        {/* Basic Info Card */}
        <View style={[styles.card, { backgroundColor: dynamicTheme.colors.surface }]}>
          {/* From */}
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
              From
            </Text>
            <View style={styles.infoValue}>
              <Text style={[styles.addressText, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]} numberOfLines={1}>
                {truncateAddress(tx.from)}
              </Text>
              <TouchableOpacity
                style={[styles.copyButton, { backgroundColor: dynamicTheme.colors.background }]}
                onPress={() => handleCopy(tx.from, 'from')}
              >
                <FontAwesome
                  name={copiedField === 'from' ? 'check' : 'copy'}
                  size={14}
                  color={copiedField === 'from' ? dynamicTheme.colors.success : dynamicTheme.colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* To */}
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
              To
            </Text>
            <View style={styles.infoValue}>
              <Text style={[styles.addressText, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]} numberOfLines={1}>
                {truncateAddress(tx.to)}
              </Text>
              <TouchableOpacity
                style={[styles.copyButton, { backgroundColor: dynamicTheme.colors.background }]}
                onPress={() => handleCopy(tx.to, 'to')}
              >
                <FontAwesome
                  name={copiedField === 'to' ? 'check' : 'copy'}
                  size={14}
                  color={copiedField === 'to' ? dynamicTheme.colors.success : dynamicTheme.colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Date */}
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
              Date
            </Text>
            <Text style={[styles.infoText, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
              {new Date(tx.timestamp).toLocaleDateString()} at {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          {/* Gas Fee */}
          {gasCost && (
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                Gas Fee
              </Text>
              <Text style={[styles.infoText, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                {gasCost.eth} ETH (≈${gasCost.usd})
              </Text>
            </View>
          )}
        </View>

        {/* Technical Details (Expandable) */}
        <TouchableOpacity
          style={styles.expandHeader}
          onPress={() => setShowDetails(!showDetails)}
        >
          <FontAwesome
            name={showDetails ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={dynamicTheme.colors.textSecondary}
          />
          <Text style={[styles.expandText, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
            Technical Details
          </Text>
        </TouchableOpacity>

        {showDetails && (
          <View style={[styles.card, { backgroundColor: dynamicTheme.colors.surface }]}>
            {/* TX Hash */}
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                TX Hash
              </Text>
              <View style={styles.infoValue}>
                <Text style={[styles.addressText, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]} numberOfLines={1}>
                  {truncateAddress(tx.hash, 10)}
                </Text>
                <TouchableOpacity
                  style={[styles.copyButton, { backgroundColor: dynamicTheme.colors.background }]}
                  onPress={() => handleCopy(tx.hash, 'hash')}
                >
                  <FontAwesome
                    name={copiedField === 'hash' ? 'check' : 'copy'}
                    size={14}
                    color={copiedField === 'hash' ? dynamicTheme.colors.success : dynamicTheme.colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Block Number */}
            {tx.blockNumber && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                  Block
                </Text>
                <Text style={[styles.infoText, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                  {tx.blockNumber.toLocaleString()}
                </Text>
              </View>
            )}

            {/* Nonce */}
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                Nonce
              </Text>
              <Text style={[styles.infoText, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                {tx.nonce}
              </Text>
            </View>

            {/* Gas Used */}
            {tx.gasUsed && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                  Gas Used
                </Text>
                <Text style={[styles.infoText, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                  {parseInt(tx.gasUsed).toLocaleString()}
                </Text>
              </View>
            )}

            {/* Gas Price */}
            {tx.gasPrice && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                  Gas Price
                </Text>
                <Text style={[styles.infoText, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                  {(parseInt(tx.gasPrice) / 1e9).toFixed(2)} Gwei
                </Text>
              </View>
            )}

            {/* Confirmations */}
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                Confirmations
              </Text>
              <Text style={[styles.infoText, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                {tx.confirmations.toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* View on Explorer Button */}
        <TouchableOpacity style={[styles.explorerButton, { borderColor: dynamicTheme.colors.buttonPrimary }]} onPress={handleOpenExplorer}>
          <FontAwesome name="external-link" size={16} color={dynamicTheme.colors.buttonPrimary} />
          <Text style={[styles.explorerButtonText, theme.typography.body, { color: dynamicTheme.colors.buttonPrimary }]}>
            View on Etherscan
          </Text>
        </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    textAlign: 'center',
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
  // Amount Section
  amountSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  directionIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  directionText: {
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  amountText: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: theme.spacing.md,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 40,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontWeight: '600',
  },
  // Info Card
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    flex: 0.3,
  },
  infoValue: {
    flex: 0.7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  infoText: {
    color: theme.colors.textPrimary,
    textAlign: 'right',
    flex: 0.7,
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
  // Expandable Section
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
  // Explorer Button
  explorerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.lg,
  },
  explorerButtonText: {
    fontWeight: '600',
  },
});
