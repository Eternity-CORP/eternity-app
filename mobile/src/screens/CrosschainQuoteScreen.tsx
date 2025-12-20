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
import { useTheme } from '../context/ThemeContext';
import { MainStackParamList } from '../navigation/MainNavigator';
import Card from '../components/common/Card';
import { compareQuotes, prepareCrosschainTransaction, CompareQuotesResponse } from '../services/api/crosschainService';

type Props = NativeStackScreenProps<MainStackParamList, 'CrosschainQuote'>;

export default function CrosschainQuoteScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { params } = route.params;

  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<CompareQuotesResponse | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<number>(0);
  const [preparing, setPreparing] = useState(false);
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

  const handleConfirm = async () => {
    if (!quotes) return;

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

              const txData = await prepareCrosschainTransaction(
                quote.router,
                quote.routeId,
                params.fromAddress,
                params.toAddress
              );

              Alert.alert(
                'Transaction Ready',
                'Transaction prepared successfully! Sign it in your wallet to complete the cross-chain transfer.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // TODO: Integrate with wallet signing
                      navigation.navigate('Home');
                    }
                  }
                ]
              );
            } catch (error: any) {
              console.error('Failed to prepare transaction:', error);
              Alert.alert('Error', 'Failed to prepare transaction. Please try again.');
            } finally {
              setPreparing(false);
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
              backgroundColor: preparing ? theme.colors.border : theme.colors.success,
            },
          ]}
          onPress={handleConfirm}
          disabled={preparing}
          activeOpacity={0.8}
        >
          {preparing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.confirmButtonText}>Confirm Transfer</Text>
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
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  quoteCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  providerName: {
    fontSize: 18,
    fontWeight: '700',
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
    fontSize: 15,
    fontWeight: '600',
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
    padding: 14,
    borderRadius: 12,
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
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmButtonSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
});
