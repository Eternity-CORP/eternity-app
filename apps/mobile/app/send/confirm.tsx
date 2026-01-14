/**
 * Send Screen 4: Confirm Transaction
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { estimateGasThunk, sendTransactionThunk } from '@/src/store/slices/send-slice';
import { deriveWalletFromMnemonic } from '@e-y/crypto';
import { truncateAddress } from '@/src/utils/format';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function ConfirmScreen() {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const balance = useAppSelector((state) => state.balance);
  const send = useAppSelector((state) => state.send);
  const currentAccount = getCurrentAccount(wallet);

  const selectedToken = balance.balances.find((t) => t.symbol === send.selectedToken);
  const ethPrice = balance.ethUsdPrice;

  // Get the token address for send-service (contract address for ERC-20, 'ETH' for ETH)
  const tokenAddress = selectedToken?.token || 'ETH';

  // Estimate gas when screen loads
  useEffect(() => {
    if (currentAccount?.address && send.recipient && send.amount && selectedToken) {
      dispatch(estimateGasThunk({
        from: currentAccount.address,
        to: send.recipient,
        amount: send.amount,
        token: tokenAddress,
      }));
    }
  }, [currentAccount?.address, send.recipient, send.amount, tokenAddress, dispatch]);

  // Navigate to success screen when transaction is sent
  useEffect(() => {
    if (send.step === 'success' && send.txHash) {
      router.replace('/send/success');
    }
  }, [send.step, send.txHash]);

  const handleConfirm = async () => {
    if (!wallet.mnemonic || !currentAccount) return;

    const hdWallet = deriveWalletFromMnemonic(wallet.mnemonic, currentAccount.accountIndex);

    await dispatch(sendTransactionThunk({
      wallet: hdWallet,
      to: send.recipient,
      amount: send.amount,
      token: tokenAddress, // Use contract address for ERC-20, 'ETH' for ETH
    }));
  };

  const totalAmount = parseFloat(send.amount) || 0;
  const totalAmountUsd = selectedToken ? (totalAmount * (selectedToken.usdValue || 0) / parseFloat(selectedToken.balance)) : 0;
  const gasCostUsd = send.gasEstimate ? send.gasEstimate.totalGasCostUsd : 0;
  const totalCostUsd = totalAmountUsd + gasCostUsd;

  const canConfirm = send.gasEstimateStatus === 'succeeded' && send.sendStatus !== 'loading';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Confirm" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.avatar}>
              <FontAwesome name="user" size={24} color={theme.colors.buttonPrimaryText} />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={[styles.summaryLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                From
              </Text>
              <Text style={[styles.summaryValue, theme.typography.body]}>
                {currentAccount ? truncateAddress(currentAccount.address) : ''}
              </Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.success }]}>
              <FontAwesome name="user" size={24} color={theme.colors.buttonPrimaryText} />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={[styles.summaryLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                To
              </Text>
              <Text style={[styles.summaryValue, theme.typography.body]}>
                {truncateAddress(send.recipient)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
              Amount
            </Text>
            <Text style={[styles.detailValue, theme.typography.body]}>
              {send.amount} {send.selectedToken}
            </Text>
          </View>

          {send.gasEstimateStatus === 'loading' && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                Gas Fee
              </Text>
              <Text style={[styles.detailValue, theme.typography.body]}>Calculating...</Text>
            </View>
          )}

          {send.gasEstimate && (
            <>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                  Gas Fee
                </Text>
                <Text style={[styles.detailValue, theme.typography.body]}>
                  {parseFloat(send.gasEstimate.totalGasCost).toFixed(6)} ETH
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                  Gas Fee (USD)
                </Text>
                <Text style={[styles.detailValue, theme.typography.body]}>
                  ${send.gasEstimate.totalGasCostUsd.toFixed(2)}
                </Text>
              </View>
            </>
          )}

          <View style={[styles.detailRow, styles.totalRow]}>
            <Text style={[styles.detailLabel, theme.typography.heading]}>Total</Text>
            <Text style={[styles.detailValue, theme.typography.heading]}>
              ${totalCostUsd.toFixed(2)} USD
            </Text>
          </View>
        </View>

        {send.sendError && (
          <View style={styles.errorCard}>
            <Text style={[styles.errorText, theme.typography.caption, { color: theme.colors.error }]}>
              {send.sendError}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, !canConfirm && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={!canConfirm || send.sendStatus === 'loading'}
        >
          <Text style={[styles.confirmButtonText, theme.typography.heading]}>
            {send.sendStatus === 'loading' ? 'Sending...' : 'Confirm Send'}
          </Text>
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
  totalRow: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.buttonSecondaryBorder,
  },
  detailLabel: {
    // Styled inline
  },
  detailValue: {
    color: theme.colors.textPrimary,
  },
  errorCard: {
    backgroundColor: theme.colors.error + '10',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  errorText: {
    textAlign: 'center',
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
