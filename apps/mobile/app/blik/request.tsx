/**
 * BLIK Request Screen (Receiver)
 * Create a BLIK code with amount and token selection
 */

import { StyleSheet, View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount, selectIsTestAccount } from '@/src/store/slices/wallet-slice';
import { receiverStartCreating, receiverCodeCreated, receiverError } from '@/src/store/slices/blik-slice';
import { blikSocket } from '@/src/services/blik-service';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import { sanitizeAmountInput } from '@/src/utils/format';
import { SUPPORTED_NETWORKS, TIER1_NETWORK_IDS, resolveChainId, validateBlikAmount, BLIK_MAX_AMOUNT, type NetworkId } from '@e-y/shared';

export default function BlikRequestScreen() {
  const { theme: dynamicTheme } = useTheme();
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const blik = useAppSelector((state) => state.blik);
  const balance = useAppSelector((state) => state.balance);
  const isTestAccount = useAppSelector(selectIsTestAccount);
  const currentAccount = getCurrentAccount(wallet);

  // Get available tokens from balance (only show tokens user actually has)
  const availableTokens = balance.balances
    .filter(t => parseFloat(t.balance) > 0)
    .map(t => t.symbol);

  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState(availableTokens[0] || 'ETH');
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkId>('base');
  const [isConnecting, setIsConnecting] = useState(false);

  // Redirect to waiting if code is already active
  useEffect(() => {
    if (blik.receiver.status === 'waiting' && blik.receiver.activeCode) {
      router.replace('/blik/waiting');
    }
  }, [blik.receiver.status, blik.receiver.activeCode]);

  // Update selected token when balance loads or changes
  useEffect(() => {
    if (availableTokens.length > 0 && !availableTokens.includes(selectedToken)) {
      setSelectedToken(availableTokens[0]);
    }
  }, [availableTokens]);

  // Set up BLIK socket callbacks
  useEffect(() => {
    blikSocket.setCallbacks({
      onCodeCreated: (payload) => {
        dispatch(receiverCodeCreated(payload));
        router.push('/blik/waiting');
      },
      onError: (error) => {
        dispatch(receiverError(error.message));
      },
    });

    return () => {
      blikSocket.clearCallbacks();
    };
  }, [dispatch]);

  const handleNumberPress = (num: string) => {
    const newInput = amount + num;
    const sanitized = sanitizeAmountInput(newInput, amount);
    if (sanitized === null) return;
    // Limit to 6 decimal places
    if (sanitized.includes('.')) {
      const decimalPlaces = sanitized.split('.')[1]?.length || 0;
      if (decimalPlaces > 6) return;
    }
    setAmount(sanitized);
    if (amountError) setAmountError(null);
  };

  const handleBackspace = () => {
    setAmount((prev) => prev.slice(0, -1));
    if (amountError) setAmountError(null);
  };

  const handleGenerateCode = async () => {
    if (!amount || !currentAccount) return;

    // Validate amount range
    const validationError = validateBlikAmount(amount);
    if (validationError) {
      setAmountError(validationError);
      return;
    }

    setIsConnecting(true);
    dispatch(receiverStartCreating());

    try {
      // Connect to BLIK socket
      await blikSocket.connect(currentAccount.address);

      // Create code — use Sepolia chainId for test accounts, selected network for real accounts
      const chainId = resolveChainId(isTestAccount, selectedNetwork);
      blikSocket.createCode({
        amount,
        tokenSymbol: selectedToken,
        chainId,
        receiverAddress: currentAccount.address,
        receiverUsername: undefined,
      });
    } catch (error) {
      dispatch(receiverError('Failed to connect to server'));
    } finally {
      setIsConnecting(false);
    }
  };

  const isValid = amount && parseFloat(amount) > 0 && parseFloat(amount) <= BLIK_MAX_AMOUNT && availableTokens.length > 0;
  const isLoading = blik.receiver.status === 'creating' || isConnecting;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Request Payment" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.content}>
          {/* Amount Display */}
          <View style={styles.amountDisplay}>
            <Text style={[styles.amountText, theme.typography.displayLarge, { color: dynamicTheme.colors.textPrimary }]}>
              {amount || '0'}
            </Text>
            <Text style={[styles.tokenText, theme.typography.heading, { color: dynamicTheme.colors.textSecondary }]}>
              {selectedToken}
            </Text>
          </View>

          {/* Network Selection — only visible for real accounts */}
          {!isTestAccount && (
            <View style={styles.networkSelectorContainer}>
              <Text style={[styles.networkSelectorLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                Network
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {TIER1_NETWORK_IDS.map((id) => {
                  const net = SUPPORTED_NETWORKS[id];
                  const isSelected = id === selectedNetwork;
                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => setSelectedNetwork(id)}
                      style={[
                        styles.networkChip,
                        {
                          borderColor: isSelected ? net.color + '60' : 'rgba(255,255,255,0.08)',
                          backgroundColor: isSelected ? net.color + '20' : 'transparent',
                        },
                      ]}
                    >
                      <Text style={[styles.networkChipText, { color: isSelected ? net.color : dynamicTheme.colors.textSecondary }]}>
                        {net.shortName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Token Selection */}
          <View style={styles.tokenSelector}>
            {availableTokens.length > 0 ? (
              availableTokens.map((token) => (
                <TouchableOpacity
                  key={token}
                  style={[
                    styles.tokenChip,
                    { backgroundColor: dynamicTheme.colors.surface },
                    selectedToken === token && { borderColor: dynamicTheme.colors.buttonPrimary, backgroundColor: dynamicTheme.colors.buttonPrimary + '10' },
                  ]}
                  onPress={() => setSelectedToken(token)}
                >
                  <Text
                    style={[
                      styles.tokenChipText,
                      theme.typography.body,
                      { color: dynamicTheme.colors.textPrimary },
                      selectedToken === token && styles.tokenChipTextSelected,
                    ]}
                  >
                    {token}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={[theme.typography.caption, { color: dynamicTheme.colors.textTertiary }]}>
                No tokens available
              </Text>
            )}
          </View>

          {/* Keypad */}
          <View style={styles.keypad}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map((key) => (
              <TouchableOpacity
                key={key}
                style={[styles.keypadButton, { backgroundColor: dynamicTheme.colors.surface }]}
                onPress={() => {
                  if (key === 'backspace') {
                    handleBackspace();
                  } else {
                    handleNumberPress(key);
                  }
                }}
              >
                {key === 'backspace' ? (
                  <FontAwesome name="arrow-left" size={20} color={dynamicTheme.colors.textPrimary} />
                ) : (
                  <Text style={[styles.keypadText, theme.typography.title, { color: dynamicTheme.colors.textPrimary }]}>{key}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Amount Validation Error */}
          {amountError && (
            <View style={[styles.errorCard, { backgroundColor: dynamicTheme.colors.error + '10' }]}>
              <Text style={[styles.errorText, theme.typography.caption, { color: dynamicTheme.colors.error }]}>
                {amountError}
              </Text>
            </View>
          )}

          {/* Error Display */}
          {blik.receiver.error && (
            <View style={[styles.errorCard, { backgroundColor: dynamicTheme.colors.error + '10' }]}>
              <Text style={[styles.errorText, theme.typography.caption, { color: dynamicTheme.colors.error }]}>
                {blik.receiver.error}
              </Text>
            </View>
          )}
        </View>

        {/* Generate Button */}
        <View style={[styles.footer, { borderTopColor: dynamicTheme.colors.buttonSecondaryBorder }]}>
          <TouchableOpacity
            style={[
              styles.generateButton,
              { backgroundColor: dynamicTheme.colors.buttonPrimary },
              (!isValid || isLoading) && { backgroundColor: dynamicTheme.colors.textTertiary },
            ]}
            onPress={handleGenerateCode}
            disabled={!isValid || isLoading}
          >
            <Text style={[styles.generateButtonText, theme.typography.heading, { color: dynamicTheme.colors.buttonPrimaryText }]}>
              {isLoading ? 'Generating...' : 'Generate Code'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
  },
  amountDisplay: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.xl,
  },
  amountText: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  tokenText: {
    marginBottom: theme.spacing.xs,
  },
  networkSelectorContainer: {
    marginBottom: theme.spacing.lg,
  },
  networkSelectorLabel: {
    marginBottom: theme.spacing.sm,
  },
  networkChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  networkChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tokenSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  tokenChip: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tokenChipSelected: {
    borderColor: theme.colors.buttonPrimary,
    backgroundColor: theme.colors.buttonPrimary + '10',
  },
  tokenChipText: {
    color: theme.colors.textPrimary,
  },
  tokenChipTextSelected: {
    fontWeight: '600',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  keypadButton: {
    width: '30%',
    aspectRatio: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  keypadText: {
    color: theme.colors.textPrimary,
  },
  errorCard: {
    backgroundColor: theme.colors.error + '10',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  errorText: {
    textAlign: 'center',
  },
  footer: {
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.buttonSecondaryBorder,
    backgroundColor: theme.colors.background,
  },
  generateButton: {
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    backgroundColor: theme.colors.textTertiary,
  },
  generateButtonText: {
    color: theme.colors.buttonPrimaryText,
  },
});
