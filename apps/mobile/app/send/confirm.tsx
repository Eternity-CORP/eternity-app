/**
 * Send Screen 4: Confirm Transaction
 * Shows network routing, bridge costs, and alternatives
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import {
  estimateGasThunk,
  sendTransactionThunk,
  calculateRouteThunk,
  selectAlternativeRoute,
  type TransferRoute,
} from '@/src/store/slices/send-slice';
import { loadContactsThunk, saveContactThunk, touchContactThunk } from '@/src/store/slices/contacts-slice';
import { deriveWalletFromMnemonic } from '@e-y/crypto';
import { truncateAddress } from '@/src/utils/format';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import { SUPPORTED_NETWORKS } from '@/src/constants/networks';

// Helper functions for formatting
function formatFee(fee: number): string {
  if (fee < 0.01) return '<$0.01';
  return `~$${fee.toFixed(2)}`;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hr`;
  return `${Math.round(seconds / 86400)} days`;
}

export default function ConfirmScreen() {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const balance = useAppSelector((state) => state.balance);
  const send = useAppSelector((state) => state.send);
  const contacts = useAppSelector((state) => state.contacts.contacts);
  const currentAccount = getCurrentAccount(wallet);

  // Contact-related state
  const [showSaveContact, setShowSaveContact] = useState(false);
  const [contactName, setContactName] = useState('');

  const selectedToken = balance.balances.find((t) => t.symbol === send.selectedToken);

  // Get the token address for send-service (contract address for ERC-20, 'ETH' for ETH)
  const tokenAddress = selectedToken?.token || 'ETH';

  // Find existing contact for this recipient
  const existingContact = contacts.find(
    c => c.address.toLowerCase() === send.recipient.toLowerCase()
  );

  // Get the active route (primary or selected alternative)
  const activeRoute: TransferRoute | null =
    send.selectedAlternativeIndex !== null
      ? send.alternativeRoutes[send.selectedAlternativeIndex]?.route ?? null
      : send.transferRoute;

  // Load contacts on mount
  useEffect(() => {
    dispatch(loadContactsThunk());
  }, [dispatch]);

  // Calculate route when screen loads
  useEffect(() => {
    if (send.amount && selectedToken) {
      const amountNum = parseFloat(send.amount);
      const tokenUsdPrice = (selectedToken.usdValue ?? 0) / parseFloat(selectedToken.balance);
      const amountUsdValue = amountNum * tokenUsdPrice;

      dispatch(calculateRouteThunk({
        symbol: send.selectedToken,
        amount: amountNum,
        recipientPreference: send.recipientPreference,
        amountUsdValue,
      }));
    }
  }, [send.amount, send.selectedToken, send.recipientPreference, selectedToken, dispatch]);

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

    // Touch contact to update lastUsedAt if exists
    if (existingContact) {
      dispatch(touchContactThunk(send.recipient));
    }

    await dispatch(sendTransactionThunk({
      wallet: hdWallet,
      to: send.recipient,
      amount: send.amount,
      token: tokenAddress,
    }));
  };

  const handleSaveContact = useCallback(async () => {
    if (!contactName.trim()) {
      Alert.alert('Error', 'Please enter a contact name');
      return;
    }

    try {
      await dispatch(saveContactThunk({
        name: contactName.trim(),
        address: send.recipient,
      }));
      setShowSaveContact(false);
      setContactName('');
      Alert.alert('Saved', 'Contact saved successfully');
    } catch {
      Alert.alert('Error', 'Failed to save contact');
    }
  }, [contactName, send.recipient, dispatch]);

  const totalAmount = parseFloat(send.amount) || 0;
  const totalAmountUsd = selectedToken ? (totalAmount * (selectedToken.usdValue || 0) / parseFloat(selectedToken.balance)) : 0;
  const gasCostUsd = send.gasEstimate ? send.gasEstimate.totalGasCostUsd : 0;
  const bridgeCostUsd = activeRoute?.totalBridgeFee ?? 0;
  const totalFeeUsd = gasCostUsd + bridgeCostUsd;
  const totalCostUsd = totalAmountUsd + totalFeeUsd;

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
              {existingContact ? (
                <>
                  <Text style={[styles.summaryValue, theme.typography.body]}>
                    {existingContact.name}
                  </Text>
                  <Text style={[styles.summarySubValue, theme.typography.caption, { color: theme.colors.textTertiary }]}>
                    {truncateAddress(send.recipient)}
                  </Text>
                </>
              ) : (
                <Text style={[styles.summaryValue, theme.typography.body]}>
                  {truncateAddress(send.recipient)}
                </Text>
              )}
            </View>
            {!existingContact && !showSaveContact && (
              <TouchableOpacity
                style={styles.saveContactButton}
                onPress={() => setShowSaveContact(true)}
              >
                <FontAwesome name="user-plus" size={16} color={theme.colors.buttonPrimary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Save Contact Input */}
          {showSaveContact && (
            <View style={styles.saveContactContainer}>
              <TextInput
                style={[styles.saveContactInput, theme.typography.body]}
                placeholder="Contact name"
                placeholderTextColor={theme.colors.textTertiary}
                value={contactName}
                onChangeText={setContactName}
                autoFocus
              />
              <View style={styles.saveContactActions}>
                <TouchableOpacity
                  style={styles.saveContactCancel}
                  onPress={() => {
                    setShowSaveContact(false);
                    setContactName('');
                  }}
                >
                  <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveContactSave}
                  onPress={handleSaveContact}
                >
                  <Text style={[theme.typography.caption, { color: theme.colors.buttonPrimaryText }]}>
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Network Routing Card */}
        {activeRoute && activeRoute.type !== 'direct' && (
          <View style={styles.routingCard}>
            {/* Recipient Preference */}
            {send.recipientPreference && (
              <View style={styles.routingRow}>
                <FontAwesome name="star" size={14} color={theme.colors.warning} />
                <Text style={[styles.routingText, theme.typography.caption]}>
                  Recipient prefers {SUPPORTED_NETWORKS[send.recipientPreference]?.name}
                </Text>
              </View>
            )}

            {/* Bridge Info */}
            {activeRoute.type === 'bridge' && (
              <View style={styles.routingRow}>
                <FontAwesome name="exchange" size={14} color={theme.colors.buttonPrimary} />
                <Text style={[styles.routingText, theme.typography.caption]}>
                  Converting via bridge (~{formatTime(activeRoute.estimatedTime)})
                </Text>
              </View>
            )}

            {/* Consolidation Warning */}
            {activeRoute.type === 'consolidate' && (
              <View style={styles.routingRow}>
                <FontAwesome name="object-group" size={14} color={theme.colors.warning} />
                <Text style={[styles.routingText, theme.typography.caption]}>
                  Collecting from {activeRoute.steps.length} networks
                </Text>
              </View>
            )}

            {/* Expensive Bridge Warning */}
            {activeRoute.warnings.includes('expensive_bridge') && (
              <View style={[styles.routingRow, styles.warningRow]}>
                <FontAwesome name="exclamation-triangle" size={14} color={theme.colors.error} />
                <Text style={[styles.routingText, theme.typography.caption, { color: theme.colors.error }]}>
                  High bridge fee ({formatFee(activeRoute.totalBridgeFee)})
                </Text>
              </View>
            )}

            {/* Bridge Cost */}
            {activeRoute.totalBridgeFee > 0 && (
              <View style={styles.routingRow}>
                <FontAwesome name="dollar" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.routingText, theme.typography.caption]}>
                  Bridge fee: {formatFee(activeRoute.totalBridgeFee)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Alternative Routes */}
        {send.alternativeRoutes.length > 0 && (
          <View style={styles.alternativesCard}>
            <Text style={[styles.alternativesTitle, theme.typography.caption]}>
              Alternatives
            </Text>
            {send.alternativeRoutes.map((alt, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.alternativeOption,
                  send.selectedAlternativeIndex === index && styles.alternativeSelected,
                ]}
                onPress={() => dispatch(selectAlternativeRoute(
                  send.selectedAlternativeIndex === index ? null : index
                ))}
              >
                <View style={styles.alternativeInfo}>
                  <Text style={[styles.alternativeText, theme.typography.body]}>
                    {alt.description}
                  </Text>
                  {alt.savings > 0 && (
                    <Text style={[styles.savingsText, theme.typography.caption]}>
                      Save {formatFee(alt.savings)}
                    </Text>
                  )}
                </View>
                <FontAwesome
                  name={send.selectedAlternativeIndex === index ? 'check-circle' : 'circle-o'}
                  size={20}
                  color={send.selectedAlternativeIndex === index
                    ? theme.colors.success
                    : theme.colors.textTertiary
                  }
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

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
                  Network Fee
                </Text>
                <Text style={[styles.detailValue, theme.typography.body]}>
                  ${send.gasEstimate.totalGasCostUsd.toFixed(2)}
                </Text>
              </View>
            </>
          )}

          {bridgeCostUsd > 0 && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                Bridge Fee
              </Text>
              <Text style={[styles.detailValue, theme.typography.body]}>
                ${bridgeCostUsd.toFixed(2)}
              </Text>
            </View>
          )}

          {totalFeeUsd > 0 && bridgeCostUsd > 0 && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                Total Fees
              </Text>
              <Text style={[styles.detailValue, theme.typography.body]}>
                ${totalFeeUsd.toFixed(2)}
              </Text>
            </View>
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
  summarySubValue: {
    marginTop: 2,
  },
  saveContactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.buttonPrimary,
  },
  saveContactContainer: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.buttonSecondaryBorder,
  },
  saveContactInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
  },
  saveContactActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  saveContactCancel: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  saveContactSave: {
    backgroundColor: theme.colors.buttonPrimary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.sm,
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
  // Routing Card Styles
  routingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.buttonPrimary + '30',
  },
  routingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  routingText: {
    color: theme.colors.textSecondary,
    flex: 1,
  },
  warningRow: {
    backgroundColor: theme.colors.error + '10',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginVertical: theme.spacing.xs,
  },
  // Alternatives Styles
  alternativesCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  alternativesTitle: {
    color: theme.colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  alternativeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.md,
  },
  alternativeSelected: {
    backgroundColor: theme.colors.success + '15',
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  alternativeInfo: {
    flex: 1,
  },
  alternativeText: {
    color: theme.colors.textPrimary,
  },
  savingsText: {
    color: theme.colors.success,
    marginTop: 2,
  },
});
