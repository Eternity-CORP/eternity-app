/**
 * SendEthScreen - Advanced ETH sending with gas customization
 * 
 * Features:
 * - Address validation with EIP-55 checksum
 * - Balance checking
 * - Gas fee level selection (low/medium/high)
 * - Advanced gas customization
 * - Transaction confirmation tracking
 * - Real-time status updates
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ethers } from 'ethers';

import { MainStackParamList } from '../../navigation/MainNavigator';
import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import Card from '../../components/common/Card';
import ModalTextInput from '../../components/common/ModalTextInput';
import { useShardAnimation } from '../shards/ShardAnimationProvider';
import { KeyboardAwareScreen } from '../../components/common/KeyboardAwareScreen';

import {
  sendNative,
  waitForConfirmations,
  type GasFeeLevel,
  TransactionStatus,
  InsufficientFundsError,
  InvalidAddressError,
  InvalidAmountError,
  TransactionError,
  TransactionFailedError,
} from '../../wallet/transactions';
import { getETHBalance } from '../../services/blockchain/balanceService';
import { estimateGasForETH, type GasFeeOptions } from '../../services/blockchain/gasEstimatorService';
import { getSelectedNetwork } from '../../services/networkService';
import type { Network } from '../../config/env';
import { reportSendShard } from '../../services/shardEventsService';
import { loginWithWallet } from '../../services/authService';

type Props = NativeStackScreenProps<MainStackParamList, 'Send'>;

export default function SendEthScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { activeAccount } = useWallet();
  const { triggerShardAnimation } = useShardAnimation();

  // Form state
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState<ethers.BigNumber>(ethers.BigNumber.from(0));
  const [network, setNetwork] = useState<Network>('sepolia');

  // Gas estimation state
  const [gasFeeOptions, setGasFeeOptions] = useState<GasFeeOptions | null>(null);
  const [selectedFeeLevel, setSelectedFeeLevel] = useState<GasFeeLevel>('medium');
  const [estimating, setEstimating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Custom gas state (for advanced mode)
  const [customGasLimit, setCustomGasLimit] = useState('');
  const [customMaxFee, setCustomMaxFee] = useState('');
  const [customPriorityFee, setCustomPriorityFee] = useState('');

  // Transaction state
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<TransactionStatus | null>(null);
  const [confirmations, setConfirmations] = useState(0);

  // Load network and balance
  useEffect(() => {
    const loadData = async () => {
      const selectedNetwork = await getSelectedNetwork();
      setNetwork(selectedNetwork);

      if (activeAccount?.address) {
        try {
          const bal = await getETHBalance(activeAccount.address, selectedNetwork);
          setBalance(bal);
        } catch (error) {
          console.error('Failed to load balance:', error);
        }
      }
    };
    loadData();
  }, [activeAccount?.address]);

  // Estimate gas when inputs change
  useEffect(() => {
    const estimate = async () => {
      if (!recipient || !amount || !ethers.utils.isAddress(recipient)) {
        setGasFeeOptions(null);
        return;
      }

      try {
        setEstimating(true);
        const options = await estimateGasForETH(recipient, amount, network);
        setGasFeeOptions(options);
      } catch (error) {
        console.warn('Gas estimation failed:', error);
        setGasFeeOptions(null);
      } finally {
        setEstimating(false);
      }
    };

    const debounce = setTimeout(estimate, 500);
    return () => clearTimeout(debounce);
  }, [recipient, amount, network]);

  // Validate address
  const isValidAddress = useCallback(() => {
    if (!recipient) return null;
    return ethers.utils.isAddress(recipient);
  }, [recipient]);

  // Check if has sufficient funds
  const hasInsufficientFunds = useCallback(() => {
    if (!amount || !gasFeeOptions) return false;

    try {
      const amountWei = ethers.utils.parseEther(amount);
      // Use medium as fallback for custom
      const level = selectedFeeLevel === 'custom' ? 'medium' : selectedFeeLevel;
      const feeWei = ethers.utils.parseEther(gasFeeOptions[level].totalFeeTH);
      const totalNeeded = amountWei.add(feeWei);
      return balance.lt(totalNeeded);
    } catch {
      return false;
    }
  }, [amount, balance, gasFeeOptions, selectedFeeLevel]);

  // Check if form is valid
  const isFormValid = useCallback(() => {
    return (
      isValidAddress() &&
      amount &&
      Number(amount) > 0 &&
      gasFeeOptions &&
      !hasInsufficientFunds() &&
      !sending
    );
  }, [isValidAddress, amount, gasFeeOptions, hasInsufficientFunds, sending]);

  // Handle send transaction
  const handleSend = async () => {
    if (!isFormValid()) return;

    try {
      Keyboard.dismiss();
      setSending(true);
      setTxHash(null);
      setTxStatus(null);
      setConfirmations(0);

      console.log('🚀 Sending transaction...');

      // Prepare parameters
      const params: any = {
        to: recipient,
        amountEther: amount,
        feeLevel: selectedFeeLevel,
        network,
      };

      // Add custom gas if in advanced mode
      if (showAdvanced && customGasLimit) {
        params.gasLimit = ethers.BigNumber.from(customGasLimit);
        
        if (customMaxFee) {
          params.maxFeePerGas = ethers.utils.parseUnits(customMaxFee, 'gwei');
        }
        if (customPriorityFee) {
          params.maxPriorityFeePerGas = ethers.utils.parseUnits(customPriorityFee, 'gwei');
        }
      }

      // Send transaction
      const result = await sendNative(params);
      
      setTxHash(result.hash);
      setTxStatus(result.status);

      console.log(`✅ Transaction sent: ${result.hash}`);

      // Report successful send to backend for shard rewards
      try {
        if (activeAccount?.address) {
          const authToken = await loginWithWallet(activeAccount.address);
          if (authToken) {
            const shardResult = await reportSendShard({
              amountEth: amount,
              txHash: result.hash,
              recipientAddress: recipient,
              network,
              authToken,
            });

            console.log('[SendEthScreen] Shard result:', shardResult);

            const earned = shardResult?.earnedShards ?? 0;
            if (earned > 0) {
              triggerShardAnimation(earned);
            } else if (
              shardResult?.limitReason === 'DAILY_LIMIT' ||
              shardResult?.limitReason === 'DEVICE_LIMIT'
            ) {
              Alert.alert(
                'Лимит шардов',
                'На сегодня дневной лимит шардов достигнут. Действие всё равно выполнено, но новые шарды будут начислены завтра.',
              );
            }
          } else {
            // Fallback: показать локальную анимацию, если нет токена
            triggerShardAnimation(1);
          }
        } else {
          // Fallback: показать локальную анимацию, даже если адрес не найден
          triggerShardAnimation(1);
        }
      } catch (error) {
        console.warn('[SendEthScreen] Failed to report shard event:', error);
        // Не ломаем UX, если бекенд недоступен
        triggerShardAnimation(1);
      }

      // Wait for confirmations in background
      waitForConfirmations({
        hash: result.hash,
        minConfirms: 2,
        timeoutMs: 120000,
        network,
        onStatusUpdate: (status) => {
          setConfirmations(status.confirmations);
          setTxStatus(status.status);
          console.log(`Confirmations: ${status.confirmations}, Status: ${status.status}`);
        },
      })
        .then((confirmation) => {
          console.log(`✅ Transaction confirmed in block ${confirmation.blockNumber}`);
          
          Alert.alert(
            '✅ Transaction Confirmed',
            `Your transaction has been confirmed!\n\nHash: ${result.hash.slice(0, 10)}...\nBlock: ${confirmation.blockNumber}\nGas Used: ${confirmation.gasUsed}`,
            [
              {
                text: 'Done',
                onPress: () => navigation.goBack(),
              },
            ]
          );
        })
        .catch((error) => {
          console.error('Confirmation error:', error);
          
          // Check if transaction failed (reverted)
          if (error instanceof TransactionFailedError || error.message?.includes('reverted')) {
            Alert.alert(
              '❌ Transaction Failed',
              `Transaction was sent but reverted (failed on-chain).\n\nPossible reasons:\n• Insufficient gas limit\n• Recipient is a contract that rejected the transaction\n• Network congestion\n\nHash: ${result.hash}\n\nCheck details in Etherscan.`,
              [
                {
                  text: 'View in Etherscan',
                  onPress: () => {
                    const explorerUrl = network === 'mainnet'
                      ? `https://etherscan.io/tx/${result.hash}`
                      : network === 'sepolia'
                      ? `https://sepolia.etherscan.io/tx/${result.hash}`
                      : `https://holesky.etherscan.io/tx/${result.hash}`;
                    console.log('Open explorer:', explorerUrl);
                  },
                },
                { text: 'OK' }
              ]
            );
          } else {
            // Timeout error
            Alert.alert(
              '⚠️ Confirmation Timeout',
              `Transaction was sent but confirmation timed out. Check the transaction status manually.\n\nHash: ${result.hash}`,
              [{ text: 'OK' }]
            );
          }
        });

    } catch (error: any) {
      console.error('Send error:', error);
      
      let errorMessage = 'Failed to send transaction';
      
      if (error instanceof InsufficientFundsError) {
        errorMessage = error.message;
      } else if (error instanceof InvalidAddressError) {
        errorMessage = error.message;
      } else if (error instanceof InvalidAmountError) {
        errorMessage = error.message;
      } else if (error instanceof TransactionError) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('❌ Transaction Failed', errorMessage);
      
      setSending(false);
      setTxHash(null);
      setTxStatus(null);
    }
  };

  // Render gas fee level selector
  const renderFeeSelector = () => {
    if (!gasFeeOptions) return null;

    const levels: Array<{ key: GasFeeLevel; label: string; icon: string }> = [
      { key: 'low', label: 'Low', icon: 'time-outline' },
      { key: 'medium', label: 'Medium', icon: 'flash-outline' },
      { key: 'high', label: 'High', icon: 'rocket-outline' },
    ];

    return (
      <View style={styles.feeLevelContainer}>
        {levels.map(({ key, label, icon }) => {
          const estimate = gasFeeOptions[key as keyof GasFeeOptions];
          const isSelected = selectedFeeLevel === key;

          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.feeLevelButton,
                {
                  backgroundColor: isSelected
                    ? theme.colors.primary + '20'
                    : theme.colors.surface,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setSelectedFeeLevel(key)}
              disabled={sending}
            >
              <Ionicons
                name={icon as any}
                size={20}
                color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.feeLevelLabel,
                  { color: isSelected ? theme.colors.primary : theme.colors.text },
                ]}
              >
                {label}
              </Text>
              <Text
                style={[
                  styles.feeLevelValue,
                  { color: isSelected ? theme.colors.primary : theme.colors.textSecondary },
                ]}
              >
                {estimate.totalFeeTH.slice(0, 8)} ETH
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Render transaction status
  const renderTxStatus = () => {
    if (!txHash) return null;

    const statusConfig = {
      [TransactionStatus.PENDING]: {
        icon: 'time-outline',
        color: theme.colors.warning,
        label: 'Pending',
      },
      [TransactionStatus.CONFIRMING]: {
        icon: 'sync-outline',
        color: theme.colors.primary,
        label: 'Confirming',
      },
      [TransactionStatus.CONFIRMED]: {
        icon: 'checkmark-circle',
        color: theme.colors.success,
        label: 'Confirmed',
      },
      [TransactionStatus.FAILED]: {
        icon: 'close-circle',
        color: theme.colors.error,
        label: 'Failed',
      },
      [TransactionStatus.REPLACED]: {
        icon: 'swap-horizontal',
        color: theme.colors.warning,
        label: 'Replaced',
      },
      [TransactionStatus.CANCELLED]: {
        icon: 'ban',
        color: theme.colors.error,
        label: 'Cancelled',
      },
    };

    const config = txStatus ? statusConfig[txStatus] : statusConfig[TransactionStatus.PENDING];

    return (
      <Card style={StyleSheet.flatten([styles.statusCard, { backgroundColor: config.color + '20' }])}>
        <View style={styles.statusHeader}>
          <Ionicons name={config.icon as any} size={24} color={config.color} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusLabel, { color: theme.colors.text }]}>
              {config.label}
            </Text>
            <Text style={[styles.statusHash, { color: theme.colors.textSecondary }]}>
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </Text>
          </View>
          {txStatus === TransactionStatus.CONFIRMING && (
            <ActivityIndicator size="small" color={config.color} />
          )}
        </View>
        
        {confirmations > 0 && (
          <View style={styles.confirmationsRow}>
            <Ionicons name="layers-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.confirmationsText, { color: theme.colors.textSecondary }]}>
              {confirmations} confirmation{confirmations !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </Card>
    );
  };

  return (
    <KeyboardAwareScreen
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      withSafeArea={true}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Send ETH</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Transaction Status */}
      {renderTxStatus()}

      {/* Recipient */}
      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recipient</Text>

        <View
          style={[
            styles.inputContainer,
            {
              borderColor:
                isValidAddress() === null
                  ? theme.colors.border
                  : isValidAddress()
                  ? theme.colors.success
                  : theme.colors.error,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <Ionicons
            name="wallet-outline"
            size={20}
            color={theme.colors.textSecondary}
            style={styles.inputIcon}
          />
          <ModalTextInput
            style={[styles.input, { color: theme.colors.text }]}
            placeholder="0x... wallet address"
            placeholderTextColor={theme.colors.textSecondary}
            value={recipient}
            onChangeText={(t) => setRecipient(t.trim())}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!sending}
            title="Recipient Address"
            helperText="Enter Ethereum wallet address (0x...)"
            errorText={isValidAddress() === false ? 'Invalid Ethereum address' : undefined}
          />
        </View>

        {isValidAddress() === false && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={14} color={theme.colors.error} />
            <Text style={[styles.errorText, { color: theme.colors.error }]}>
              Invalid Ethereum address
            </Text>
          </View>
        )}
      </Card>

      {/* Amount */}
      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Amount</Text>

        <View
          style={[
            styles.amountInputContainer,
            {
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <Text style={[styles.currencySymbol, { color: theme.colors.textSecondary }]}>Ξ</Text>
          <ModalTextInput
            style={[styles.amountInput, { color: theme.colors.text }]}
            placeholder="0.00"
            placeholderTextColor={theme.colors.textSecondary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            editable={!sending}
            title="Amount to Send"
            helperText={`Balance: ${ethers.utils.formatEther(balance)} ETH`}
          />
        </View>

        <View style={[styles.balanceRow, { marginTop: 12 }]}>
          <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>
            Balance:
          </Text>
          <Text style={[styles.balanceValue, { color: theme.colors.text }]}>
            {ethers.utils.formatEther(balance)} ETH
          </Text>
        </View>

        {hasInsufficientFunds() && (
          <View style={[styles.warningBox, { backgroundColor: theme.colors.error + '20' }]}>
            <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
            <Text style={[styles.warningText, { color: theme.colors.error }]}>
              Insufficient balance (including gas fees)
            </Text>
          </View>
        )}
      </Card>

      {/* Gas Fee Selection */}
      {gasFeeOptions && (
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Gas Fee</Text>
            {estimating && <ActivityIndicator size="small" color={theme.colors.primary} />}
          </View>

          {renderFeeSelector()}

          {/* Advanced Options Toggle */}
          <TouchableOpacity
            style={styles.advancedToggle}
            onPress={() => setShowAdvanced(!showAdvanced)}
            disabled={sending}
          >
            <Text style={[styles.advancedToggleText, { color: theme.colors.primary }]}>
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </Text>
            <Ionicons
              name={showAdvanced ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.colors.primary}
            />
          </TouchableOpacity>

          {/* Advanced Gas Customization */}
          {showAdvanced && (
            <View style={styles.advancedContainer}>
              <Text style={[styles.advancedLabel, { color: theme.colors.textSecondary }]}>
                Gas Limit
              </Text>
              <TextInput
                style={[
                  styles.advancedInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder={gasFeeOptions[selectedFeeLevel === 'custom' ? 'medium' : selectedFeeLevel].gasLimit.toString()}
                placeholderTextColor={theme.colors.textSecondary}
                value={customGasLimit}
                onChangeText={setCustomGasLimit}
                keyboardType="number-pad"
                editable={!sending}
              />

              <Text style={[styles.advancedLabel, { color: theme.colors.textSecondary }]}>
                Max Fee (Gwei)
              </Text>
              <TextInput
                style={[
                  styles.advancedInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="Auto"
                placeholderTextColor={theme.colors.textSecondary}
                value={customMaxFee}
                onChangeText={setCustomMaxFee}
                keyboardType="decimal-pad"
                editable={!sending}
              />

              <Text style={[styles.advancedLabel, { color: theme.colors.textSecondary }]}>
                Priority Fee (Gwei)
              </Text>
              <TextInput
                style={[
                  styles.advancedInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="Auto"
                placeholderTextColor={theme.colors.textSecondary}
                value={customPriorityFee}
                onChangeText={setCustomPriorityFee}
                keyboardType="decimal-pad"
                editable={!sending}
              />
            </View>
          )}
        </Card>
      )}

      {/* Send Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: !isFormValid() 
                ? theme.colors.border 
                : theme.colors.success,
            },
          ]}
          onPress={handleSend}
          disabled={!isFormValid() || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendButtonText}>
              Send ETH
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.spacer} />
    </KeyboardAwareScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '500',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '500',
    paddingVertical: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 13,
  },
  balanceValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    gap: 8,
    marginTop: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  feeLevelContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  feeLevelButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  feeLevelLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  feeLevelValue: {
    fontSize: 11,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  advancedToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  advancedContainer: {
    marginTop: 12,
    gap: 8,
  },
  advancedLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
  advancedInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  statusCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusHash: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  confirmationsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  confirmationsText: {
    fontSize: 13,
  },
  swipeContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  sendButton: {
    height: 48,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  spacer: {
    height: 20,
  },
});
