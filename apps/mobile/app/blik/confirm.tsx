/**
 * BLIK Confirm Screen (Sender)
 * Confirm payment details, select network, and send transaction
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Modal, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import {
  senderSetNetwork,
  senderStartConfirming,
  senderPaymentConfirmed,
  senderError,
  senderReset,
} from '@/src/store/slices/blik-slice';
import { saveContactThunk } from '@/src/store/slices/contacts-slice';
import { findContactByAddress } from '@/src/services/contacts-service';
import { blikSocket } from '@/src/services/blik-service';
import { sendTransaction, estimateGas, type GasEstimate } from '@/src/services/send-service';
import { deriveWalletFromMnemonic } from '@e-y/crypto';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import { truncateAddress } from '@/src/utils/format';

// Available networks for sending
const NETWORKS = [
  { id: 'ethereum', name: 'Ethereum' },
  { id: 'polygon', name: 'Polygon' },
  { id: 'arbitrum', name: 'Arbitrum' },
  { id: 'base', name: 'Base' },
  { id: 'optimism', name: 'Optimism' },
];

// Network names for display
const NETWORK_DISPLAY_NAMES: Record<string, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
  base: 'Base',
  optimism: 'Optimism',
};

export default function BlikConfirmScreen() {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const blik = useAppSelector((state) => state.blik);
  const balance = useAppSelector((state) => state.balance);
  const currentAccount = getCurrentAccount(wallet);

  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [gasEstimateStatus, setGasEstimateStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle');
  const [showNetworkPicker, setShowNetworkPicker] = useState(false);
  const [showSaveContactModal, setShowSaveContactModal] = useState(false);
  const [contactName, setContactName] = useState('');

  const codeInfo = blik.sender.codeInfo;
  const selectedNetwork = blik.sender.selectedNetwork;

  // Redirect if no code info
  useEffect(() => {
    if (!codeInfo) {
      router.back();
    }
  }, [codeInfo]);

  // Estimate gas when screen loads
  useEffect(() => {
    if (!currentAccount?.address || !codeInfo) return;

    const fetchGasEstimate = async () => {
      setGasEstimateStatus('loading');
      try {
        // Get token address - for native tokens use 'ETH', for ERC-20 tokens use contract address
        const tokenAddress = codeInfo.tokenSymbol === 'ETH' ? 'ETH' : getTokenAddress(codeInfo.tokenSymbol);

        const estimate = await estimateGas(
          currentAccount.address,
          codeInfo.receiverAddress,
          codeInfo.amount,
          tokenAddress
        );
        setGasEstimate(estimate);
        setGasEstimateStatus('succeeded');
      } catch (error) {
        console.error('Gas estimation failed:', error);
        setGasEstimateStatus('failed');
      }
    };

    fetchGasEstimate();
  }, [currentAccount?.address, codeInfo]);

  // Handle successful payment - show save contact option
  const handlePaymentSuccess = useCallback(async () => {
    if (!codeInfo) {
      dispatch(senderReset());
      router.replace('/(tabs)/home');
      return;
    }

    // Check if contact already exists
    const existingContact = currentAccount?.address
      ? await findContactByAddress(currentAccount.address, codeInfo.receiverAddress)
      : null;

    if (existingContact) {
      // Contact already exists, just show success
      Alert.alert(
        'Payment Sent!',
        `Your payment of ${codeInfo.amount} ${codeInfo.tokenSymbol} has been sent.`,
        [{ text: 'OK', onPress: () => {
          dispatch(senderReset());
          router.replace('/(tabs)/home');
        }}]
      );
    } else {
      // Offer to save contact
      Alert.alert(
        'Payment Sent!',
        `Your payment of ${codeInfo.amount} ${codeInfo.tokenSymbol} has been sent.\n\nWould you like to save this recipient to contacts?`,
        [
          {
            text: 'No Thanks',
            style: 'cancel',
            onPress: () => {
              dispatch(senderReset());
              router.replace('/(tabs)/home');
            }
          },
          {
            text: 'Save Contact',
            onPress: () => {
              // Set default name from username
              setContactName(codeInfo.receiverUsername || '');
              setShowSaveContactModal(true);
            }
          },
        ]
      );
    }
  }, [codeInfo, dispatch]);

  // Handle save contact from modal
  const handleSaveContact = useCallback(() => {
    if (contactName.trim() && codeInfo) {
      dispatch(saveContactThunk({
        name: contactName.trim(),
        address: codeInfo.receiverAddress,
        username: codeInfo.receiverUsername,
      }));
    }
    setShowSaveContactModal(false);
    dispatch(senderReset());
    router.replace('/(tabs)/home');
  }, [contactName, codeInfo, dispatch]);

  // Handle cancel save contact
  const handleCancelSaveContact = useCallback(() => {
    setShowSaveContactModal(false);
    dispatch(senderReset());
    router.replace('/(tabs)/home');
  }, [dispatch]);

  // Set up BLIK socket callbacks
  useEffect(() => {
    blikSocket.setCallbacks({
      onPaymentAccepted: (payload) => {
        dispatch(senderPaymentConfirmed(payload.txHash));
        handlePaymentSuccess();
      },
      onCodeNotFound: (payload) => {
        dispatch(senderError(
          payload.reason === 'cancelled'
            ? 'The receiver cancelled this code'
            : 'Code is no longer valid'
        ));
      },
      onError: (error) => {
        dispatch(senderError(error.message));
      },
    });

    return () => {
      blikSocket.clearCallbacks();
    };
  }, [dispatch, codeInfo, handlePaymentSuccess]);

  const handleConfirmPayment = useCallback(async () => {
    if (!wallet.mnemonic || !currentAccount || !codeInfo) return;

    dispatch(senderStartConfirming());

    try {
      // Derive wallet for signing
      const hdWallet = deriveWalletFromMnemonic(wallet.mnemonic, currentAccount.accountIndex);

      // Get token address
      const tokenAddress = codeInfo.tokenSymbol === 'ETH' ? 'ETH' : getTokenAddress(codeInfo.tokenSymbol);

      // Send transaction
      const txHash = await sendTransaction({
        wallet: hdWallet,
        to: codeInfo.receiverAddress,
        amount: codeInfo.amount,
        token: tokenAddress,
      });

      // Notify server about payment
      blikSocket.confirmPayment({
        code: codeInfo.code,
        txHash,
        senderAddress: currentAccount.address,
        network: selectedNetwork,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Transaction failed';
      dispatch(senderError(message));
      Alert.alert('Transaction Failed', message);
    }
  }, [wallet.mnemonic, currentAccount, codeInfo, selectedNetwork, dispatch]);

  const selectedNetworkInfo = NETWORKS.find((n) => n.id === selectedNetwork) || NETWORKS[0];
  const canConfirm = gasEstimateStatus === 'succeeded' && blik.sender.status !== 'confirming';
  const isConfirming = blik.sender.status === 'confirming';

  // Check recipient's preferred network
  const recipientPreferredNetwork = codeInfo?.preferredNetwork;
  const hasNetworkMismatch = recipientPreferredNetwork && recipientPreferredNetwork !== selectedNetwork;
  const preferredNetworkName = recipientPreferredNetwork
    ? NETWORK_DISPLAY_NAMES[recipientPreferredNetwork] || recipientPreferredNetwork
    : null;

  // Check if user has sufficient balance
  const hasToken = balance.balances.some(
    (b) => b.symbol === codeInfo?.tokenSymbol && parseFloat(b.balance) >= parseFloat(codeInfo?.amount || '0')
  );
  const hasGas = balance.balances.some(
    (b) => b.symbol === 'ETH' && parseFloat(b.balance) >= parseFloat(gasEstimate?.totalGasCost || '0')
  );

  if (!codeInfo) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Confirm Payment" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Summary Card */}
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
                {codeInfo.receiverUsername || truncateAddress(codeInfo.receiverAddress)}
              </Text>
            </View>
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
              Amount
            </Text>
            <Text style={[styles.detailValue, theme.typography.body]}>
              {codeInfo.amount} {codeInfo.tokenSymbol}
            </Text>
          </View>

          {/* Network Selector */}
          <TouchableOpacity
            style={styles.detailRow}
            onPress={() => setShowNetworkPicker(!showNetworkPicker)}
          >
            <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
              Network
            </Text>
            <View style={styles.networkSelector}>
              <Text style={[styles.detailValue, theme.typography.body]}>
                {selectedNetworkInfo.name}
              </Text>
              <FontAwesome name="chevron-down" size={12} color={theme.colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {showNetworkPicker && (
            <View style={styles.networkPicker}>
              {NETWORKS.map((network) => (
                <TouchableOpacity
                  key={network.id}
                  style={[
                    styles.networkOption,
                    selectedNetwork === network.id && styles.networkOptionSelected,
                  ]}
                  onPress={() => {
                    dispatch(senderSetNetwork(network.id));
                    setShowNetworkPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.networkOptionText,
                      theme.typography.body,
                      selectedNetwork === network.id && styles.networkOptionTextSelected,
                    ]}
                  >
                    {network.name}
                  </Text>
                  {selectedNetwork === network.id && (
                    <FontAwesome name="check" size={14} color={theme.colors.buttonPrimary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {gasEstimateStatus === 'loading' && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                Gas Fee
              </Text>
              <Text style={[styles.detailValue, theme.typography.body]}>Calculating...</Text>
            </View>
          )}

          {gasEstimate && (
            <>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                  Gas Fee
                </Text>
                <Text style={[styles.detailValue, theme.typography.body]}>
                  {parseFloat(gasEstimate.totalGasCost).toFixed(6)} ETH
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                  Gas Fee (USD)
                </Text>
                <Text style={[styles.detailValue, theme.typography.body]}>
                  ${gasEstimate.totalGasCostUsd.toFixed(2)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Recipient Network Preference */}
        {recipientPreferredNetwork && (
          <View style={styles.preferenceCard}>
            <View style={styles.preferenceHeader}>
              <FontAwesome name="info-circle" size={16} color={theme.colors.buttonPrimary} />
              <Text style={[styles.preferenceTitle, theme.typography.caption]}>
                Recipient's Preference
              </Text>
            </View>
            <Text style={[styles.preferenceText, theme.typography.body]}>
              {codeInfo.receiverUsername || 'Recipient'} prefers to receive on{' '}
              <Text style={{ fontWeight: '600' }}>{preferredNetworkName}</Text>
            </Text>
            {hasNetworkMismatch && (
              <View style={styles.mismatchWarning}>
                <FontAwesome name="exchange" size={14} color={theme.colors.warning} />
                <Text style={[styles.mismatchText, theme.typography.caption, { color: theme.colors.warning }]}>
                  You're sending from {selectedNetworkInfo.name}. A bridge may be needed, which could incur additional fees.
                </Text>
              </View>
            )}
            {!hasNetworkMismatch && (
              <View style={styles.matchSuccess}>
                <FontAwesome name="check-circle" size={14} color={theme.colors.success} />
                <Text style={[styles.matchText, theme.typography.caption, { color: theme.colors.success }]}>
                  Network matches recipient's preference
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Balance Warnings */}
        {!hasToken && (
          <View style={styles.warningCard}>
            <FontAwesome name="exclamation-triangle" size={16} color={theme.colors.error} />
            <Text style={[styles.warningText, theme.typography.caption, { color: theme.colors.error }]}>
              Insufficient {codeInfo.tokenSymbol} balance
            </Text>
          </View>
        )}

        {!hasGas && gasEstimate && (
          <View style={styles.warningCard}>
            <FontAwesome name="exclamation-triangle" size={16} color={theme.colors.error} />
            <Text style={[styles.warningText, theme.typography.caption, { color: theme.colors.error }]}>
              Insufficient ETH for gas
            </Text>
          </View>
        )}

        {/* Error Display */}
        {blik.sender.error && (
          <View style={styles.errorCard}>
            <Text style={[styles.errorText, theme.typography.caption, { color: theme.colors.error }]}>
              {blik.sender.error}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (!canConfirm || !hasToken || !hasGas) && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirmPayment}
          disabled={!canConfirm || !hasToken || !hasGas || isConfirming}
        >
          <Text style={[styles.confirmButtonText, theme.typography.heading]}>
            {isConfirming ? 'Sending...' : 'Confirm & Send'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Save Contact Modal */}
      <Modal
        visible={showSaveContactModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelSaveContact}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, theme.typography.heading]}>
              Save Contact
            </Text>
            <Text style={[styles.modalSubtitle, theme.typography.caption, { color: theme.colors.textSecondary }]}>
              Enter a name for this contact
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Contact name"
              placeholderTextColor={theme.colors.textTertiary}
              value={contactName}
              onChangeText={setContactName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={handleCancelSaveContact}
              >
                <Text style={[styles.modalButtonCancelText, theme.typography.body]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonSave, !contactName.trim() && styles.modalButtonSaveDisabled]}
                onPress={handleSaveContact}
                disabled={!contactName.trim()}
              >
                <Text style={[styles.modalButtonSaveText, theme.typography.body]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

/**
 * Get token contract address by symbol
 * TODO: Move to a config or fetch from backend
 */
function getTokenAddress(symbol: string): string {
  const tokenAddresses: Record<string, string> = {
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Mainnet USDC
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // Mainnet USDT
  };
  return tokenAddresses[symbol] || 'ETH';
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
  detailLabel: {},
  detailValue: {
    color: theme.colors.textPrimary,
  },
  networkSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  networkPicker: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  networkOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  networkOptionSelected: {
    backgroundColor: theme.colors.surface,
  },
  networkOptionText: {
    color: theme.colors.textPrimary,
  },
  networkOptionTextSelected: {
    fontWeight: '600',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.error + '10',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  warningText: {},
  preferenceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.buttonPrimary + '30',
  },
  preferenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  preferenceTitle: {
    color: theme.colors.buttonPrimary,
    fontWeight: '600',
  },
  preferenceText: {
    color: theme.colors.textPrimary,
  },
  mismatchWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.warning + '15',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  mismatchText: {
    flex: 1,
  },
  matchSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  matchText: {},
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  modalSubtitle: {
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.buttonSecondaryBorder,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    color: theme.colors.textPrimary,
  },
  modalButtonSave: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.buttonPrimary,
    alignItems: 'center',
  },
  modalButtonSaveDisabled: {
    backgroundColor: theme.colors.textTertiary,
  },
  modalButtonSaveText: {
    color: theme.colors.buttonPrimaryText,
  },
});
