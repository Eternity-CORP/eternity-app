/**
 * BLIK Request Screen (Receiver)
 * Create a BLIK code with amount and token selection
 */

import { StyleSheet, View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { receiverStartCreating, receiverCodeCreated, receiverError, receiverReset } from '@/src/store/slices/blik-slice';
import { blikSocket } from '@/src/services/blik-service';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import { sanitizeAmountInput } from '@/src/utils/format';

// Available tokens for BLIK
const TOKENS = ['ETH', 'USDC', 'USDT'];

export default function BlikRequestScreen() {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const blik = useAppSelector((state) => state.blik);
  const currentAccount = getCurrentAccount(wallet);

  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('USDC');
  const [isConnecting, setIsConnecting] = useState(false);

  // Redirect to waiting if code is already active
  useEffect(() => {
    if (blik.receiver.status === 'waiting' && blik.receiver.activeCode) {
      router.replace('/blik/waiting');
    }
  }, [blik.receiver.status, blik.receiver.activeCode]);

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
  };

  const handleBackspace = () => {
    setAmount((prev) => prev.slice(0, -1));
  };

  const handleGenerateCode = async () => {
    if (!amount || parseFloat(amount) <= 0 || !currentAccount) return;

    setIsConnecting(true);
    dispatch(receiverStartCreating());

    try {
      // Connect to BLIK socket
      await blikSocket.connect(currentAccount.address);

      // Create code
      blikSocket.createCode({
        amount,
        tokenSymbol: selectedToken,
        receiverAddress: currentAccount.address,
        receiverUsername: undefined,
      });
    } catch (error) {
      dispatch(receiverError('Failed to connect to server'));
    } finally {
      setIsConnecting(false);
    }
  };

  const isValid = amount && parseFloat(amount) > 0;
  const isLoading = blik.receiver.status === 'creating' || isConnecting;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Request Payment" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.content}>
          {/* Amount Display */}
          <View style={styles.amountDisplay}>
            <Text style={[styles.amountText, theme.typography.displayLarge]}>
              {amount || '0'}
            </Text>
            <Text style={[styles.tokenText, theme.typography.heading, { color: theme.colors.textSecondary }]}>
              {selectedToken}
            </Text>
          </View>

          {/* Token Selection */}
          <View style={styles.tokenSelector}>
            {TOKENS.map((token) => (
              <TouchableOpacity
                key={token}
                style={[
                  styles.tokenChip,
                  selectedToken === token && styles.tokenChipSelected,
                ]}
                onPress={() => setSelectedToken(token)}
              >
                <Text
                  style={[
                    styles.tokenChipText,
                    theme.typography.body,
                    selectedToken === token && styles.tokenChipTextSelected,
                  ]}
                >
                  {token}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Keypad */}
          <View style={styles.keypad}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map((key) => (
              <TouchableOpacity
                key={key}
                style={styles.keypadButton}
                onPress={() => {
                  if (key === 'backspace') {
                    handleBackspace();
                  } else {
                    handleNumberPress(key);
                  }
                }}
              >
                {key === 'backspace' ? (
                  <FontAwesome name="arrow-left" size={20} color={theme.colors.textPrimary} />
                ) : (
                  <Text style={[styles.keypadText, theme.typography.title]}>{key}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Error Display */}
          {blik.receiver.error && (
            <View style={styles.errorCard}>
              <Text style={[styles.errorText, theme.typography.caption, { color: theme.colors.error }]}>
                {blik.receiver.error}
              </Text>
            </View>
          )}
        </View>

        {/* Generate Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.generateButton,
              (!isValid || isLoading) && styles.generateButtonDisabled,
            ]}
            onPress={handleGenerateCode}
            disabled={!isValid || isLoading}
          >
            <Text style={[styles.generateButtonText, theme.typography.heading]}>
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
