import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { MainStackParamList } from '../navigation/MainNavigator';
import Card from '../components/common/Card';
import ModalInput from '../components/common/ModalInput';
import { resolveIdentifier, ResolvedIdentity } from '../services/api/identityService';
import { sendETH, estimateGas } from '../services/blockchain/transactionService';
import { getETHBalance, formatBalance } from '../services/blockchain/balanceService';

type Props = NativeStackScreenProps<MainStackParamList, 'SendByIdentifier'>;

const SUPPORTED_CHAINS = [
  { id: 'sepolia', name: 'Sepolia', icon: '🟦' },
  { id: 'mainnet', name: 'Mainnet', icon: '🔷' },
  { id: 'holesky', name: 'Holesky', icon: '🟣' },
];

// Токены доступные на Sepolia
const SEPOLIA_TOKENS = ['ETH'];
// Токены доступные на Mainnet
const MAINNET_TOKENS = ['ETH', 'USDC', 'USDT', 'DAI'];

export default function SendByIdentifierScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { activeAccount } = useWallet();

  // Form state
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('ETH');
  const [fromChainId, setFromChainId] = useState('sepolia');
  const [toChainId, setToChainId] = useState('');

  // Modal visibility state
  const [recipientModalVisible, setRecipientModalVisible] = useState(false);
  const [amountModalVisible, setAmountModalVisible] = useState(false);

  // Доступные токены в зависимости от выбранной сети
  const availableTokens = fromChainId === 'sepolia' ? SEPOLIA_TOKENS : MAINNET_TOKENS;

  // Resolution state
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<ResolvedIdentity | null>(null);
  const [resolutionError, setResolutionError] = useState('');

  // Quote state
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  // Transaction state
  const [sending, setSending] = useState(false);

  // Balance state
  const [balance, setBalance] = useState<string>('0');

  // Load balance when chain or token changes
  useEffect(() => {
    const loadBalance = async () => {
      if (!activeAccount?.address) return;
      
      try {
        // Для ETH используем getETHBalance
        if (selectedToken === 'ETH') {
          const { getETHBalance, formatBalance } = await import('../services/blockchain/balanceService');
          const balanceBN = await getETHBalance(activeAccount.address, fromChainId as any);
          const formatted = formatBalance(balanceBN);
          setBalance(formatted);
        } else {
          // Для ERC-20 токенов (пока не реализовано)
          setBalance('0');
        }
      } catch (error) {
        console.error('Failed to load balance:', error);
        setBalance('0');
      }
    };

    loadBalance();
  }, [activeAccount?.address, fromChainId, selectedToken]);

  // Reset token if not available on selected chain
  useEffect(() => {
    if (!availableTokens.includes(selectedToken)) {
      setSelectedToken(availableTokens[0]);
    }
  }, [fromChainId]);

  // Resolve recipient when input changes
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

  // Auto-select toChainId based on preferences
  useEffect(() => {
    if (resolved) {
      // Check if recipient has preference for this token
      const pref = resolved.tokenPreferences.find(
        p => p.tokenSymbol === selectedToken
      );
      if (pref) {
        setToChainId(pref.preferredChainId);
      } else {
        // Если у получателя есть кошелёк на той же сети - используем её
        const sameChainWallet = resolved.wallets.find(w => w.chainId === fromChainId);
        if (sameChainWallet) {
          setToChainId(fromChainId);
        } else if (resolved.wallets.length > 0) {
          // Иначе используем первый доступный кошелёк
          setToChainId(resolved.wallets[0].chainId);
        } else {
          // Если нет кошельков, используем fromChainId (получатель добавит адрес позже)
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

      // Check balance
      const currentBalance = parseFloat(balance);
      const sendAmount = parseFloat(amount);
      
      if (sendAmount > currentBalance) {
        Alert.alert('Insufficient Balance', `You only have ${balance} ${selectedToken}`);
        return;
      }

      // Estimate gas
      console.log('💰 Estimating gas...');
      const gasEstimate = await estimateGas(toAddress, amount, fromChainId as any);
      const totalCost = sendAmount + parseFloat(gasEstimate.feeEth);

      if (totalCost > currentBalance) {
        Alert.alert(
          'Insufficient Balance',
          `Total cost (${totalCost.toFixed(6)} ETH) exceeds your balance (${balance} ETH)\n\nAmount: ${amount} ETH\nGas Fee: ${gasEstimate.feeEth} ETH`
        );
        return;
      }

      // Send transaction
      console.log('📤 Sending transaction...');
      const result = await sendETH(toAddress, amount, fromChainId as any);
      
      console.log('✅ Transaction sent:', result.txHash);

      // Show success with transaction hash
      Alert.alert(
        'Transaction Sent! 🎉',
        `Amount: ${amount} ${selectedToken}\nTo: @${resolved?.nickname}\nNetwork: ${fromChainId}\n\nTransaction Hash:\n${result.txHash}\n\nYou can view it on Etherscan.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setRecipient('');
              setAmount('');
              setResolved(null);
              // Navigate back to home
              navigation.goBack();
            }
          }
        ]
      );

      // Reload balance
      const newBalanceBN = await getETHBalance(activeAccount.address, fromChainId as any);
      setBalance(formatBalance(newBalanceBN));

    } catch (error: any) {
      console.error('❌ Transaction failed:', error);
      
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

    // Check if recipient has address for toChainId
    const hasAddress = resolved.wallets.some(w => w.chainId === toChainId);
    if (!hasAddress) {
      Alert.alert(
        'No Address',
        `@${resolved.nickname} doesn't have a ${toChainId} address yet. Try selecting a different network.`
      );
      return;
    }

    const toAddress = resolved.wallets.find(w => w.chainId === toChainId)?.address;
    if (!toAddress) return;

    // If same chain, no need for quote - send directly
    if (fromChainId === toChainId) {
      Alert.alert(
        'Ready to Send',
        `Send ${amount} ${selectedToken} to @${resolved.nickname} on ${toChainId}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Send', onPress: () => handleSendTransaction(toAddress) }
        ]
      );
      return;
    }

    // Navigate to crosschain quote screen
    try {
      setLoadingQuote(true);
      setQuoteError('');

      // Navigate to quote comparison screen
      navigation.navigate('CrosschainQuote', {
        params: {
          fromChainId,
          toChainId,
          fromToken: selectedToken,
          toToken: selectedToken,
          amount,
          fromAddress: activeAccount.address,
          toAddress,
        },
      });
    } catch (error: any) {
      console.error('Navigation error:', error);
      setQuoteError('Failed to navigate to quote screen');
    } finally {
      setLoadingQuote(false);
    }
  };

  const isCrosschain = fromChainId !== toChainId;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Send by Nickname</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Recipient Input */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>To</Text>
          <TouchableOpacity
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
            onPress={() => setRecipientModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="person-outline"
              size={20}
              color={theme.colors.textSecondary}
              style={styles.inputIcon}
            />
            <View style={[styles.input, { justifyContent: 'center' }]}>
              <Text style={[{ color: recipient ? theme.colors.text : theme.colors.textSecondary }]}>
                {recipient || '@nickname, EY-XXX or 0x...'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.hintBox, { backgroundColor: theme.colors.accent + '10' }]}>
            <Ionicons name="information-circle" size={16} color={theme.colors.accent} />
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
              You can enter @nickname, Global ID (EY-XXX) or wallet address
            </Text>
          </View>

          {/* Resolution Status */}
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
                  Has addresses: {resolved.wallets.map(w => w.chainId).join(', ')}
                </Text>
                {resolved.tokenPreferences.length > 0 && (
                  <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                    Prefers: {resolved.tokenPreferences.map(p => `${p.tokenSymbol}→${p.preferredChainId}`).join(', ')}
                  </Text>
                )}
              </View>
            </View>
          )}
        </Card>

        {/* From Network */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>From Network</Text>
          <View style={styles.chainGrid}>
            {SUPPORTED_CHAINS.map(chain => (
              <TouchableOpacity
                key={chain.id}
                style={[
                  styles.chainButton,
                  {
                    backgroundColor: fromChainId === chain.id
                      ? theme.colors.primary + '20'
                      : theme.colors.surface,
                    borderColor: fromChainId === chain.id
                      ? theme.colors.primary
                      : theme.colors.border,
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

        {/* To Network */}
        {resolved && (
          <Card style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>To Network</Text>
            <View style={styles.chainGrid}>
              {SUPPORTED_CHAINS.filter(chain =>
                resolved.wallets.some(w => w.chainId === chain.id)
              ).map(chain => (
                <TouchableOpacity
                  key={chain.id}
                  style={[
                    styles.chainButton,
                    {
                      backgroundColor: toChainId === chain.id
                        ? theme.colors.primary + '20'
                        : theme.colors.surface,
                      borderColor: toChainId === chain.id
                        ? theme.colors.primary
                        : theme.colors.border,
                    },
                  ]}
                  onPress={() => setToChainId(chain.id)}
                >
                  <Text style={styles.chainIcon}>{chain.icon}</Text>
                  <Text
                    style={[
                      styles.chainName,
                      { color: toChainId === chain.id ? theme.colors.primary : theme.colors.text },
                    ]}
                  >
                    {chain.name}
                  </Text>
                  {resolved.tokenPreferences.some(
                    p => p.tokenSymbol === selectedToken && p.preferredChainId === chain.id
                  ) && (
                    <Text style={styles.preferredBadge}>⭐</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {resolved.wallets.length === 0 && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>
                Recipient has no wallet addresses
              </Text>
            )}
          </Card>
        )}

        {/* Crosschain Warning */}
        {isCrosschain && resolved && (
          <View style={[styles.warningBox, { backgroundColor: theme.colors.warning + '20' }]}>
            <Ionicons name="warning" size={20} color={theme.colors.warning} />
            <Text style={[styles.warningText, { color: theme.colors.warning }]}>
              Cross-chain transfer: {fromChainId} → {toChainId}
            </Text>
          </View>
        )}

        {/* Token */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Token</Text>
          <View style={styles.tokenGrid}>
            {availableTokens.map((token: string) => (
              <TouchableOpacity
                key={token}
                style={[
                  styles.tokenButton,
                  {
                    backgroundColor: selectedToken === token
                      ? theme.colors.primary + '20'
                      : theme.colors.surface,
                    borderColor: selectedToken === token
                      ? theme.colors.primary
                      : theme.colors.border,
                  },
                ]}
                onPress={() => setSelectedToken(token)}
              >
                <Text
                  style={[
                    styles.tokenText,
                    { color: selectedToken === token ? theme.colors.primary : theme.colors.text },
                  ]}
                >
                  {token}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Amount */}
        <Card style={styles.card}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Amount</Text>
          <TouchableOpacity
            style={[
              styles.amountInputContainer,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => setAmountModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.currencySymbol, { color: theme.colors.textSecondary }]}>$</Text>
            <View style={[styles.amountInput, { justifyContent: 'center' }]}>
              <Text style={[{ color: amount ? theme.colors.text : theme.colors.textSecondary }]}>
                {amount || '0.00'}
              </Text>
            </View>
          </TouchableOpacity>
          <Text style={[styles.balanceText, { color: theme.colors.textSecondary }]}>
            Balance: {balance} {selectedToken}
          </Text>
        </Card>

        {/* Quote Error */}
        {quoteError && (
          <View style={[styles.statusBox, { backgroundColor: theme.colors.error + '10', marginHorizontal: 16, marginBottom: 16 }]}>
            <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{quoteError}</Text>
          </View>
        )}

        {/* Action Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: (!resolved || !amount || loadingQuote || sending)
                  ? theme.colors.border
                  : theme.colors.success,
              },
            ]}
            onPress={handleGetQuote}
            disabled={!resolved || !amount || loadingQuote || sending}
            activeOpacity={0.8}
          >
            {(loadingQuote || sending) ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>
                {isCrosschain ? 'Get Quote' : 'Continue'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Recipient Modal Input */}
      <ModalInput
        visible={recipientModalVisible}
        onClose={() => setRecipientModalVisible(false)}
        value={recipient}
        onChangeText={setRecipient}
        title="Enter Recipient"
        placeholder="@nickname, EY-XXX or 0x..."
        autoCapitalize="none"
        helperText="You can enter @nickname, Global ID (EY-XXX) or wallet address"
        errorText={resolutionError}
      />

      {/* Amount Modal Input */}
      <ModalInput
        visible={amountModalVisible}
        onClose={() => setAmountModalVisible(false)}
        value={amount}
        onChangeText={setAmount}
        title="Enter Amount"
        placeholder="0.00"
        keyboardType="decimal-pad"
        helperText={`Balance: ${balance} ${selectedToken}`}
      />
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
  content: {
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
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 6,
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
    borderRadius: 6,
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
  chainGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    minWidth: '45%',
  },
  chainIcon: {
    fontSize: 18,
  },
  chainName: {
    fontSize: 12,
    fontWeight: '500',
  },
  preferredBadge: {
    fontSize: 14,
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
  tokenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tokenButton: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  tokenText: {
    fontSize: 12,
    fontWeight: '500',
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
    height: 48,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
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
