/**
 * BLIK Receive - Amount Input Screen
 * Enter the amount to receive
 */

import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
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
import { resolveChainId, validateBlikAmount, BLIK_MAX_AMOUNT } from '@e-y/shared';

export default function BlikReceiveAmountScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const dispatch = useAppDispatch();
  const { theme: dynamicTheme } = useTheme();
  const wallet = useAppSelector((state) => state.wallet);
  const blik = useAppSelector((state) => state.blik);
  const isTestAccount = useAppSelector(selectIsTestAccount);
  const currentAccount = getCurrentAccount(wallet);

  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Set up BLIK socket callbacks
  useEffect(() => {
    blikSocket.setCallbacks({
      onCodeCreated: (payload) => {
        dispatch(receiverCodeCreated(payload));
        router.replace('/blik/waiting');
      },
      onError: (error) => {
        dispatch(receiverError(error.message));
        setIsConnecting(false);
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
    // Clear error when user is actively typing
    if (amountError) setAmountError(null);
  };

  const handleBackspace = () => {
    setAmount((prev) => prev.slice(0, -1));
    if (amountError) setAmountError(null);
  };

  const handleGenerateCode = async () => {
    if (!amount || !currentAccount || !token) return;

    // Validate amount range
    const validationError = validateBlikAmount(amount);
    if (validationError) {
      setAmountError(validationError);
      return;
    }

    setIsConnecting(true);
    dispatch(receiverStartCreating());

    try {
      await blikSocket.connect(currentAccount.address);
      // Use Sepolia for test accounts; default to Base (8453) for real accounts in this legacy flow
      const chainId = resolveChainId(isTestAccount, 'base');
      blikSocket.createCode({
        receiverAddress: currentAccount.address,
        amount,
        tokenSymbol: token,
        chainId,
      });
    } catch (error) {
      dispatch(receiverError('Failed to connect to server'));
      setIsConnecting(false);
    }
  };

  const isLoading = isConnecting || blik.receiver.status === 'creating';
  const canGenerate = amount && parseFloat(amount) > 0 && parseFloat(amount) <= BLIK_MAX_AMOUNT && !isLoading;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Receive BLIK" />

      <View style={styles.content}>
        {/* Amount Display */}
        <View style={styles.amountDisplay}>
          <Text style={[styles.amountText, { color: dynamicTheme.colors.textPrimary }]}>
            {amount || '0'}
          </Text>
          <Text style={[styles.tokenText, theme.typography.heading, { color: dynamicTheme.colors.textSecondary }]}>
            {token}
          </Text>
        </View>

        {/* Amount Validation Error */}
        {amountError && (
          <View style={[styles.errorContainer, { backgroundColor: dynamicTheme.colors.error + '10' }]}>
            <Text style={[styles.errorText, theme.typography.caption, { color: dynamicTheme.colors.error }]}>
              {amountError}
            </Text>
          </View>
        )}

        {/* Error Display */}
        {blik.receiver.error && (
          <View style={[styles.errorContainer, { backgroundColor: dynamicTheme.colors.error + '10' }]}>
            <Text style={[styles.errorText, theme.typography.caption, { color: dynamicTheme.colors.error }]}>
              {blik.receiver.error}
            </Text>
          </View>
        )}

        {/* Keypad */}
        <View style={styles.keypad}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'].map((key, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.keypadButton, { backgroundColor: dynamicTheme.colors.surface }, key === '' && styles.keypadButtonEmpty]}
              onPress={() => {
                if (key === 'backspace') {
                  handleBackspace();
                } else {
                  handleNumberPress(key);
                }
              }}
              disabled={isLoading}
            >
              {key === 'backspace' ? (
                <FontAwesome name="arrow-left" size={20} color={dynamicTheme.colors.textPrimary} />
              ) : (
                <Text style={[styles.keypadText, theme.typography.title, { color: dynamicTheme.colors.textPrimary }]}>{key}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Generate Button */}
      <View style={[styles.footer, { backgroundColor: dynamicTheme.colors.background, borderTopColor: dynamicTheme.colors.glassBorder }]}>
        <TouchableOpacity
          style={[styles.generateButton, { backgroundColor: dynamicTheme.colors.buttonPrimary }, !canGenerate && { backgroundColor: dynamicTheme.colors.textTertiary }]}
          onPress={handleGenerateCode}
          disabled={!canGenerate}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={dynamicTheme.colors.buttonPrimaryText} />
          ) : (
            <Text style={[styles.generateButtonText, theme.typography.heading, { color: dynamicTheme.colors.buttonPrimaryText }]}>
              Generate Code
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
  },
  amountDisplay: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
    paddingVertical: theme.spacing.xl,
  },
  amountText: {
    fontSize: 56,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  tokenText: {
    // styled inline
  },
  errorContainer: {
    backgroundColor: theme.colors.error + '10',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  errorText: {
    textAlign: 'center',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing.md,
  },
  keypadButton: {
    width: '28%',
    aspectRatio: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  keypadButtonEmpty: {
    backgroundColor: 'transparent',
  },
  keypadText: {
    color: theme.colors.textPrimary,
  },
  footer: {
    padding: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.buttonSecondaryBorder,
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
