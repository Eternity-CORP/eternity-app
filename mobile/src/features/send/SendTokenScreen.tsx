/**
 * SendTokenScreen - ERC-20 Token Sending
 * 
 * Features:
 * - Token selection
 * - Address validation with EIP-55 checksum
 * - Balance checking
 * - Gas fee level selection (low/medium/high)
 * - Transaction confirmation tracking
 * - Real-time status updates
 * - Support for "silent" tokens
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ethers, BigNumber } from 'ethers';

import { MainStackParamList } from '../../navigation/MainNavigator';
import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import Card from '../../components/common/Card';

import {
  sendErc20,
  getErc20Meta,
  getErc20Balance,
  formatTokenAmount,
  type TokenMetadata,
  TokenError,
  InvalidTokenAddressError,
  InsufficientTokenBalanceError,
} from '../../wallet/erc20';
import { estimateGasForERC20, type GasFeeOptions, type GasFeeLevel } from '../../services/blockchain/gasEstimatorService';
import { getSelectedNetwork } from '../../services/networkService';
import type { Network } from '../../config/env';

type Props = NativeStackScreenProps<MainStackParamList, 'SendToken'>;

// Common test tokens on Sepolia
const COMMON_TOKENS = [
  {
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    symbol: 'USDC',
    name: 'USD Coin',
  },
  {
    address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',
    symbol: 'USDT',
    name: 'Tether USD',
  },
];

export default function SendTokenScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { activeAccount } = useWallet();

  // Form state
  const [tokenAddress, setTokenAddress] = useState(route.params?.tokenAddress || '');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [network, setNetwork] = useState<Network>('sepolia');

  // Token state
  const [tokenMetadata, setTokenMetadata] = useState<TokenMetadata | null>(null);
  const [tokenBalance, setTokenBalance] = useState<BigNumber>(BigNumber.from(0));
  const [loadingToken, setLoadingToken] = useState(false);

  // Gas estimation state
  const [gasFeeOptions, setGasFeeOptions] = useState<GasFeeOptions | null>(null);
  const [selectedFeeLevel, setSelectedFeeLevel] = useState<GasFeeLevel>('medium');
  const [estimating, setEstimating] = useState(false);

  // Transaction state
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Load network
  useEffect(() => {
    const loadData = async () => {
      const selectedNetwork = await getSelectedNetwork();
      setNetwork(selectedNetwork);
    };
    loadData();
  }, []);

  // Load token metadata when address changes
  useEffect(() => {
    const loadToken = async () => {
      if (!tokenAddress || !ethers.utils.isAddress(tokenAddress)) {
        setTokenMetadata(null);
        setTokenBalance(BigNumber.from(0));
        return;
      }

      if (!activeAccount?.address) return;

      try {
        setLoadingToken(true);
        
        // Load metadata and balance in parallel
        const [metadata, balance] = await Promise.all([
          getErc20Meta(tokenAddress, network),
          getErc20Balance(tokenAddress, activeAccount.address, network),
        ]);

        setTokenMetadata(metadata);
        setTokenBalance(balance);
      } catch (error) {
        console.error('Failed to load token:', error);
        setTokenMetadata(null);
        setTokenBalance(BigNumber.from(0));
      } finally {
        setLoadingToken(false);
      }
    };

    loadToken();
  }, [tokenAddress, activeAccount?.address, network]);

  // Estimate gas when inputs change
  useEffect(() => {
    const estimate = async () => {
      if (!tokenAddress || !recipient || !amount || !tokenMetadata) {
        setGasFeeOptions(null);
        return;
      }

      if (!ethers.utils.isAddress(recipient)) {
        setGasFeeOptions(null);
        return;
      }

      try {
        setEstimating(true);
        
        // Parse amount to smallest units
        const amountUnits = ethers.utils.parseUnits(amount, tokenMetadata.decimals);
        
        const options = await estimateGasForERC20(
          tokenAddress,
          recipient,
          amountUnits,
          network
        );
        
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
  }, [tokenAddress, recipient, amount, tokenMetadata, network]);

  // Validate recipient address
  const isValidAddress = useCallback(() => {
    if (!recipient) return null;
    return ethers.utils.isAddress(recipient);
  }, [recipient]);

  // Check if has sufficient balance
  const hasInsufficientBalance = useCallback(() => {
    if (!amount || !tokenMetadata) return false;

    try {
      const amountUnits = ethers.utils.parseUnits(amount, tokenMetadata.decimals);
      return tokenBalance.lt(amountUnits);
    } catch {
      return false;
    }
  }, [amount, tokenBalance, tokenMetadata]);

  // Check if form is valid
  const isFormValid = useCallback(() => {
    return (
      tokenAddress &&
      ethers.utils.isAddress(tokenAddress) &&
      tokenMetadata &&
      isValidAddress() &&
      amount &&
      Number(amount) > 0 &&
      gasFeeOptions &&
      !hasInsufficientBalance() &&
      !sending
    );
  }, [tokenAddress, tokenMetadata, isValidAddress, amount, gasFeeOptions, hasInsufficientBalance, sending]);

  // Handle send transaction
  const handleSend = async () => {
    if (!isFormValid() || !tokenMetadata) return;

    try {
      Keyboard.dismiss();
      setSending(true);
      setTxHash(null);

      console.log('🪙 Sending token...');

      const result = await sendErc20({
        token: tokenAddress,
        to: recipient,
        amountHuman: amount,
        feeLevel: selectedFeeLevel,
        network,
      });

      setTxHash(result.hash);

      console.log(`✅ Token sent: ${result.hash}`);

      Alert.alert(
        '✅ Transaction Sent',
        `Sent ${result.value} ${tokenMetadata.symbol} to ${recipient.slice(0, 6)}...${recipient.slice(-4)}\n\nHash: ${result.hash.slice(0, 10)}...\n\nCheck status in explorer.`,
        [
          {
            text: 'View in Explorer',
            onPress: () => {
              const explorerUrl = network === 'mainnet'
                ? `https://etherscan.io/tx/${result.hash}`
                : `https://sepolia.etherscan.io/tx/${result.hash}`;
              console.log('Open explorer:', explorerUrl);
            },
          },
          {
            text: 'Done',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Send error:', error);

      let errorMessage = 'Failed to send token';

      if (error instanceof InsufficientTokenBalanceError) {
        errorMessage = error.message;
      } else if (error instanceof InvalidTokenAddressError) {
        errorMessage = error.message;
      } else if (error instanceof TokenError) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('❌ Transaction Failed', errorMessage);
    } finally {
      setSending(false);
    }
  };

  // Select common token
  const selectToken = (token: typeof COMMON_TOKENS[0]) => {
    setTokenAddress(token.address);
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Send Token</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Token Selection */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Token</Text>

          {/* Token Address Input */}
          <View
            style={[
              styles.inputContainer,
              {
                borderColor:
                  tokenAddress && !ethers.utils.isAddress(tokenAddress)
                    ? theme.colors.error
                    : tokenMetadata
                    ? theme.colors.success
                    : theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <Ionicons
              name="logo-usd"
              size={20}
              color={theme.colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              placeholder="Token contract address"
              placeholderTextColor={theme.colors.textSecondary}
              value={tokenAddress}
              onChangeText={setTokenAddress}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!sending}
            />
            {loadingToken && <ActivityIndicator size="small" color={theme.colors.primary} />}
          </View>

          {/* Token Metadata Display */}
          {tokenMetadata && (
            <View style={[styles.tokenInfo, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.tokenInfoRow}>
                <Text style={[styles.tokenInfoLabel, { color: theme.colors.textSecondary }]}>
                  Symbol:
                </Text>
                <Text style={[styles.tokenInfoValue, { color: theme.colors.text }]}>
                  {tokenMetadata.symbol}
                </Text>
              </View>
              <View style={styles.tokenInfoRow}>
                <Text style={[styles.tokenInfoLabel, { color: theme.colors.textSecondary }]}>
                  Name:
                </Text>
                <Text style={[styles.tokenInfoValue, { color: theme.colors.text }]}>
                  {tokenMetadata.name}
                </Text>
              </View>
              <View style={styles.tokenInfoRow}>
                <Text style={[styles.tokenInfoLabel, { color: theme.colors.textSecondary }]}>
                  Decimals:
                </Text>
                <Text style={[styles.tokenInfoValue, { color: theme.colors.text }]}>
                  {tokenMetadata.decimals}
                </Text>
              </View>
              <View style={styles.tokenInfoRow}>
                <Text style={[styles.tokenInfoLabel, { color: theme.colors.textSecondary }]}>
                  Balance:
                </Text>
                <Text style={[styles.tokenInfoValue, { color: theme.colors.text }]}>
                  {formatTokenAmount(tokenBalance, tokenMetadata.decimals)} {tokenMetadata.symbol}
                </Text>
              </View>
            </View>
          )}

          {/* Common Tokens */}
          <Text style={[styles.commonTokensTitle, { color: theme.colors.textSecondary }]}>
            Common Tokens:
          </Text>
          <View style={styles.commonTokensContainer}>
            {COMMON_TOKENS.map((token) => (
              <TouchableOpacity
                key={token.address}
                style={[
                  styles.commonTokenButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={() => selectToken(token)}
                disabled={sending}
              >
                <Text style={[styles.commonTokenSymbol, { color: theme.colors.text }]}>
                  {token.symbol}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

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
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                Invalid Ethereum address
              </Text>
            </View>
          )}
        </Card>

        {/* Amount */}
        {tokenMetadata && (
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
              <Text style={[styles.currencySymbol, { color: theme.colors.textSecondary }]}>
                {tokenMetadata.symbol}
              </Text>
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
              <Text style={[styles.balanceLabel, { color: theme.colors.textSecondary }]}>
                Balance:
              </Text>
              <Text style={[styles.balanceValue, { color: theme.colors.text }]}>
                {formatTokenAmount(tokenBalance, tokenMetadata.decimals)} {tokenMetadata.symbol}
              </Text>
            </View>

            {hasInsufficientBalance() && (
              <View style={[styles.warningBox, { backgroundColor: theme.colors.error + '20' }]}>
                <Ionicons name="alert-circle" size={16} color={theme.colors.error} />
                <Text style={[styles.warningText, { color: theme.colors.error }]}>
                  Insufficient {tokenMetadata.symbol} balance
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Gas Fee Selection */}
        {gasFeeOptions && (
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Gas Fee (ETH)</Text>
              {estimating && <ActivityIndicator size="small" color={theme.colors.primary} />}
            </View>

            {renderFeeSelector()}
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
                Send {tokenMetadata?.symbol || 'Token'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
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
    paddingTop: 56,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
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
  tokenInfo: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  tokenInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tokenInfoLabel: {
    fontSize: 13,
  },
  tokenInfoValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  commonTokensTitle: {
    fontSize: 13,
    marginTop: 16,
    marginBottom: 8,
  },
  commonTokensContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  commonTokenButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  commonTokenSymbol: {
    fontSize: 14,
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
    fontSize: 20,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
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
