/**
 * BLIK Confirm Screen (Sender)
 * Confirm payment details, select network, and send transaction
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Modal, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount, selectIsTestAccount } from '@/src/store/slices/wallet-slice';
import { TestModeWarning } from '@/src/components/TestModeWarning';
import {
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
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import { truncateAddress } from '@/src/utils/format';
import { getNetworkByChainId, getRpcUrl } from '@/src/constants/networks';
import { getNetworkLabel } from '@e-y/shared';
import { JsonRpcProvider } from 'ethers';

export default function BlikConfirmScreen() {
  const { theme: dynamicTheme } = useTheme();
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const blik = useAppSelector((state) => state.blik);
  const balance = useAppSelector((state) => state.balance);
  const currentAccount = getCurrentAccount(wallet);
  const isTestAccount = useAppSelector(selectIsTestAccount);

  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [gasEstimateStatus, setGasEstimateStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle');
  const [showSaveContactModal, setShowSaveContactModal] = useState(false);
  const [contactName, setContactName] = useState('');

  const codeInfo = blik.sender.codeInfo;

  // Derive network info from the code's chainId
  const codeNetwork = codeInfo?.chainId ? getNetworkByChainId(codeInfo.chainId) : undefined;
  const networkDisplayName = getNetworkLabel(codeInfo?.chainId) ?? `Chain ${codeInfo?.chainId ?? ''}`;

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

      // Build a provider for the code's specific network
      let connectedWallet = hdWallet;
      if (codeInfo.chainId && codeNetwork) {
        const rpcUrl = getRpcUrl(codeNetwork.id);
        const chainProvider = new JsonRpcProvider(rpcUrl);
        connectedWallet = hdWallet.connect(chainProvider) as typeof hdWallet;
      }

      // Send transaction
      const txHash = await sendTransaction({
        wallet: connectedWallet,
        to: codeInfo.receiverAddress,
        amount: codeInfo.amount,
        token: tokenAddress,
      });

      // Notify server about payment
      blikSocket.confirmPayment({
        code: codeInfo.code,
        txHash,
        senderAddress: currentAccount.address,
        network: codeNetwork?.name ?? 'sepolia',
        chainId: codeInfo.chainId,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Transaction failed';
      dispatch(senderError(message));
      Alert.alert('Transaction Failed', message);
    }
  }, [wallet.mnemonic, currentAccount, codeInfo, codeNetwork, dispatch]);

  const canConfirm = gasEstimateStatus === 'succeeded' && blik.sender.status !== 'confirming';
  const isConfirming = blik.sender.status === 'confirming';

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Confirm Payment" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

          <View style={styles.summaryRow}>
            <View style={[styles.avatar, { backgroundColor: dynamicTheme.colors.success }]}>
              <FontAwesome name="user" size={24} color={dynamicTheme.colors.buttonPrimaryText} />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={[styles.summaryLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                To
              </Text>
              <Text style={[styles.summaryValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                {codeInfo.receiverUsername || truncateAddress(codeInfo.receiverAddress)}
              </Text>
            </View>
          </View>
        </View>

        {/* Details Card */}
        <View style={[styles.detailsCard, { backgroundColor: dynamicTheme.colors.surface }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
              Amount
            </Text>
            <Text style={[styles.detailValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
              {codeInfo.amount} {codeInfo.tokenSymbol}
            </Text>
          </View>

          {/* Network — read-only, derived from code's chainId */}
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
              Network
            </Text>
            <View style={styles.networkBadge}>
              {codeNetwork && (
                <View style={[styles.networkDot, { backgroundColor: codeNetwork.color }]} />
              )}
              <Text style={[styles.detailValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                {networkDisplayName}
              </Text>
            </View>
          </View>

          {gasEstimateStatus === 'loading' && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                Gas Fee
              </Text>
              <Text style={[styles.detailValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>Calculating...</Text>
            </View>
          )}

          {gasEstimate && (
            <>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                  Gas Fee
                </Text>
                <Text style={[styles.detailValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                  {parseFloat(gasEstimate.totalGasCost).toFixed(6)} ETH
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                  Gas Fee (USD)
                </Text>
                <Text style={[styles.detailValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                  ${gasEstimate.totalGasCostUsd.toFixed(2)}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Balance Warnings */}
        {!hasToken && (
          <View style={[styles.warningCard, { backgroundColor: dynamicTheme.colors.error + '10' }]}>
            <FontAwesome name="exclamation-triangle" size={16} color={dynamicTheme.colors.error} />
            <Text style={[styles.warningText, theme.typography.caption, { color: dynamicTheme.colors.error }]}>
              Insufficient {codeInfo.tokenSymbol} balance
            </Text>
          </View>
        )}

        {!hasGas && gasEstimate && (
          <View style={[styles.warningCard, { backgroundColor: dynamicTheme.colors.error + '10' }]}>
            <FontAwesome name="exclamation-triangle" size={16} color={dynamicTheme.colors.error} />
            <Text style={[styles.warningText, theme.typography.caption, { color: dynamicTheme.colors.error }]}>
              Insufficient ETH for gas
            </Text>
          </View>
        )}

        {/* Error Display */}
        {blik.sender.error && (
          <View style={[styles.errorCard, { backgroundColor: dynamicTheme.colors.error + '10' }]}>
            <Text style={[styles.errorText, theme.typography.caption, { color: dynamicTheme.colors.error }]}>
              {blik.sender.error}
            </Text>
          </View>
        )}

        {/* Test Account Warning */}
        {isTestAccount && <TestModeWarning />}
      </ScrollView>

      {/* Confirm Button */}
      <View style={[styles.footer, { borderTopColor: dynamicTheme.colors.buttonSecondaryBorder }]}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            { backgroundColor: dynamicTheme.colors.buttonPrimary },
            (!canConfirm || !hasToken || !hasGas) && { backgroundColor: dynamicTheme.colors.textTertiary },
          ]}
          onPress={handleConfirmPayment}
          disabled={!canConfirm || !hasToken || !hasGas || isConfirming}
        >
          <Text style={[styles.confirmButtonText, theme.typography.heading, { color: dynamicTheme.colors.buttonPrimaryText }]}>
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
          <View style={[styles.modalContent, { backgroundColor: dynamicTheme.colors.surface }]}>
            <Text style={[styles.modalTitle, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>
              Save Contact
            </Text>
            <Text style={[styles.modalSubtitle, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
              Enter a name for this contact
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: dynamicTheme.colors.background, color: dynamicTheme.colors.textPrimary }]}
              placeholder="Contact name"
              placeholderTextColor={dynamicTheme.colors.textTertiary}
              value={contactName}
              onChangeText={setContactName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButtonCancel, { borderColor: dynamicTheme.colors.buttonSecondaryBorder }]}
                onPress={handleCancelSaveContact}
              >
                <Text style={[styles.modalButtonCancelText, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonSave, { backgroundColor: dynamicTheme.colors.buttonPrimary }, !contactName.trim() && { backgroundColor: dynamicTheme.colors.textTertiary }]}
                onPress={handleSaveContact}
                disabled={!contactName.trim()}
              >
                <Text style={[styles.modalButtonSaveText, theme.typography.body, { color: dynamicTheme.colors.buttonPrimaryText }]}>
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
 * Get token contract address by symbol.
 * Returns 'ETH' as a fallback for unknown ERC-20 symbols.
 * TODO: Replace with network-aware lookup once confirm screen carries networkId.
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
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
