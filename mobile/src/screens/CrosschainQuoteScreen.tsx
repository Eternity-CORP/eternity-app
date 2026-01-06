import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ethers } from 'ethers';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { MainStackParamList } from '../navigation/MainNavigator';
import Card from '../components/common/Card';
import { 
  compareQuotes, 
  prepareCrosschainTransaction, 
  CompareQuotesResponse 
} from '../services/api/crosschainService';
import { getSigner } from '../services/walletService';
import { getSelectedNetwork } from '../services/networkService';
import * as LocalAuthentication from 'expo-local-authentication';

type Props = NativeStackScreenProps<MainStackParamList, 'CrosschainQuote'>;

export default function CrosschainQuoteScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { activeAccount } = useWallet();
  const { params } = route.params;

  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<CompareQuotesResponse | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<number>(0);
  const [preparing, setPreparing] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await compareQuotes(params);
      setQuotes(result);
      // Auto-select recommended quote
      setSelectedQuote(0);
    } catch (error: any) {
      console.error('Failed to load quotes:', error);
      setError('Failed to load quotes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Authenticate user with biometrics before signing transaction
   */
  const authenticateUser = async (): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        // Fall back to confirmation if biometrics not available
        return true;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to sign transaction',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  };

  /**
   * Sign and send the cross-chain transaction
   */
  const signAndSendTransaction = async (txData: any): Promise<string> => {
    const network = await getSelectedNetwork();
    const signer = await getSigner(network);

    console.log('📝 [Crosschain] Signing transaction...');
    console.log('   To:', txData.to);
    console.log('   Value:', txData.value);
    console.log('   Data length:', txData.data?.length || 0);

    // Build transaction object
    const tx: ethers.providers.TransactionRequest = {
      to: txData.to,
      value: txData.value ? ethers.BigNumber.from(txData.value) : ethers.BigNumber.from(0),
      data: txData.data || '0x',
      gasLimit: txData.gasLimit ? ethers.BigNumber.from(txData.gasLimit) : undefined,
      gasPrice: txData.gasPrice ? ethers.BigNumber.from(txData.gasPrice) : undefined,
      maxFeePerGas: txData.maxFeePerGas ? ethers.BigNumber.from(txData.maxFeePerGas) : undefined,
      maxPriorityFeePerGas: txData.maxPriorityFeePerGas 
        ? ethers.BigNumber.from(txData.maxPriorityFeePerGas) 
        : undefined,
      chainId: txData.chainId,
    };

    // Send transaction
    const response = await signer.sendTransaction(tx);
    console.log('✅ [Crosschain] Transaction sent:', response.hash);

    return response.hash;
  };

  const handleConfirm = async () => {
    if (!quotes || !activeAccount) return;

    const quote = quotes.quotes[selectedQuote];

    Alert.alert(
      'Confirm Cross-Chain Transfer',
      `You will send ${params.amount} ${params.fromToken} on ${params.fromChainId}.\n\nRecipient will receive ~${quote.estimatedOutput} ${params.toToken} on ${params.toChainId}.\n\nProvider: ${quote.router}\nFee: ${quote.fee} ${quote.feeToken}\nTime: ~${Math.ceil(quote.durationSeconds / 60)} minutes\n\nContinue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setPreparing(true);

              // Step 1: Prepare transaction data from backend
              console.log('🔄 [Crosschain] Preparing transaction...');
              const txData = await prepareCrosschainTransaction(
                quote.router,
                quote.routeId,
                params.fromAddress,
                params.toAddress
              );

              console.log('✅ [Crosschain] Transaction prepared:', txData);

              // Step 2: Authenticate user
              setPreparing(false);
              setSigning(true);

              const authenticated = await authenticateUser();
              if (!authenticated) {
                Alert.alert('Authentication Failed', 'Please authenticate to sign the transaction.');
                setSigning(false);
                return;
              }

              // Step 3: Sign and send transaction
              const txHash = await signAndSendTransaction(txData.transaction);

              // Step 4: Navigate to status monitoring screen
              Alert.alert(
                '🚀 Transaction Sent!',
                `Your cross-chain transfer is being processed.\n\nTx Hash: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`,
                [
                  {
                    text: 'Track Status',
                    onPress: () => {
                      navigation.replace('CrosschainStatus', {
                        txHash,
                        router: quote.router,
                        fromChainId: params.fromChainId,
                        toChainId: params.toChainId,
                        amount: params.amount,
                        fromToken: params.fromToken,
                        toToken: params.toToken,
                        estimatedOutput: quote.estimatedOutput,
                        estimatedDuration: quote.durationSeconds,
                      });
                    }
                  },
                  {
                    text: 'Go Home',
                    style: 'cancel',
                    onPress: () => navigation.navigate('Home')
                  }
                ]
              );
            } catch (error: any) {
              console.error('❌ [Crosschain] Transaction failed:', error);
              
              let errorMessage = 'Failed to process transaction.';
              if (error.code === 'INSUFFICIENT_FUNDS') {
                errorMessage = 'Insufficient funds for gas fees.';
              } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
                errorMessage = 'Unable to estimate gas. The transaction may fail.';
              } else if (error.code === 'USER_REJECTED') {
                errorMessage = 'Transaction was rejected.';
              } else if (error.message) {
                errorMessage = error.message;
              }

              Alert.alert('Transaction Failed', errorMessage);
            } finally {
              setPreparing(false);
              setSigning(false);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Cross-Chain Quote</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Finding best routes...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !quotes) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.colors.text }]}>Cross-Chain Quote</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color={theme.colors.error} />
          <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
            {error || 'No routes available'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={loadQuotes}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Choose Route</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Transfer Summary */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>From</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {params.fromChainId}
              </Text>
              <Text style={[styles.summaryAmount, { color: theme.colors.text }]}>
                {params.amount} {params.fromToken}
              </Text>
            </View>

            <Ionicons name="arrow-forward" size={24} color={theme.colors.primary} />

            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>To</Text>
              <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
                {params.toChainId}
              </Text>
              <Text style={[styles.summaryAmount, { color: theme.colors.success }]}>
                ~{quotes.quotes[selectedQuote].estimatedOutput} {params.toToken}
              </Text>
            </View>
          </View>
        </Card>

        {/* Route Options */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Available Routes ({quotes.quotes.length})
          </Text>
        </View>

        {quotes.quotes.map((quote, index) => {
          const isSelected = selectedQuote === index;
          const isRecommended = index === 0;
          const isCheapest = quotes.quotes.every(q => parseFloat(quote.fee) <= parseFloat(q.fee));
          const isFastest = quotes.quotes.every(q => quote.durationSeconds <= q.durationSeconds);

          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.quoteCard,
                {
                  backgroundColor: isSelected ? theme.colors.primary + '10' : theme.colors.surface,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                },
              ]}
              onPress={() => setSelectedQuote(index)}
              activeOpacity={0.7}
            >
              {/* Badges */}
              <View style={styles.badgesRow}>
                {isRecommended && (
                  <View style={[styles.badge, { backgroundColor: theme.colors.success + '20' }]}>
                    <Ionicons name="star" size={12} color={theme.colors.success} />
                    <Text style={[styles.badgeText, { color: theme.colors.success }]}>
                      Recommended
                    </Text>
                  </View>
                )}
                {isCheapest && (
                  <View style={[styles.badge, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Ionicons name="cash-outline" size={12} color={theme.colors.primary} />
                    <Text style={[styles.badgeText, { color: theme.colors.primary }]}>
                      Cheapest
                    </Text>
                  </View>
                )}
                {isFastest && (
                  <View style={[styles.badge, { backgroundColor: theme.colors.accent + '20' }]}>
                    <Ionicons name="flash-outline" size={12} color={theme.colors.accent} />
                    <Text style={[styles.badgeText, { color: theme.colors.accent }]}>
                      Fastest
                    </Text>
                  </View>
                )}
              </View>

              {/* Provider */}
              <Text style={[styles.providerName, { color: theme.colors.text }]}>
                {quote.router}
              </Text>

              {/* Route Details */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                    You'll receive
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.success }]}>
                    ~{quote.estimatedOutput} {params.toToken}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                    Fee
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    {quote.fee} {quote.feeToken}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                    Time
                  </Text>
                  <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                    ~{Math.ceil(quote.durationSeconds / 60)} min
                  </Text>
                </View>

                {quote.priceImpact && (
                  <View style={styles.detailItem}>
                    <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>
                      Price Impact
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.colors.warning }]}>
                      {quote.priceImpact}
                    </Text>
                  </View>
                )}
              </View>

              {/* Selection Indicator */}
              {isSelected && (
                <View style={[styles.selectedIndicator, { backgroundColor: theme.colors.primary }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Info Box */}
        <View style={[styles.infoBox, { backgroundColor: theme.colors.accent + '10' }]}>
          <Ionicons name="information-circle" size={20} color={theme.colors.accent} />
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            Cross-chain transfers use bridge protocols. The transaction will be processed in multiple steps and may take several minutes to complete.
          </Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>

      {/* Confirm Button */}
      <View style={[styles.footer, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            {
              backgroundColor: (preparing || signing) ? theme.colors.border : theme.colors.success,
            },
          ]}
          onPress={handleConfirm}
          disabled={preparing || signing}
          activeOpacity={0.8}
        >
          {preparing ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={[styles.confirmButtonSubtext, { marginTop: 4 }]}>
                Preparing transaction...
              </Text>
            </>
          ) : signing ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={[styles.confirmButtonSubtext, { marginTop: 4 }]}>
                Signing transaction...
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.confirmButtonText}>Confirm & Sign</Text>
              <Text style={styles.confirmButtonSubtext}>
                via {quotes.quotes[selectedQuote].router}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    padding: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '500',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quoteCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 6,
    borderWidth: 1,
    position: 'relative',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 6,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  spacer: {
    height: 20,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  confirmButton: {
    height: 48,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confirmButtonSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
});
