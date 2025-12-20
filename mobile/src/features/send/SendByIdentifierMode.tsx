import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import Card from '../../components/common/Card';
import { resolveIdentifier, ResolvedIdentity } from '../../services/api/identityService';
import { getCrosschainQuote, CrosschainQuote } from '../../services/api/crosschainService';
import { sendETH, estimateGas } from '../../services/blockchain/transactionService';
import { getETHBalance, formatBalance } from '../../services/blockchain/balanceService';
import { KeyboardAwareScreen } from '../../components/common/KeyboardAwareScreen';

interface Props {
  navigation: any;
}

const SUPPORTED_CHAINS = [
  { id: 'sepolia', name: 'Sepolia', icon: '🟦' },
  { id: 'mainnet', name: 'Mainnet', icon: '🔷' },
  { id: 'holesky', name: 'Holesky', icon: '🟣' },
];

const SEPOLIA_TOKENS = ['ETH'];
const MAINNET_TOKENS = ['ETH', 'USDC', 'USDT', 'DAI'];

export default function SendByIdentifierMode({ navigation }: Props) {
  const { theme } = useTheme();
  const { activeAccount } = useWallet();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('ETH');
  const [fromChainId, setFromChainId] = useState('sepolia');
  const [toChainId, setToChainId] = useState('');

  const availableTokens = fromChainId === 'sepolia' ? SEPOLIA_TOKENS : MAINNET_TOKENS;

  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<ResolvedIdentity | null>(null);
  const [resolutionError, setResolutionError] = useState('');

  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quote, setQuote] = useState<CrosschainQuote | null>(null);
  const [quoteError, setQuoteError] = useState('');

  const [sending, setSending] = useState(false);
  const [balance, setBalance] = useState<string>('0');

  useEffect(() => {
    const loadBalance = async () => {
      if (!activeAccount?.address) return;

      try {
        if (selectedToken === 'ETH') {
          const { getETHBalance, formatBalance } = await import('../../services/blockchain/balanceService');
          const balanceBN = await getETHBalance(activeAccount.address, fromChainId as any);
          const formatted = formatBalance(balanceBN);
          setBalance(formatted);
        } else {
          setBalance('0');
        }
      } catch (error) {
        console.error('Failed to load balance:', error);
        setBalance('0');
      }
    };

    loadBalance();
  }, [activeAccount?.address, fromChainId, selectedToken]);

  useEffect(() => {
    if (!availableTokens.includes(selectedToken)) {
      setSelectedToken(availableTokens[0]);
    }
  }, [fromChainId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (recipient.trim()) {
        handleResolveRecipient();
      } else {
        setResolved(null);
        setResolutionError('');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [recipient]);

  useEffect(() => {
    if (resolved) {
      const pref = resolved.tokenPreferences.find((p) => p.tokenSymbol === selectedToken);
      if (pref) {
        setToChainId(pref.preferredChainId);
      } else {
        const sameChainWallet = resolved.wallets.find((w) => w.chainId === fromChainId);
        if (sameChainWallet) {
          setToChainId(fromChainId);
        } else if (resolved.wallets.length > 0) {
          setToChainId(resolved.wallets[0].chainId);
        } else {
          setToChainId(fromChainId);
        }
      }
    }
  }, [resolved, selectedToken, fromChainId]);

  const handleResolveRecipient = async () => {
    try {
      setResolving(true);
      setResolutionError('');
      const result = await resolveIdentifier(recipient.trim());
      setResolved(result);
    } catch (error: any) {
      if (error.message === 'RECIPIENT_NOT_FOUND') {
        setResolutionError(`We couldn't find "${recipient}". Check the spelling or ask them to create an account.`);
      } else {
        setResolutionError('Failed to resolve recipient');
      }
      setResolved(null);
    } finally {
      setResolving(false);
    }
  };

  const handleSendTransaction = async (toAddress: string) => {
    if (!activeAccount?.address) {
      Alert.alert('Error', 'No active wallet found');
      return;
    }

    try {
      setSending(true);

      const currentBalance = parseFloat(balance);
      const sendAmount = parseFloat(amount);

      if (sendAmount > currentBalance) {
        Alert.alert('Insufficient Balance', `You only have ${balance} ${selectedToken}`);
        return;
      }

      const gasEstimate = await estimateGas(toAddress, amount, fromChainId as any);
      const totalCost = sendAmount + parseFloat(gasEstimate.feeEth);

      if (totalCost > currentBalance) {
        Alert.alert(
          'Insufficient Balance',
          `Total cost (${totalCost.toFixed(6)} ETH) exceeds your balance (${balance} ETH)\n\nAmount: ${amount} ETH\nGas Fee: ${gasEstimate.feeEth} ETH`
        );
        return;
      }

      const result = await sendETH(toAddress, amount, fromChainId as any);

      Alert.alert(
        'Transaction Sent!',
        `Amount: ${amount} ${selectedToken}\nTo: @${resolved?.nickname}\nNetwork: ${fromChainId}\n\nTransaction Hash:\n${result.txHash}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setRecipient('');
              setAmount('');
              setResolved(null);
              navigation.goBack();
            },
          },
        ]
      );

      const newBalanceBN = await getETHBalance(activeAccount.address, fromChainId as any);
      setBalance(formatBalance(newBalanceBN));
    } catch (error: any) {
      console.error('Transaction failed:', error);

      let errorMessage = 'Failed to send transaction';

      if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient funds for transaction + gas';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction + gas';
      } else if (error.message?.includes('user rejected')) {
        errorMessage = 'Transaction cancelled';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Transaction Failed', errorMessage);
    } finally {
      setSending(false);
    }
  };

  const handleGetQuote = async () => {
    if (!resolved) {
      Alert.alert('Error', 'Please enter a valid recipient');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!activeAccount?.address) {
      Alert.alert('Error', 'No active wallet found');
      return;
    }

    const hasAddress = resolved.wallets.some((w) => w.chainId === toChainId);
    if (!hasAddress) {
      Alert.alert('No Address', `@${resolved.nickname} doesn't have a ${toChainId} address yet. Try selecting a different network.`);
      return;
    }

    const toAddress = resolved.wallets.find((w) => w.chainId === toChainId)?.address;
    if (!toAddress) return;

    if (fromChainId === toChainId) {
      Alert.alert('Ready to Send', `Send ${amount} ${selectedToken} to @${resolved.nickname} on ${toChainId}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', onPress: () => handleSendTransaction(toAddress) },
      ]);
      return;
    }

    try {
      setLoadingQuote(true);
      setQuoteError('');

      const quoteResult = await getCrosschainQuote({
        fromChainId,
        toChainId,
        fromToken: selectedToken,
        toToken: selectedToken,
        amount,
        fromAddress: activeAccount.address,
        toAddress,
      });

      setQuote(quoteResult);

      Alert.alert(
        'Crosschain Quote',
        `Provider: ${quoteResult.provider}\nFee: ${quoteResult.fee}\nTime: ${quoteResult.durationSeconds}s\nOutput: ${quoteResult.estimatedOutput}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: () => Alert.alert('Success', 'Crosschain transfer initiated!') },
        ]
      );
    } catch (error: any) {
      if (error.message === 'NO_CROSSCHAIN_ROUTE') {
        setQuoteError('No crosschain route available for this pair');
      } else if (error.message === 'CROSSCHAIN_SERVICE_UNAVAILABLE') {
        setQuoteError('Crosschain service temporarily unavailable');
      } else {
        setQuoteError('Failed to get quote');
      }
    } finally {
      setLoadingQuote(false);
    }
  };

  const isCrosschain = fromChainId !== toChainId;

  return (
    <KeyboardAwareScreen style={styles.container} withSafeArea={true}>
      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>To</Text>
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: recipient
                ? resolved
                  ? theme.colors.success
                  : resolutionError
                  ? theme.colors.error
                  : theme.colors.border
                : theme.colors.border,
            },
          ]}
        >
          <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: theme.colors.text }]}
            value={recipient}
            onChangeText={setRecipient}
            placeholder="@nickname, EY-XXX or 0x..."
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={[styles.hintBox, { backgroundColor: theme.colors.accent + '10' }]}>
          <Ionicons name="information-circle" size={16} color={theme.colors.accent} />
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
            You can enter @nickname, Global ID (EY-XXX) or wallet address
          </Text>
        </View>

        {resolving && (
          <View style={[styles.statusBox, { backgroundColor: theme.colors.primary + '10' }]}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={[styles.statusText, { color: theme.colors.primary }]}>Resolving...</Text>
          </View>
        )}

        {resolutionError && (
          <View style={[styles.statusBox, { backgroundColor: theme.colors.error + '10' }]}>
            <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{resolutionError}</Text>
          </View>
        )}

        {resolved && (
          <View style={[styles.statusBox, { backgroundColor: theme.colors.success + '10' }]}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.successText, { color: theme.colors.success }]}>
                Recipient found: @{resolved.nickname} ({resolved.globalId})
              </Text>
              <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                Has addresses: {resolved.wallets.map((w) => w.chainId).join(', ')}
              </Text>
            </View>
          </View>
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>From Network</Text>
        <View style={styles.chainGrid}>
          {SUPPORTED_CHAINS.map((chain) => (
            <TouchableOpacity
              key={chain.id}
              style={[
                styles.chainButton,
                {
                  backgroundColor: fromChainId === chain.id ? theme.colors.primary + '20' : theme.colors.surface,
                  borderColor: fromChainId === chain.id ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setFromChainId(chain.id)}
            >
              <Text style={styles.chainIcon}>{chain.icon}</Text>
              <Text
                style={[
                  styles.chainName,
                  { color: fromChainId === chain.id ? theme.colors.primary : theme.colors.text },
                ]}
              >
                {chain.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {resolved && toChainId && (
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Destination Network</Text>
          <View style={[styles.autoDetectedBox, { backgroundColor: theme.colors.primary + '10' }]}>
            <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.autoDetectedText, { color: theme.colors.primary }]}>
                Auto-detected: {SUPPORTED_CHAINS.find((c) => c.id === toChainId)?.icon} {toChainId}
              </Text>
              <Text style={[styles.autoDetectedHint, { color: theme.colors.textSecondary }]}>
                {resolved.tokenPreferences.find((p) => p.tokenSymbol === selectedToken)
                  ? `Based on ${resolved.nickname}'s token preference`
                  : `Based on ${resolved.nickname}'s wallet addresses`}
              </Text>
            </View>
          </View>
          {resolved.wallets.length === 0 && (
            <Text style={[styles.errorText, { color: theme.colors.error }]}>Recipient has no wallet addresses</Text>
          )}
        </Card>
      )}

      {isCrosschain && resolved && (
        <View style={[styles.warningBox, { backgroundColor: theme.colors.warning + '20' }]}>
          <Ionicons name="warning" size={20} color={theme.colors.warning} />
          <Text style={[styles.warningText, { color: theme.colors.warning }]}>
            Cross-chain transfer: {fromChainId} → {toChainId}
          </Text>
        </View>
      )}

      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Amount</Text>
        <View style={[styles.amountInputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.currencySymbol, { color: theme.colors.textSecondary }]}>$</Text>
          <TextInput
            style={[styles.amountInput, { color: theme.colors.text }]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>
        <Text style={[styles.balanceText, { color: theme.colors.textSecondary }]}>
          Balance: {balance} {selectedToken}
        </Text>
      </Card>

      {quoteError && (
        <View style={[styles.statusBox, { backgroundColor: theme.colors.error + '10', marginHorizontal: 16, marginBottom: 16 }]}>
          <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{quoteError}</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: !resolved || !amount || loadingQuote || sending ? theme.colors.border : theme.colors.success,
            },
          ]}
          onPress={handleGetQuote}
          disabled={!resolved || !amount || loadingQuote || sending}
          activeOpacity={0.8}
        >
          {loadingQuote || sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>{isCrosschain ? 'Get Quote' : 'Continue'}</Text>
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
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
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
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  hint: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  detailText: {
    fontSize: 12,
    marginTop: 2,
  },
  autoDetectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
  },
  autoDetectedText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  autoDetectedHint: {
    fontSize: 12,
    lineHeight: 16,
  },
  chainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    flex: 1,
    minWidth: '45%',
  },
  chainIcon: {
    fontSize: 18,
  },
  chainName: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
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
    fontSize: 24,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    paddingVertical: 14,
  },
  balanceText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  button: {
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
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  spacer: {
    height: 20,
  },
});
