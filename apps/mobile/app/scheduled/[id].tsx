/**
 * Scheduled Payment Details Screen
 * View, edit, or cancel a scheduled payment
 */

import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import {
  loadScheduledPaymentsThunk,
  cancelScheduledPaymentThunk,
  deleteScheduledPaymentThunk,
  updateScheduledPaymentThunk,
} from '@/src/store/slices/scheduled-slice';
import { setSelectedToken, setRecipient, setAmount, setStep, setScheduledPaymentContext } from '@/src/store/slices/send-slice';
import { getScheduledPayment, type ScheduledPayment, updateScheduledPayment } from '@/src/services/scheduled-payment-service';
import { truncateAddress } from '@/src/utils/format';
import { validateAddress } from '@/src/services/send-service';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import { loadWallet, getWalletFromMnemonic } from '@/src/services/wallet-service';
import { signScheduledTransaction } from '@/src/services/scheduled-signing';
import { TIER1_NETWORK_IDS, type NetworkId } from '@/src/constants/networks';
import { TESTNET_NETWORK_IDS, type TestnetNetworkId } from '@/src/constants/networks-testnet';
import type { AnyNetworkId } from '@/src/services/network-service';

export default function ScheduledPaymentDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const balance = useAppSelector((state) => state.balance);
  const currentAccount = getCurrentAccount(wallet);

  const [payment, setPayment] = useState<ScheduledPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit modal state
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editedAmount, setEditedAmount] = useState('');
  const [editedRecipient, setEditedRecipient] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load payment details
  useEffect(() => {
    async function loadPayment() {
      if (!id) return;
      setLoading(true);
      const data = await getScheduledPayment(id);
      setPayment(data);
      setLoading(false);
    }
    loadPayment();
  }, [id]);

  const handleCancel = async () => {
    if (!payment) return;

    Alert.alert(
      'Cancel Payment',
      'Are you sure you want to cancel this scheduled payment?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await dispatch(cancelScheduledPaymentThunk({ id: payment.id, walletAddress: currentAccount?.address || '' })).unwrap();
              if (currentAccount?.address) {
                dispatch(loadScheduledPaymentsThunk(currentAccount.address));
              }
              router.back();
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to cancel payment';
              Alert.alert('Error', message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDelete = async () => {
    if (!payment) return;

    Alert.alert(
      'Delete Payment',
      'Are you sure you want to delete this scheduled payment permanently?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await dispatch(deleteScheduledPaymentThunk({ id: payment.id, walletAddress: currentAccount?.address || '' })).unwrap();
              if (currentAccount?.address) {
                dispatch(loadScheduledPaymentsThunk(currentAccount.address));
              }
              router.back();
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to delete payment';
              Alert.alert('Error', message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handlePayNow = () => {
    if (!payment) return;

    // Pre-fill send flow with scheduled payment context
    dispatch(setSelectedToken(payment.tokenSymbol));
    dispatch(setRecipient(payment.recipient));
    dispatch(setAmount(payment.amount));
    dispatch(setScheduledPaymentContext(payment.id));
    dispatch(setStep('confirm'));
    router.push('/send/confirm');
  };

  const handleOpenEdit = () => {
    if (!payment) return;
    setEditedAmount(payment.amount);
    setEditedRecipient(payment.recipient);
    setIsEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!payment || !currentAccount?.address) return;

    const amountChanged = editedAmount !== payment.amount;
    const recipientChanged = editedRecipient.toLowerCase() !== payment.recipient.toLowerCase();

    // Validate recipient address if changed
    if (recipientChanged && !validateAddress(editedRecipient)) {
      Alert.alert('Invalid Address', 'Please enter a valid Ethereum address');
      return;
    }

    // No changes - just close
    if (!amountChanged && !recipientChanged) {
      setIsEditModalVisible(false);
      return;
    }

    setIsSaving(true);

    try {
      // Amount or recipient changed - need to re-sign the transaction
      const walletData = await loadWallet();
      if (!walletData?.mnemonic) {
        throw new Error('Unable to access wallet for signing');
      }

      const signingWallet = getWalletFromMnemonic(walletData.mnemonic, currentAccount.accountIndex);

      // Determine network and token info
      const accountType = currentAccount.type || 'test';
      const defaultNetwork: AnyNetworkId = accountType === 'test'
        ? TESTNET_NETWORK_IDS[0]
        : TIER1_NETWORK_IDS[0];

      const isNativeToken = payment.tokenSymbol === 'ETH' ||
        payment.tokenSymbol === 'MATIC' ||
        payment.tokenSymbol === 'POL';

      // Get token info from aggregated balances
      const aggregatedToken = balance.aggregatedBalances.find(
        (t) => t.symbol.toUpperCase() === payment.tokenSymbol.toUpperCase()
      );

      let networkId: AnyNetworkId = payment.chainId
        ? (payment.chainId as unknown as AnyNetworkId)
        : defaultNetwork;
      let tokenAddress: string | null = null;
      let decimals = 18;

      if (!isNativeToken && aggregatedToken && aggregatedToken.networks.length > 0) {
        const networkData = aggregatedToken.networks[0];
        networkId = networkData.networkId;
        tokenAddress = networkData.contractAddress;
        decimals = aggregatedToken.decimals;
      }

      // Re-sign the transaction with new amount/recipient
      const signedData = await signScheduledTransaction({
        privateKey: signingWallet.privateKey,
        recipient: editedRecipient,
        amount: editedAmount,
        tokenAddress,
        networkId,
        accountType,
        decimals,
      });

      // Build update payload
      const updatePayload: Parameters<typeof updateScheduledPayment>[1] = {
        signedTransaction: signedData.signedTransaction,
        estimatedGasPrice: signedData.estimatedGasPrice,
        nonce: signedData.nonce,
        chainId: signedData.chainId,
      };

      if (amountChanged) {
        updatePayload.amount = editedAmount;
      }
      if (recipientChanged) {
        updatePayload.recipient = editedRecipient;
      }

      // Update payment with new data and signed transaction
      const updated = await updateScheduledPayment(
        payment.id,
        updatePayload,
        currentAccount.address
      );

      if (updated) {
        setPayment(updated);
        dispatch(loadScheduledPaymentsThunk(currentAccount.address));
      }

      setIsEditModalVisible(false);
      Alert.alert('Success', 'Payment updated and re-signed successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update payment';
      Alert.alert('Error', message);
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Scheduled Payment" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.buttonPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  // Not found state
  if (!payment) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Scheduled Payment" />
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-triangle" size={48} color={theme.colors.error} />
          <Text style={[styles.errorText, theme.typography.heading, { color: theme.colors.textPrimary }]}>
            Payment not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const recipientDisplay = payment.recipientUsername
    ? payment.recipientUsername
    : payment.recipientName
      ? payment.recipientName
      : truncateAddress(payment.recipient);

  const scheduledDate = new Date(payment.scheduledAt);
  const isPast = scheduledDate.getTime() < Date.now();
  const isCancelled = payment.status === 'cancelled';
  const isExecuted = payment.status === 'executed';

  const getStatusColor = () => {
    if (isExecuted) return theme.colors.success;
    if (isCancelled) return theme.colors.error;
    if (isPast) return '#FFA500';
    return theme.colors.buttonPrimary;
  };

  const getStatusText = () => {
    if (isExecuted) return 'Executed';
    if (isCancelled) return 'Cancelled';
    if (isPast) return 'Overdue';
    return 'Pending';
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Scheduled Payment" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Status Badge */}
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={[styles.statusText, theme.typography.caption, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>
        </View>

        {/* Amount Section */}
        <View style={styles.amountSection}>
          <Text style={[styles.amountText, theme.typography.displayLarge]}>
            {payment.amount} {payment.tokenSymbol}
          </Text>
          {payment.recurringInterval && (
            <View style={styles.recurringBadge}>
              <FontAwesome name="refresh" size={12} color={theme.colors.buttonPrimary} />
              <Text style={[styles.recurringText, theme.typography.caption, { color: theme.colors.buttonPrimary }]}>
                {payment.recurringInterval.charAt(0).toUpperCase() + payment.recurringInterval.slice(1)}
              </Text>
            </View>
          )}
        </View>

        {/* Details Card */}
        <View style={styles.card}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
              To
            </Text>
            <View style={styles.detailValue}>
              <Text style={[styles.detailText, theme.typography.body]}>
                {recipientDisplay}
              </Text>
            </View>
          </View>

          {payment.recipientUsername && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                Address
              </Text>
              <Text style={[styles.detailText, theme.typography.body]}>
                {truncateAddress(payment.recipient)}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
              Scheduled
            </Text>
            <Text style={[styles.detailText, theme.typography.body]}>
              {scheduledDate.toLocaleDateString()} at {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          {payment.description && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                Note
              </Text>
              <Text style={[styles.detailText, theme.typography.body]}>
                {payment.description}
              </Text>
            </View>
          )}

          {payment.executedTxHash && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                TX Hash
              </Text>
              <Text style={[styles.detailText, theme.typography.body]}>
                {truncateAddress(payment.executedTxHash)}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
              Created
            </Text>
            <Text style={[styles.detailText, theme.typography.body]}>
              {new Date(payment.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Actions */}
        {payment.status === 'pending' && (
          <View style={styles.actionsSection}>
            {/* Pay Now Button */}
            {isPast && (
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={handlePayNow}
              >
                <FontAwesome name="send" size={16} color={theme.colors.buttonPrimaryText} />
                <Text style={[styles.actionButtonText, theme.typography.heading, { color: theme.colors.buttonPrimaryText }]}>
                  Pay Now
                </Text>
              </TouchableOpacity>
            )}

            {/* Edit Button */}
            {!isPast && (
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={handleOpenEdit}
              >
                <FontAwesome name="pencil" size={16} color={theme.colors.buttonPrimary} />
                <Text style={[styles.actionButtonText, theme.typography.heading, { color: theme.colors.buttonPrimary }]}>
                  Edit Payment
                </Text>
              </TouchableOpacity>
            )}

            {/* Cancel Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleCancel}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={theme.colors.error} />
              ) : (
                <>
                  <FontAwesome name="times" size={16} color={theme.colors.error} />
                  <Text style={[styles.actionButtonText, theme.typography.heading, { color: theme.colors.error }]}>
                    Cancel Payment
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Delete for cancelled/executed payments */}
        {(isCancelled || isExecuted) && (
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleDelete}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color={theme.colors.error} />
              ) : (
                <>
                  <FontAwesome name="trash" size={16} color={theme.colors.error} />
                  <Text style={[styles.actionButtonText, theme.typography.heading, { color: theme.colors.error }]}>
                    Delete
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafeArea}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
              <Text style={[styles.modalCancel, theme.typography.body, { color: theme.colors.buttonPrimary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, theme.typography.heading]}>Edit Payment</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator size="small" color={theme.colors.buttonPrimary} />
              ) : (
                <Text style={[styles.modalSave, theme.typography.body, { color: theme.colors.buttonPrimary }]}>
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalContent}>
            {/* Warning about re-signing */}
            <View style={styles.warningCard}>
              <FontAwesome name="exclamation-triangle" size={16} color="#FFA500" />
              <Text style={[styles.warningText, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                Changing the amount or recipient requires re-signing the transaction. Current gas prices will be used.
              </Text>
            </View>

            {/* Recipient Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                Recipient Address
              </Text>
              <TextInput
                style={[styles.input, styles.addressInput, theme.typography.body]}
                value={editedRecipient}
                onChangeText={setEditedRecipient}
                placeholder="0x..."
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {editedRecipient && !validateAddress(editedRecipient) && (
                <Text style={[styles.errorLabel, theme.typography.caption]}>
                  Invalid address format
                </Text>
              )}
            </View>

            {/* Amount Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                Amount ({payment?.tokenSymbol})
              </Text>
              <TextInput
                style={[styles.input, theme.typography.body]}
                value={editedAmount}
                onChangeText={setEditedAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.colors.textTertiary}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  errorText: {
    textAlign: 'center',
  },
  // Status
  statusSection: {
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
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
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Amount
  amountSection: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  amountText: {
    color: theme.colors.textPrimary,
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.buttonPrimary + '20',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  recurringText: {
    fontWeight: '600',
  },
  // Card
  card: {
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
    flex: 0.3,
  },
  detailValue: {
    flex: 0.7,
    alignItems: 'flex-end',
  },
  detailText: {
    color: theme.colors.textPrimary,
    textAlign: 'right',
    flex: 0.7,
  },
  // Actions
  actionsSection: {
    gap: theme.spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  primaryButton: {
    backgroundColor: theme.colors.buttonPrimary,
  },
  secondaryButton: {
    backgroundColor: theme.colors.buttonPrimary + '10',
    borderWidth: 1,
    borderColor: theme.colors.buttonPrimary,
  },
  dangerButton: {
    backgroundColor: theme.colors.error + '10',
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  actionButtonText: {
    // Color set inline
  },
  // Modal styles
  modalSafeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.buttonSecondaryBorder,
  },
  modalTitle: {
    color: theme.colors.textPrimary,
  },
  modalCancel: {
    minWidth: 60,
  },
  modalSave: {
    minWidth: 60,
    textAlign: 'right',
    fontWeight: '600',
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
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
  inputGroup: {
    gap: theme.spacing.sm,
  },
  inputLabel: {
    marginLeft: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: 18,
  },
  addressInput: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  errorLabel: {
    color: theme.colors.error,
    marginLeft: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
});
