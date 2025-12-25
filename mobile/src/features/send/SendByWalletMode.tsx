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
import { Ionicons } from '@expo/vector-icons';
import { ethers } from 'ethers';

import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import Card from '../../components/common/Card';
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
import { useNetwork } from '../../hooks/useNetwork';
import { getNetworkMode } from '../../services/networkModeService';

interface Props {
  navigation: any;
}

export default function SendByWalletMode({ navigation }: Props) {
  const { theme } = useTheme();
  const { activeAccount } = useWallet();
  const { triggerShardAnimation } = useShardAnimation();
  const { network: currentNetwork, mode: currentMode } = useNetwork();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState<ethers.BigNumber>(ethers.BigNumber.from(0));
  const [network, setNetwork] = useState<Network>('sepolia');

  const [gasFeeOptions, setGasFeeOptions] = useState<GasFeeOptions | null>(null);
  const [selectedFeeLevel, setSelectedFeeLevel] = useState<GasFeeLevel>('medium');
  const [estimating, setEstimating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [customGasLimit, setCustomGasLimit] = useState('');
  const [customMaxFee, setCustomMaxFee] = useState('');
  const [customPriorityFee, setCustomPriorityFee] = useState('');

  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<TransactionStatus | null>(null);
  const [confirmations, setConfirmations] = useState(0);

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
  }, [activeAccount?.address, currentNetwork]);

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

  const isValidAddress = useCallback(() => {
    if (!recipient) return null;
    return ethers.utils.isAddress(recipient);
  }, [recipient]);

  const hasInsufficientFunds = useCallback(() => {
    if (!amount || !gasFeeOptions) return false;

    try {
      const amountWei = ethers.utils.parseEther(amount);
      const level = selectedFeeLevel === 'custom' ? 'medium' : selectedFeeLevel;
      const feeWei = ethers.utils.parseEther(gasFeeOptions[level].totalFeeTH);
      const totalNeeded = amountWei.add(feeWei);
      return balance.lt(totalNeeded);
    } catch {
      return false;
    }
  }, [amount, balance, gasFeeOptions, selectedFeeLevel]);

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

  const handleSend = async () => {
    if (!isFormValid()) return;

    try {
      Keyboard.dismiss();
      setSending(true);
      setTxHash(null);
      setTxStatus(null);
      setConfirmations(0);

      const params: any = {
        to: recipient,
        amountEther: amount,
        feeLevel: selectedFeeLevel,
        network,
      };

      if (showAdvanced && customGasLimit) {
        params.gasLimit = ethers.BigNumber.from(customGasLimit);
        if (customMaxFee) {
          params.maxFeePerGas = ethers.utils.parseUnits(customMaxFee, 'gwei');
        }
        if (customPriorityFee) {
          params.maxPriorityFeePerGas = ethers.utils.parseUnits(customPriorityFee, 'gwei');
        }
      }

      const result = await sendNative(params);
      setTxHash(result.hash);
      setTxStatus(result.status);

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

            const earned = shardResult?.earnedShards ?? 0;
            if (earned > 0) {
              triggerShardAnimation(earned);
            }
          } else {
            triggerShardAnimation(1);
          }
        } else {
          triggerShardAnimation(1);
        }
      } catch (error) {
        console.warn('Failed to report shard event:', error);
        triggerShardAnimation(1);
      }

      waitForConfirmations({
        hash: result.hash,
        minConfirms: 2,
        timeoutMs: 120000,
        network,
        onStatusUpdate: (status) => {
          setConfirmations(status.confirmations);
          setTxStatus(status.status);
        },
      })
        .then((confirmation) => {
          Alert.alert(
            'Transaction Confirmed',
            `Your transaction has been confirmed!\n\nHash: ${result.hash.slice(0, 10)}...\nBlock: ${confirmation.blockNumber}`,
            [{ text: 'Done', onPress: () => navigation.goBack() }]
          );
        })
        .catch((error) => {
          if (error instanceof TransactionFailedError || error.message?.includes('reverted')) {
            Alert.alert(
              'Transaction Failed',
              `Transaction was sent but reverted.\n\nHash: ${result.hash}`,
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              'Confirmation Timeout',
              `Transaction was sent but confirmation timed out.\n\nHash: ${result.hash}`,
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

      Alert.alert('Transaction Failed', errorMessage);

      setSending(false);
      setTxHash(null);
      setTxStatus(null);
    }
  };

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
                  backgroundColor: isSelected ? theme.colors.primary + '20' : theme.colors.surface,
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

  const renderTxStatus = () => {
    if (!txHash) return null;

    const statusConfig = {
      [TransactionStatus.PENDING]: { icon: 'time-outline', color: theme.colors.warning, label: 'Pending' },
      [TransactionStatus.CONFIRMING]: { icon: 'sync-outline', color: theme.colors.primary, label: 'Confirming' },
      [TransactionStatus.CONFIRMED]: { icon: 'checkmark-circle', color: theme.colors.success, label: 'Confirmed' },
      [TransactionStatus.FAILED]: { icon: 'close-circle', color: theme.colors.error, label: 'Failed' },
      [TransactionStatus.REPLACED]: { icon: 'swap-horizontal', color: theme.colors.warning, label: 'Replaced' },
      [TransactionStatus.CANCELLED]: { icon: 'ban', color: theme.colors.error, label: 'Cancelled' },
    };

    const config = txStatus ? statusConfig[txStatus] : statusConfig[TransactionStatus.PENDING];

    return (
      <Card style={[styles.statusCard, { backgroundColor: config.color + '20' }]}>
        <View style={styles.statusHeader}>
          <Ionicons name={config.icon as any} size={24} color={config.color} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusLabel, { color: theme.colors.text }]}>{config.label}</Text>
            <Text style={[styles.statusHash, { color: theme.colors.textSecondary }]}>
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </Text>
          </View>
          {txStatus === TransactionStatus.CONFIRMING && <ActivityIndicator size="small" color={config.color} />}
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

  const getNetworkDisplayName = () => {
    switch (network) {
      case 'mainnet': return 'Ethereum Mainnet';
      case 'sepolia': return 'Sepolia Testnet';
      case 'holesky': return 'Holesky Testnet';
      default: return network;
    }
  };

  const getNetworkColor = () => {
    if (network === 'mainnet') return '#4CAF50';
    return '#FF9800';
  };

  return (
    <KeyboardAwareScreen style={styles.container} withSafeArea={true}>
      {/* Network Indicator - Critical for security */}
      <Card style={[styles.networkCard, { backgroundColor: getNetworkColor() + '15', borderColor: getNetworkColor() + '40' }]}>
        <View style={styles.networkRow}>
          <View style={[styles.networkDot, { backgroundColor: getNetworkColor() }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.networkLabel, { color: theme.colors.text }]}>Sending on</Text>
            <Text style={[styles.networkName, { color: getNetworkColor() }]}>
              {getNetworkDisplayName()} {network === 'mainnet' ? '⚠️' : ''}
            </Text>
          </View>
          {network === 'mainnet' && (
            <View style={[styles.warningBadge, { backgroundColor: theme.colors.error + '20' }]}>
              <Text style={[styles.warningText, { color: theme.colors.error }]}>REAL MONEY</Text>
            </View>
          )}
        </View>
        {network === 'mainnet' && (
          <Text style={[styles.warningMessage, { color: theme.colors.error }]}>
            ⚠️ This transaction will use REAL ETH and cannot be undone
          </Text>
        )}
      </Card>

      {renderTxStatus()}

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
          <Ionicons name="wallet-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: theme.colors.text }]}
            placeholder="0x... wallet address"
            placeholderTextColor={theme.colors.textSecondary}
            value={recipient}
            onChangeText={(t) => setRecipient(t.trim())}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!sending}
          />
        </View>

        {isValidAddress() === false && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={14} color={theme.colors.error} />
            <Text style={[styles.errorText, { color: theme.colors.error }]}>Invalid Ethereum address</Text>
          </View>
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Amount</Text>

        <View style={[styles.amountInputContainer, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.currencySymbol, { color: theme.colors.textSecondary }]}>Ξ</Text>
          <TextInput
            style={[styles.amountInput, { color: theme.colors.text }]}
            placeholder="0.00"
            placeholderTextColor={theme.colors.textSecondary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            editable={!sending}
          />
        </View>

        <View style={[styles.balanceRow, { marginTop: 12 }]}>
          <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>Balance:</Text>
          <Text style={[styles.balanceValue, { color: theme.colors.text }]}>{ethers.utils.formatEther(balance)} ETH</Text>
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

      {gasFeeOptions && (
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Gas Fee</Text>
            {estimating && <ActivityIndicator size="small" color={theme.colors.primary} />}
          </View>

          {renderFeeSelector()}

          <TouchableOpacity
            style={styles.advancedToggle}
            onPress={() => setShowAdvanced(!showAdvanced)}
            disabled={sending}
          >
            <Text style={[styles.advancedToggleText, { color: theme.colors.primary }]}>
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </Text>
            <Ionicons name={showAdvanced ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.primary} />
          </TouchableOpacity>

          {showAdvanced && (
            <View style={styles.advancedContainer}>
              <Text style={[styles.advancedLabel, { color: theme.colors.textSecondary }]}>Gas Limit</Text>
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

              <Text style={[styles.advancedLabel, { color: theme.colors.textSecondary }]}>Max Fee (Gwei)</Text>
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

              <Text style={[styles.advancedLabel, { color: theme.colors.textSecondary }]}>Priority Fee (Gwei)</Text>
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

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.sendButton,
            {
              backgroundColor: !isFormValid() ? theme.colors.border : theme.colors.success,
            },
          ]}
          onPress={handleSend}
          disabled={!isFormValid() || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.sendButtonText}>Send ETH</Text>
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
  networkCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  networkLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  networkName: {
    fontSize: 16,
    fontWeight: '700',
  },
  warningBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  warningMessage: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
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
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
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
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    paddingVertical: 16,
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
    borderRadius: 8,
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
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  feeLevelLabel: {
    fontSize: 13,
    fontWeight: '600',
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
    borderRadius: 8,
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
    fontSize: 16,
    fontWeight: '600',
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
  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  sendButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  spacer: {
    height: 20,
  },
});
