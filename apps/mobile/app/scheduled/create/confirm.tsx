/**
 * Scheduled Payment Create - Step 5: Confirm & Create
 */

import { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount, selectIsTestAccount } from '@/src/store/slices/wallet-slice';
import { TestModeWarning } from '@/src/components/TestModeWarning';
import { createScheduledPaymentThunk } from '@/src/store/slices/scheduled-slice';
import { resetScheduledCreate } from '@/src/store/slices/scheduled-create-slice';
import { truncateAddress } from '@/src/utils/format';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import { loadWallet, getWalletFromMnemonic } from '@/src/services/wallet-service';
import { signScheduledTransaction } from '@/src/services/scheduled-signing';
import { TIER1_NETWORK_IDS } from '@/src/constants/networks';
import { TESTNET_NETWORK_IDS } from '@/src/constants/networks-testnet';
import type { AnyNetworkId } from '@/src/services/network-service';

export default function ScheduledConfirmScreen() {
  const dispatch = useAppDispatch();
  const { theme: dynamicTheme } = useTheme();
  const wallet = useAppSelector((state) => state.wallet);
  const balance = useAppSelector((state) => state.balance);
  const scheduled = useAppSelector((state) => state.scheduled);
  const scheduledCreate = useAppSelector((state) => state.scheduledCreate);
  const currentAccount = getCurrentAccount(wallet);
  const isTestAccount = useAppSelector(selectIsTestAccount);

  const [isSigningTx, setIsSigningTx] = useState(false);

  const selectedToken = balance.balances.find(
    (t) => t.symbol === scheduledCreate.selectedToken
  );

  // Get token info from aggregated balances for network/contract info
  const aggregatedToken = balance.aggregatedBalances.find(
    (t) => t.symbol.toUpperCase() === scheduledCreate.selectedToken.toUpperCase()
  );
  const scheduledDate = new Date(scheduledCreate.scheduledDate);

  // Determine network and token address for signing
  const getNetworkAndTokenInfo = (): { networkId: AnyNetworkId; tokenAddress: string | null; decimals: number } => {
    const accountType = currentAccount?.type || 'test';

    // Default network based on account type
    const defaultNetwork: AnyNetworkId = accountType === 'test'
      ? TESTNET_NETWORK_IDS[0]
      : TIER1_NETWORK_IDS[0];

    // Native token (ETH/etc)
    const isNativeToken = scheduledCreate.selectedToken === 'ETH' ||
      scheduledCreate.selectedToken === 'MATIC' ||
      scheduledCreate.selectedToken === 'POL';

    if (isNativeToken) {
      return { networkId: defaultNetwork, tokenAddress: null, decimals: 18 };
    }

    // For ERC-20 tokens, find the contract address from aggregated balances
    if (aggregatedToken && aggregatedToken.networks.length > 0) {
      const networkData = aggregatedToken.networks[0];
      return {
        networkId: networkData.networkId as AnyNetworkId,
        tokenAddress: networkData.contractAddress,
        decimals: aggregatedToken.decimals,
      };
    }

    // Fallback - shouldn't happen if token selection works correctly
    return { networkId: defaultNetwork, tokenAddress: null, decimals: 18 };
  };

  const handleConfirm = async () => {
    if (!currentAccount?.address) {
      Alert.alert('Error', 'No wallet connected');
      return;
    }

    setIsSigningTx(true);

    try {
      // Load wallet for signing
      const walletData = await loadWallet();
      if (!walletData?.mnemonic) {
        throw new Error('Unable to access wallet for signing');
      }

      // Get signing wallet
      const signingWallet = getWalletFromMnemonic(walletData.mnemonic, currentAccount.accountIndex);

      // Get network and token info
      const { networkId, tokenAddress, decimals } = getNetworkAndTokenInfo();
      const accountType = currentAccount.type || 'test';

      // Sign the transaction
      const signedData = await signScheduledTransaction({
        privateKey: signingWallet.privateKey,
        recipient: scheduledCreate.recipient,
        amount: scheduledCreate.amount,
        tokenAddress,
        networkId,
        accountType,
        decimals,
      });

      // Create scheduled payment with signed transaction
      await dispatch(
        createScheduledPaymentThunk({
          creatorAddress: currentAccount.address,
          recipient: scheduledCreate.recipient,
          recipientUsername: scheduledCreate.recipientUsername || undefined,
          recipientName: scheduledCreate.recipientName || undefined,
          amount: scheduledCreate.amount,
          tokenSymbol: scheduledCreate.selectedToken,
          scheduledAt: scheduledCreate.scheduledDate,
          recurringInterval: scheduledCreate.isRecurring
            ? scheduledCreate.recurringInterval
            : undefined,
          description: scheduledCreate.description || undefined,
          signedTransaction: signedData.signedTransaction,
          estimatedGasPrice: signedData.estimatedGasPrice,
          nonce: signedData.nonce,
          chainId: signedData.chainId,
        })
      ).unwrap();

      dispatch(resetScheduledCreate());

      Alert.alert('Success', 'Scheduled payment created and pre-signed for automatic execution', [
        {
          text: 'OK',
          onPress: () => router.replace('/scheduled'),
        },
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create scheduled payment';
      Alert.alert('Error', message);
    } finally {
      setIsSigningTx(false);
    }
  };

  const isCreating = scheduled.status === 'loading' || isSigningTx;

  // Calculate USD value
  const amountValue = parseFloat(scheduledCreate.amount) || 0;
  const usdValue = selectedToken
    ? (amountValue * (selectedToken.usdValue || 0)) / parseFloat(selectedToken.balance)
    : 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Confirm" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.stepIndicator, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
          Step 5 of 5
        </Text>
        <Text style={[styles.subtitle, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>
          Review your scheduled payment
        </Text>

        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: dynamicTheme.colors.surface }]}>
          <View style={styles.summaryRow}>
            <View style={[styles.avatar, { backgroundColor: dynamicTheme.colors.buttonPrimary }]}>
              <FontAwesome name="user" size={24} color={dynamicTheme.colors.buttonPrimaryText} />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={[styles.summaryLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                From
              </Text>
              <Text style={[styles.summaryValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                {currentAccount ? truncateAddress(currentAccount.address) : ''}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: dynamicTheme.colors.buttonSecondaryBorder }]} />

          <View style={styles.summaryRow}>
            <View style={[styles.avatar, { backgroundColor: dynamicTheme.colors.success }]}>
              <FontAwesome name="user" size={24} color={dynamicTheme.colors.buttonPrimaryText} />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={[styles.summaryLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                To
              </Text>
              {scheduledCreate.recipientName || scheduledCreate.recipientUsername ? (
                <>
                  <Text style={[styles.summaryValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                    {scheduledCreate.recipientName || scheduledCreate.recipientUsername}
                  </Text>
                  <Text style={[styles.summarySubValue, theme.typography.caption, { color: dynamicTheme.colors.textTertiary }]}>
                    {truncateAddress(scheduledCreate.recipient)}
                  </Text>
                </>
              ) : (
                <Text style={[styles.summaryValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                  {truncateAddress(scheduledCreate.recipient)}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Details Card */}
        <View style={[styles.detailsCard, { backgroundColor: dynamicTheme.colors.surface }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
              Amount
            </Text>
            <View style={styles.detailValueColumn}>
              <Text style={[styles.detailValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                {scheduledCreate.amount} {scheduledCreate.selectedToken}
              </Text>
              {usdValue > 0 && (
                <Text style={[styles.detailSubValue, theme.typography.caption, { color: dynamicTheme.colors.textTertiary }]}>
                  ${usdValue.toFixed(2)} USD
                </Text>
              )}
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
              Scheduled For
            </Text>
            <View style={styles.detailValueColumn}>
              <Text style={[styles.detailValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                {scheduledDate.toLocaleDateString()}
              </Text>
              <Text style={[styles.detailSubValue, theme.typography.caption, { color: dynamicTheme.colors.textTertiary }]}>
                {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>

          {scheduledCreate.isRecurring && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                Recurring
              </Text>
              <Text style={[styles.detailValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                {scheduledCreate.recurringInterval.charAt(0).toUpperCase() +
                  scheduledCreate.recurringInterval.slice(1)}
              </Text>
            </View>
          )}

          {scheduledCreate.description && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                Description
              </Text>
              <Text style={[styles.detailValue, theme.typography.body, styles.descriptionText, { color: dynamicTheme.colors.textPrimary }]}>
                {scheduledCreate.description}
              </Text>
            </View>
          )}
        </View>

        {/* Gas Price Warning */}
        <View style={styles.warningCard}>
          <FontAwesome name="exclamation-triangle" size={16} color="#FFA500" />
          <Text style={[styles.warningText, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
            Gas prices may change before execution. If network fees increase significantly
            (more than 50%), the transaction may fail. You can edit or cancel anytime before
            the scheduled time.
          </Text>
        </View>

        {/* Info Note */}
        <View style={[styles.infoCard, { backgroundColor: dynamicTheme.colors.buttonPrimary + '10' }]}>
          <FontAwesome name="info-circle" size={16} color={dynamicTheme.colors.buttonPrimary} />
          <Text style={[styles.infoText, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
            Your payment will be automatically executed at the scheduled time. The transaction
            is pre-signed for automatic processing.
          </Text>
        </View>

        {/* Test Account Warning */}
        {isTestAccount && <TestModeWarning />}
      </ScrollView>

      {/* Confirm Button */}
      <View style={[styles.footer, { borderTopColor: dynamicTheme.colors.buttonSecondaryBorder }]}>
        <TouchableOpacity
          style={[styles.confirmButton, { backgroundColor: dynamicTheme.colors.buttonPrimary }, isCreating && { backgroundColor: dynamicTheme.colors.textTertiary }]}
          onPress={handleConfirm}
          disabled={isCreating}
        >
          {isCreating ? (
            <View style={styles.buttonLoadingContent}>
              <ActivityIndicator size="small" color={dynamicTheme.colors.buttonPrimaryText} />
              <Text style={[styles.confirmButtonText, theme.typography.heading, { color: dynamicTheme.colors.buttonPrimaryText }]}>
                {isSigningTx ? 'Signing Transaction...' : 'Creating...'}
              </Text>
            </View>
          ) : (
            <Text style={[styles.confirmButtonText, theme.typography.heading, { color: dynamicTheme.colors.buttonPrimaryText }]}>
              Sign & Schedule Payment
            </Text>
          )}
        </TouchableOpacity>
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
  },
  content: {
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  stepIndicator: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.buttonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    marginBottom: theme.spacing.xs / 2,
  },
  summaryValue: {
    color: theme.colors.textPrimary,
  },
  summarySubValue: {
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.buttonSecondaryBorder,
    marginVertical: theme.spacing.sm,
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
    alignItems: 'flex-start',
  },
  detailLabel: {
    flex: 1,
  },
  detailValueColumn: {
    alignItems: 'flex-end',
  },
  detailValue: {
    color: theme.colors.textPrimary,
    textAlign: 'right',
  },
  detailSubValue: {
    marginTop: 2,
  },
  descriptionText: {
    flex: 2,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFA50015',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#FFA50030',
  },
  warningText: {
    flex: 1,
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.buttonPrimary + '10',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    lineHeight: 18,
  },
  buttonLoadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  footer: {
    padding: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.buttonSecondaryBorder,
  },
  confirmButton: {
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: theme.colors.textTertiary,
  },
  confirmButtonText: {
    color: theme.colors.buttonPrimaryText,
  },
});
