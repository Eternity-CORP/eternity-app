/**
 * BLIK Waiting Screen (Receiver)
 * Display code, countdown, and wait for payment
 */

import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import * as Clipboard from 'expo-clipboard';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import {
  receiverPaymentConfirmed,
  receiverCodeExpired,
  receiverCodeCancelled,
  receiverError,
  receiverReset,
} from '@/src/store/slices/blik-slice';
import { blikSocket } from '@/src/services/blik-service';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { TransactionPendingAnimation } from '@/src/components/TransactionPendingAnimation';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function BlikWaitingScreen() {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const blik = useAppSelector((state) => state.blik);
  const currentAccount = getCurrentAccount(wallet);

  const [countdown, setCountdown] = useState(120); // 2 minutes
  const [copied, setCopied] = useState(false);

  const activeCode = blik.receiver.activeCode;

  // Calculate remaining time from expiresAt
  useEffect(() => {
    if (!activeCode?.expiresAt) return;

    const updateCountdown = () => {
      const expiresAt = new Date(activeCode.expiresAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setCountdown(remaining);

      if (remaining <= 0) {
        dispatch(receiverCodeExpired());
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeCode?.expiresAt, dispatch]);

  // Set up BLIK socket callbacks
  useEffect(() => {
    blikSocket.setCallbacks({
      onPaymentConfirmed: (payload) => {
        dispatch(receiverPaymentConfirmed(payload));
        Alert.alert(
          'Payment Received!',
          `${activeCode?.amount} ${activeCode?.tokenSymbol} received from ${payload.senderAddress.slice(0, 8)}...`,
          [{ text: 'OK', onPress: () => router.replace('/(tabs)/home') }]
        );
      },
      onCodeExpired: () => {
        dispatch(receiverCodeExpired());
      },
      onCodeCancelled: () => {
        dispatch(receiverCodeCancelled());
        router.back();
      },
      onError: (error) => {
        dispatch(receiverError(error.message));
      },
    });

    return () => {
      blikSocket.clearCallbacks();
    };
  }, [dispatch, activeCode]);

  // Handle status changes
  useEffect(() => {
    if (blik.receiver.status === 'expired') {
      Alert.alert('Code Expired', 'Your BLIK code has expired. Please create a new one.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, [blik.receiver.status]);

  const handleCopyCode = useCallback(async () => {
    if (!activeCode?.code) return;
    await Clipboard.setStringAsync(activeCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [activeCode?.code]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Cancel Code?',
      'Are you sure you want to cancel this BLIK code?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            if (activeCode?.code && currentAccount?.address) {
              blikSocket.cancelCode({
                code: activeCode.code,
                receiverAddress: currentAccount.address,
              });
            }
            dispatch(receiverReset());
            router.back();
          },
        },
      ]
    );
  }, [activeCode?.code, currentAccount?.address, dispatch]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format code with spaces
  const formatCode = (code: string | undefined) => {
    if (!code) return '------';
    return code.split('').join(' ');
  };

  if (!activeCode) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Request Payment" />
        <View style={styles.centerContainer}>
          <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
            No active code. Please create one first.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={[styles.backButtonText, theme.typography.body]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScreenHeader title="Request Payment" />

      <View style={styles.content}>
        {/* Transaction Pending Animation */}
        <TransactionPendingAnimation message="Waiting for payment..." />

        {/* Share instruction */}
        <Text style={[styles.instruction, theme.typography.heading]}>
          Share this code
        </Text>

        {/* Code Display */}
        <View style={styles.codeContainer}>
          <Text style={styles.codeText}>{formatCode(activeCode.code)}</Text>
        </View>

        {/* Amount Display */}
        <Text style={[styles.amountText, theme.typography.title]}>
          {activeCode.amount} {activeCode.tokenSymbol}
        </Text>

        {/* Countdown */}
        <View style={styles.countdownContainer}>
          <FontAwesome
            name="clock-o"
            size={18}
            color={countdown < 30 ? theme.colors.error : theme.colors.textSecondary}
          />
          <Text
            style={[
              styles.countdownText,
              theme.typography.body,
              countdown < 30 && { color: theme.colors.error },
            ]}
          >
            Expires in {formatCountdown(countdown)}
          </Text>
        </View>

        {/* Copy Button */}
        <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
          <FontAwesome
            name={copied ? 'check' : 'copy'}
            size={18}
            color={theme.colors.buttonPrimaryText}
          />
          <Text style={[styles.copyButtonText, theme.typography.heading]}>
            {copied ? 'Copied!' : 'Copy Code'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Fixed Footer with Done Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.doneButton} onPress={handleCancel}>
          <Text style={[styles.doneButtonText, theme.typography.heading]}>
            Done
          </Text>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  instruction: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  codeContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
  },
  codeText: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 8,
    color: theme.colors.textPrimary,
  },
  amountText: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xxl,
  },
  countdownText: {
    color: theme.colors.textSecondary,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xxl,
    width: '100%',
  },
  copyButtonText: {
    color: theme.colors.buttonPrimaryText,
  },
  footer: {
    padding: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.buttonSecondaryBorder,
  },
  doneButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.buttonSecondaryBorder,
  },
  doneButtonText: {
    color: theme.colors.textPrimary,
  },
  backButton: {
    marginTop: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  backButtonText: {
    color: theme.colors.textPrimary,
  },
});
