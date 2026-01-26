/**
 * Send Screen 3: Amount Input with Custom Keypad
 */

import { StyleSheet, View, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { setAmount, setStep } from '@/src/store/slices/send-slice';
import { sanitizeAmountInput } from '@/src/utils/format';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function AmountScreen() {
  const { theme: dynamicTheme } = useTheme();
  const dispatch = useAppDispatch();
  const send = useAppSelector((state) => state.send);
  const balance = useAppSelector((state) => state.balance);
  const [amount, setAmountLocal] = useState(send.amount || '');

  const selectedToken = balance.balances.find((t) => t.symbol === send.selectedToken);
  const maxAmount = selectedToken ? parseFloat(selectedToken.balance) : 0;

  const handleNumberPress = (num: string) => {
    const newInput = amount + num;
    const sanitized = sanitizeAmountInput(newInput, amount);
    if (sanitized === null) return;
    if (sanitized && parseFloat(sanitized) > maxAmount) return;
    setAmountLocal(sanitized);
  };

  const handleBackspace = () => {
    setAmountLocal((prev) => prev.slice(0, -1));
  };

  const handleQuickAmount = (value: string) => {
    if (value === 'Max') {
      setAmountLocal(maxAmount.toString());
    } else {
      const numValue = parseFloat(value);
      if (numValue <= maxAmount) {
        setAmountLocal(numValue.toString());
      }
    }
  };

  const handleSend = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    dispatch(setAmount(amount));
    dispatch(setStep('confirm'));
    router.push('/send/confirm');
  };

  const amountValue = parseFloat(amount) || 0;
  const usdValue = selectedToken ? (amountValue * (selectedToken.usdValue || 0) / parseFloat(selectedToken.balance)) : 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Send" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.content}>
          <View style={styles.amountDisplay}>
            <Text style={[styles.amountText, theme.typography.displayLarge, { color: dynamicTheme.colors.textPrimary }]}>
              {amount || '0'}
            </Text>
            <Text style={[styles.tokenText, theme.typography.heading, { color: dynamicTheme.colors.textSecondary }]}>
              {send.selectedToken}
            </Text>
            {amount && (
              <Text style={[styles.usdText, theme.typography.body, { color: dynamicTheme.colors.textSecondary }]}>
                ${usdValue.toFixed(2)} USD
              </Text>
            )}
          </View>

          <View style={styles.quickAmounts}>
            <TouchableOpacity
              style={[styles.quickAmountChip, { backgroundColor: dynamicTheme.colors.surface }]}
              onPress={() => handleQuickAmount('0.01')}
            >
              <Text style={[styles.quickAmountText, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>0.01</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAmountChip, { backgroundColor: dynamicTheme.colors.surface }]}
              onPress={() => handleQuickAmount('0.1')}
            >
              <Text style={[styles.quickAmountText, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>0.1</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAmountChip, { backgroundColor: dynamicTheme.colors.surface }]}
              onPress={() => handleQuickAmount('Max')}
            >
              <Text style={[styles.quickAmountText, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>Max</Text>
            </TouchableOpacity>
          </View>

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
        </View>

        <View style={[styles.footer, { backgroundColor: dynamicTheme.colors.background, borderTopColor: dynamicTheme.colors.glassBorder }]}>
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: dynamicTheme.colors.buttonPrimary },
              (!amount || parseFloat(amount) <= 0) && { backgroundColor: dynamicTheme.colors.textTertiary },
            ]}
            onPress={handleSend}
            disabled={!amount || parseFloat(amount) <= 0}
          >
            <Text style={[styles.sendButtonText, theme.typography.heading, { color: dynamicTheme.colors.buttonPrimaryText }]}>Send</Text>
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
  footer: {
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.buttonSecondaryBorder,
    backgroundColor: theme.colors.background,
  },
  amountDisplay: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
  },
  amountText: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  tokenText: {
    marginBottom: theme.spacing.xs,
  },
  usdText: {
    // Styled inline
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  quickAmountChip: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
  },
  quickAmountText: {
    color: theme.colors.textPrimary,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  keypadButton: {
    width: '30%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  keypadText: {
    color: theme.colors.textPrimary,
  },
  sendButton: {
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.textTertiary,
  },
  sendButtonText: {
    color: theme.colors.buttonPrimaryText,
  },
});
