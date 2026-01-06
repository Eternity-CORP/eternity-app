/**
 * SendByBlikMode - Pay existing BLIK code
 */

import React, { useState } from 'react';
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
import {
  getBlikCodeInfo,
  getBlikQuote,
  executeBlikPayment,
  BlikRequestInfo,
  BlikQuote,
} from '../../services/api/blikService';
import { loginWithWallet } from '../../services/authService';
import { sendETH, estimateGas } from '../../services/blockchain/transactionService';
import { getETHBalance, formatBalance } from '../../services/blockchain/balanceService';

interface Props {
  navigation: any;
}

const SUPPORTED_CHAINS = [
  { id: 'sepolia', name: 'Sepolia', icon: '🟦' },
  { id: 'mainnet', name: 'Mainnet', icon: '🔷' },
  { id: 'holesky', name: 'Holesky', icon: '🟣' },
];

export default function SendByBlikMode({ navigation }: Props) {
  const { theme } = useTheme();
  const { activeAccount } = useWallet();

  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [requestInfo, setRequestInfo] = useState<BlikRequestInfo | null>(null);
  const [error, setError] = useState('');

  const [selectedChain, setSelectedChain] = useState('sepolia');
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quote, setQuote] = useState<BlikQuote | null>(null);

  const [executing, setExecuting] = useState(false);
  const [balance, setBalance] = useState<string>('0');

  React.useEffect(() => {
    const loadBalance = async () => {
      if (!activeAccount?.address) return;

      try {
        const balanceBN = await getETHBalance(activeAccount.address, selectedChain as any);
        const formatted = formatBalance(balanceBN);
        setBalance(formatted);
      } catch (error) {
        console.error('Failed to load balance:', error);
        setBalance('0');
      }
    };

    loadBalance();
  }, [activeAccount, selectedChain]);

  const handleCheckCode = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please enter a payment code');
      return;
    }

    try {
      setChecking(true);
      setError('');
      const info = await getBlikCodeInfo(code.trim().toUpperCase());
      setRequestInfo(info);
    } catch (error: any) {
      if (error.message === 'CODE_NOT_FOUND') {
        setError('Invalid code. Please check and try again.');
      } else if (error.message === 'CODE_EXPIRED') {
        setError('This code has expired. Ask the recipient to create a new one.');
      } else {
        setError('Failed to check code');
      }
      setRequestInfo(null);
    } finally {
      setChecking(false);
    }
  };

  const handleGetQuote = async () => {
    if (!requestInfo) return;

    if (!activeAccount?.address) {
      Alert.alert('Error', 'No active wallet found');
      return;
    }

    try {
      setLoadingQuote(true);
      const token = await loginWithWallet(activeAccount.address);

      if (!token) {
        Alert.alert('Error', 'Failed to authenticate. Please try again.');
        return;
      }

      const quoteResult = await getBlikQuote(token, requestInfo.code, selectedChain, activeAccount.address);

      setQuote(quoteResult);
    } catch (error) {
      Alert.alert('Error', 'Failed to get quote');
    } finally {
      setLoadingQuote(false);
    }
  };

  const handleSendRealTransaction = async () => {
    if (!requestInfo || !activeAccount?.address) return;

    try {
      setExecuting(true);

      const toAddress = requestInfo.toUser.wallets?.find((w) => w.chainId === selectedChain)?.address;
      if (!toAddress) {
        Alert.alert('Error', `Recipient doesn't have ${selectedChain} address`);
        return;
      }

      const currentBalance = parseFloat(balance);
      const sendAmount = parseFloat(requestInfo.amount);

      if (sendAmount > currentBalance) {
        Alert.alert('Insufficient Balance', `You only have ${balance} ${requestInfo.tokenSymbol}`);
        return;
      }

      const gasEstimate = await estimateGas(toAddress, requestInfo.amount, selectedChain as any);
      const totalCost = sendAmount + parseFloat(gasEstimate.feeEth);

      if (totalCost > currentBalance) {
        Alert.alert(
          'Insufficient Balance',
          `Total cost (${totalCost.toFixed(6)} ETH) exceeds your balance (${balance} ETH)\n\nAmount: ${requestInfo.amount} ETH\nGas Fee: ${gasEstimate.feeEth} ETH`
        );
        return;
      }

      const result = await sendETH(toAddress, requestInfo.amount, selectedChain as any);

      const token = await loginWithWallet(activeAccount.address);
      if (token) {
        try {
          await executeBlikPayment(token, {
            code: requestInfo.code,
            fromChainId: selectedChain,
            fromAddress: activeAccount.address,
            txHash: result.txHash,
          });
        } catch (error) {
          console.warn('Failed to update backend, but transaction was sent:', error);
        }
      }

      Alert.alert(
        'Payment Sent!',
        `Amount: ${requestInfo.amount} ${requestInfo.tokenSymbol}\nTo: @${requestInfo.toUser.nickname}\nNetwork: ${selectedChain}\n\nTransaction Hash:\n${result.txHash}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );

      const newBalanceBN = await getETHBalance(activeAccount.address, selectedChain as any);
      setBalance(formatBalance(newBalanceBN));
    } catch (error: any) {
      console.error('BLIK payment failed:', error);

      let errorMessage = 'Failed to send payment';

      if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient funds for transaction + gas';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction + gas';
      } else if (error.message?.includes('user rejected')) {
        errorMessage = 'Transaction cancelled';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Payment Failed', errorMessage);
    } finally {
      setExecuting(false);
    }
  };

  const handleExecuteViaBackend = async () => {
    if (!requestInfo || !quote || !activeAccount?.address) return;

    try {
      setExecuting(true);
      const token = await loginWithWallet(activeAccount.address);

      if (!token) {
        Alert.alert('Error', 'Failed to authenticate. Please try again.');
        return;
      }

      const result = await executeBlikPayment(token, {
        code: requestInfo.code,
        fromChainId: selectedChain,
        fromAddress: activeAccount.address,
        routeId: quote.quote?.provider === 'Rango' ? 'route-id' : undefined,
      });

      Alert.alert('Success!', `Payment sent successfully!\nTx: ${result.txHash.slice(0, 10)}...`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      if (error.message === 'CODE_ALREADY_USED') {
        Alert.alert('Error', 'This code has already been used by another user');
      } else if (error.message === 'CANNOT_PAY_YOURSELF') {
        Alert.alert('Error', 'You cannot pay yourself');
      } else {
        Alert.alert('Error', 'Payment failed. Please try again.');
      }
    } finally {
      setExecuting(false);
    }
  };

  const handleExecute = async () => {
    if (!requestInfo || !quote || !activeAccount?.address) return;

    const isSameChain = selectedChain === requestInfo.preferredChainId;

    Alert.alert(
      'Confirm Payment',
      `Send ${requestInfo.amount} ${requestInfo.tokenSymbol} to @${requestInfo.toUser.nickname}?\n\nNetwork: ${selectedChain}${
        !isSameChain ? ' → ' + requestInfo.preferredChainId : ''
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            if (isSameChain && requestInfo.tokenSymbol === 'ETH') {
              await handleSendRealTransaction();
            } else {
              await handleExecuteViaBackend();
            }
          },
        },
      ]
    );
  };

  const isCrosschain = requestInfo?.preferredChainId && selectedChain !== requestInfo.preferredChainId;

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Enter Payment Code</Text>
        <View style={[styles.codeInputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary }]}>
          <TextInput
            style={[styles.codeInput, { color: theme.colors.text }]}
            value={code}
            onChangeText={(text) => setCode(text.toUpperCase())}
            placeholder="A1B2C3"
            maxLength={6}
            autoCapitalize="characters"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <View style={[styles.hintBox, { backgroundColor: theme.colors.accent + '10' }]}>
          <Ionicons name="information-circle" size={16} color={theme.colors.accent} />
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>Enter the 6-digit code from the recipient</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.checkButton,
            {
              backgroundColor: !code || checking ? theme.colors.border : theme.colors.primary,
            },
          ]}
          onPress={handleCheckCode}
          disabled={!code || checking}
          activeOpacity={0.8}
        >
          {checking ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.buttonText}>Check Code</Text>}
        </TouchableOpacity>

        {error && (
          <View style={[styles.statusBox, { backgroundColor: theme.colors.error + '10' }]}>
            <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          </View>
        )}
      </Card>

      {requestInfo && (
        <>
          <View style={[styles.successBanner, { backgroundColor: theme.colors.success + '10' }]}>
            <Ionicons name="checkmark-circle" size={24} color={theme.colors.success} />
            <Text style={[styles.successText, { color: theme.colors.success }]}>Code Valid</Text>
          </View>

          <Card style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Payment Request</Text>

            <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>From</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>@{requestInfo.toUser.nickname}</Text>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Amount</Text>
              <Text style={[styles.infoValue, styles.amountValue, { color: theme.colors.primary }]}>
                {requestInfo.amount} {requestInfo.tokenSymbol}
              </Text>
            </View>

            {requestInfo.preferredChainId && (
              <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Preferred Network</Text>
                <Text style={[styles.infoValue, styles.chainValue, { color: theme.colors.primary }]}>{requestInfo.preferredChainId}</Text>
              </View>
            )}

            <View style={[styles.infoRow, { borderBottomColor: 'transparent' }]}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: theme.colors.warning + '20' }]}>
                <Text style={[styles.statusText, { color: theme.colors.warning }]}>{requestInfo.status}</Text>
              </View>
            </View>
          </Card>

          <Card style={styles.card}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Pay From Network</Text>
            <View style={styles.chainGrid}>
              {SUPPORTED_CHAINS.map((chain) => (
                <TouchableOpacity
                  key={chain.id}
                  style={[
                    styles.chainButton,
                    {
                      backgroundColor: selectedChain === chain.id ? theme.colors.primary + '20' : theme.colors.surface,
                      borderColor: selectedChain === chain.id ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedChain(chain.id);
                    setQuote(null);
                  }}
                >
                  <Text style={styles.chainIcon}>{chain.icon}</Text>
                  <Text style={[styles.chainName, { color: selectedChain === chain.id ? theme.colors.primary : theme.colors.text }]}>
                    {chain.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {isCrosschain && (
            <View style={[styles.warningBox, { backgroundColor: theme.colors.warning + '20' }]}>
              <Ionicons name="warning" size={20} color={theme.colors.warning} />
              <Text style={[styles.warningText, { color: theme.colors.warning }]}>
                Cross-chain required: {selectedChain} → {requestInfo.preferredChainId}
              </Text>
            </View>
          )}

          {!quote && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: loadingQuote ? theme.colors.border : theme.colors.primary,
                  },
                ]}
                onPress={handleGetQuote}
                disabled={loadingQuote}
                activeOpacity={0.8}
              >
                {loadingQuote ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>{isCrosschain ? 'Get Quote' : 'Continue'}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {quote && quote.quote && (
            <Card style={styles.card}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quote</Text>

              <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Provider</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>{quote.quote.provider}</Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>You'll receive</Text>
                <Text style={[styles.infoValue, styles.amountValue, { color: theme.colors.primary }]}>
                  ~{quote.quote.estimatedOutput} {requestInfo.tokenSymbol}
                </Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Fee</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>{quote.quote.fee}</Text>
              </View>

              <View style={[styles.infoRow, { borderBottomColor: 'transparent' }]}>
                <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Time</Text>
                <Text style={[styles.infoValue, { color: theme.colors.text }]}>~{Math.ceil(quote.quote.duration / 60)} min</Text>
              </View>
            </Card>
          )}

          {quote && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    backgroundColor: executing ? theme.colors.border : theme.colors.success,
                  },
                ]}
                onPress={handleExecute}
                disabled={executing}
                activeOpacity={0.8}
              >
                {executing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.buttonText}>Confirm & Send</Text>}
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      <View style={styles.spacer} />
    </View>
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
  codeInputContainer: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
  },
  codeInput: {
    fontSize: 24,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 10,
    letterSpacing: 6,
    fontFamily: 'monospace',
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  hint: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  checkButton: {
    height: 46,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 6,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 6,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  successText: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 16,
  },
  chainValue: {
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chainGrid: {
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
  },
  chainIcon: {
    fontSize: 18,
  },
  chainName: {
    fontSize: 12,
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 6,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
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
