/**
 * Send Screen 4: Confirm Transaction
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount, selectIsTestAccount } from '@/src/store/slices/wallet-slice';
import { selectAggregatedBalances } from '@/src/store/slices/balance-slice';
import { TestModeWarning } from '@/src/components/TestModeWarning';
import { estimateGasThunk, sendTransactionThunk, executeSmartSendThunk } from '@/src/store/slices/send-slice';
import { resetBridge } from '@/src/store/slices/bridge-slice';
import { loadContactsThunk, saveContactThunk, touchContactThunk } from '@/src/store/slices/contacts-slice';
import { deriveWalletFromMnemonic } from '@e-y/crypto';
import { truncateAddress } from '@/src/utils/format';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { BridgeCostBanner, ConsolidationBanner } from '@/src/components';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import {
  calculateTransferRoute,
  getRouteTotalFees,
  type RoutingResult,
} from '@/src/services/routing-service';
import type { NetworkId } from '@/src/constants/networks';

export default function ConfirmScreen() {
  const { theme: dynamicTheme } = useTheme();
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const balance = useAppSelector((state) => state.balance);
  const send = useAppSelector((state) => state.send);
  const contacts = useAppSelector((state) => state.contacts.contacts);
  const currentAccount = getCurrentAccount(wallet);
  const isTestAccount = useAppSelector(selectIsTestAccount);

  // Contact-related state
  const [showSaveContact, setShowSaveContact] = useState(false);
  const [contactName, setContactName] = useState('');

  // Routing state for bridge/consolidation
  const [routingResult, setRoutingResult] = useState<RoutingResult | null>(null);
  const [routingStatus, setRoutingStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const aggregatedBalances = useAppSelector(selectAggregatedBalances);

  const selectedToken = balance.balances.find((t) => t.symbol === send.selectedToken);

  // Get the token address for send-service (contract address for ERC-20, 'ETH' for ETH)
  const tokenAddress = selectedToken?.token || 'ETH';

  // Find existing contact for this recipient
  const existingContact = contacts.find(
    c => c.address.toLowerCase() === send.recipient.toLowerCase()
  );

  // Get recipient's preferred network for the selected token
  const recipientPreferredNetwork = useMemo(() => {
    if (!send.recipientPreferences) return null;

    // Priority: token override > default network > null
    const override = send.recipientPreferences.tokenOverrides[send.selectedToken?.toUpperCase() || ''];
    if (override) return override;
    return send.recipientPreferences.defaultNetwork;
  }, [send.recipientPreferences, send.selectedToken]);

  // Load contacts on mount
  useEffect(() => {
    dispatch(loadContactsThunk());
  }, [dispatch]);

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

  // Calculate transfer route for cross-network sends
  useEffect(() => {
    async function calculateRoute() {
      if (!currentAccount?.address || !send.recipient || !send.amount || !send.selectedToken) {
        return;
      }

      setRoutingStatus('loading');
      try {
        const result = await calculateTransferRoute(
          aggregatedBalances,
          send.selectedToken,
          send.amount,
          recipientPreferredNetwork,
          currentAccount.address,
          send.recipient
        );
        setRoutingResult(result);
      } catch (error) {
        console.error('Failed to calculate route:', error);
        // Don't block the send if routing fails
        setRoutingResult(null);
      } finally {
        setRoutingStatus('done');
      }
    }
    calculateRoute();
  }, [currentAccount?.address, send.recipient, send.amount, send.selectedToken, aggregatedBalances, recipientPreferredNetwork]);

  // Navigate to success screen when transaction is sent
  useEffect(() => {
    if (send.step === 'success' && send.txHash) {
      router.replace('/send/success');
    }
  }, [send.step, send.txHash]);

  // Cleanup bridge state when unmounting
  useEffect(() => {
    return () => {
      dispatch(resetBridge());
    };
  }, [dispatch]);

  const handleConfirm = useCallback(async () => {
    if (!wallet.mnemonic || !currentAccount) return;

    const hdWallet = deriveWalletFromMnemonic(wallet.mnemonic, currentAccount.accountIndex);

    // Touch contact to update lastUsedAt if exists
    if (existingContact) {
      dispatch(touchContactThunk(send.recipient));
    }

    // Check if bridge/consolidation is needed
    const route = routingResult?.route;
    const needsBridge = route && (route.type === 'bridge' || route.type === 'consolidation');

    if (needsBridge) {
      // Navigate to bridging screen first
      router.push('/send/bridging');

      // Execute smart send with bridge
      await dispatch(executeSmartSendThunk({
        wallet: hdWallet,
        route,
        recipient: send.recipient,
        amount: send.amount,
        token: tokenAddress,
      }));
    } else {
      // Direct send - use existing flow
      await dispatch(sendTransactionThunk({
        wallet: hdWallet,
        to: send.recipient,
        amount: send.amount,
        token: tokenAddress,
      }));
    }
  }, [wallet.mnemonic, currentAccount, existingContact, dispatch, send.recipient, send.amount, tokenAddress, routingResult]);

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

  // Handler for sending without bridge (alternative network)
  const handleSendAlternative = useCallback(() => {
    const alternativeNetwork = routingResult?.route?.alternative?.network;
    if (!alternativeNetwork) return;

    Alert.alert(
      'Send Without Bridging',
      `You can send to the recipient on ${alternativeNetwork} without conversion fees. The recipient will receive the tokens on that network.`,
      [{ text: 'OK' }]
    );
  }, [routingResult]);

  // Handler for sending max from a single network (consolidation alternative)
  const handleSendMax = useCallback((maxAmount: string, network: NetworkId) => {
    Alert.alert(
      'Send Maximum',
      `Sending ${maxAmount} ${send.selectedToken} from ${network} (no consolidation fee)`,
      [{ text: 'OK' }]
    );
  }, [send.selectedToken]);

  const totalAmount = parseFloat(send.amount) || 0;
  const tokenBalance = parseFloat(selectedToken?.balance || '0');
  const totalAmountUsd = selectedToken && tokenBalance > 0
    ? (totalAmount * (selectedToken.usdValue || 0) / tokenBalance)
    : 0;
  const gasCostUsd = send.gasEstimate ? send.gasEstimate.totalGasCostUsd : 0;

  // Include bridge/consolidation fees in total
  const bridgeFee = routingResult?.route ? getRouteTotalFees(routingResult.route) : 0;
  const totalCostUsd = totalAmountUsd + gasCostUsd + bridgeFee;

  const canConfirm = send.gasEstimateStatus === 'succeeded' && send.sendStatus !== 'loading';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Confirm" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
              {existingContact ? (
                <>
                  <Text style={[styles.summaryValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                    {existingContact.name}
                  </Text>
                  <Text style={[styles.summarySubValue, theme.typography.caption, { color: dynamicTheme.colors.textTertiary }]}>
                    {truncateAddress(send.recipient)}
                  </Text>
                </>
              ) : (
                <Text style={[styles.summaryValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                  {truncateAddress(send.recipient)}
                </Text>
              )}
            </View>
            {!existingContact && !showSaveContact && (
              <TouchableOpacity
                style={[styles.saveContactButton, { borderColor: dynamicTheme.colors.buttonPrimary }]}
                onPress={() => setShowSaveContact(true)}
              >
                <FontAwesome name="user-plus" size={16} color={dynamicTheme.colors.buttonPrimary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Save Contact Input */}
          {showSaveContact && (
            <View style={[styles.saveContactContainer, { borderTopColor: dynamicTheme.colors.glassBorder }]}>
              <TextInput
                style={[styles.saveContactInput, theme.typography.body, { backgroundColor: dynamicTheme.colors.background, color: dynamicTheme.colors.textPrimary }]}
                placeholder="Contact name"
                placeholderTextColor={dynamicTheme.colors.textTertiary}
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
                  <Text style={[theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveContactSave, { backgroundColor: dynamicTheme.colors.buttonPrimary }]}
                  onPress={handleSaveContact}
                >
                  <Text style={[theme.typography.caption, { color: dynamicTheme.colors.buttonPrimaryText }]}>
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={[styles.detailsCard, { backgroundColor: dynamicTheme.colors.surface }]}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
              Amount
            </Text>
            <Text style={[styles.detailValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
              {send.amount} {send.selectedToken}
            </Text>
          </View>

          {send.gasEstimateStatus === 'loading' && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                Gas Fee
              </Text>
              <Text style={[styles.detailValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>Calculating...</Text>
            </View>
          )}

          {send.gasEstimate && (
            <>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                  Gas Fee
                </Text>
                <Text style={[styles.detailValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                  {parseFloat(send.gasEstimate.totalGasCost).toFixed(6)} ETH
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                  Gas Fee (USD)
                </Text>
                <Text style={[styles.detailValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                  ${send.gasEstimate.totalGasCostUsd.toFixed(2)}
                </Text>
              </View>
            </>
          )}

          {/* Bridge fee row if applicable */}
          {bridgeFee > 0 && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                Bridge Fee
              </Text>
              <Text style={[styles.detailValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                ${bridgeFee.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={[styles.detailRow, styles.totalRow, { borderTopColor: dynamicTheme.colors.glassBorder }]}>
            <Text style={[styles.detailLabel, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>Total</Text>
            <Text style={[styles.detailValue, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>
              ${totalCostUsd.toFixed(2)} USD
            </Text>
          </View>
        </View>

        {/* Bridge Cost Banner - shown when bridging is needed */}
        {routingResult?.route?.type === 'bridge' && routingResult.route.bridgeQuote && (
          <BridgeCostBanner
            recipientNetwork={routingResult.route.toNetwork}
            senderNetwork={routingResult.route.fromNetwork}
            bridgeQuote={routingResult.route.bridgeQuote}
            costLevel={routingResult.route.bridgeCostLevel || 'none'}
            alternativeNetwork={routingResult.route.alternative?.network}
            onSendWithoutBridge={routingResult.showAlternative ? handleSendAlternative : undefined}
          />
        )}

        {/* Consolidation Banner - shown when collecting from multiple networks */}
        {routingResult?.route?.type === 'consolidation' && routingResult.route.sources && (
          <ConsolidationBanner
            sources={routingResult.route.sources}
            token={send.selectedToken}
            estimatedFee={getRouteTotalFees(routingResult.route)}
            onCollectFromBoth={handleConfirm}
            onSendMax={handleSendMax}
          />
        )}

        {/* Routing status indicator */}
        {routingStatus === 'loading' && (
          <View style={[styles.routingCard, { backgroundColor: dynamicTheme.colors.surface }]}>
            <Text style={[theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
              Calculating optimal route...
            </Text>
          </View>
        )}

        {/* Preferences fetch warning */}
        {send.recipientPreferencesStatus === 'failed' && (
          <View style={[styles.warningCard, { backgroundColor: dynamicTheme.colors.warning + '15', borderColor: dynamicTheme.colors.warning + '30' }]}>
            <FontAwesome name="exclamation-triangle" size={16} color={dynamicTheme.colors.warning} />
            <Text style={[theme.typography.caption, { color: dynamicTheme.colors.warning, flex: 1, marginLeft: 8 }]}>
              Couldn't load recipient's network preferences. Sending on cheapest available network.
            </Text>
          </View>
        )}

        {(send.gasEstimateError || send.sendError) && (
          <View style={[styles.errorCard, { backgroundColor: dynamicTheme.colors.error + '10' }]}>
            <Text style={[styles.errorText, theme.typography.caption, { color: dynamicTheme.colors.error }]}>
              {send.gasEstimateError || send.sendError}
            </Text>
          </View>
        )}

        {isTestAccount && <TestModeWarning />}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: dynamicTheme.colors.glassBorder }]}>
        <TouchableOpacity
          style={[styles.confirmButton, { backgroundColor: dynamicTheme.colors.buttonPrimary }, !canConfirm && { backgroundColor: dynamicTheme.colors.textTertiary }]}
          onPress={handleConfirm}
          disabled={!canConfirm || send.sendStatus === 'loading'}
        >
          <Text style={[styles.confirmButtonText, theme.typography.heading, { color: dynamicTheme.colors.buttonPrimaryText }]}>
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
  routingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning + '15',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.warning + '30',
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
