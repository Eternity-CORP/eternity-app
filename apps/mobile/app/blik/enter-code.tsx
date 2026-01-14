/**
 * BLIK Enter Code Screen (Sender)
 * Enter 6-digit code and look up payment request
 */

import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import {
  senderSetCode,
  senderStartLookup,
  senderCodeFound,
  senderCodeNotFound,
  senderError,
  senderReset,
} from '@/src/store/slices/blik-slice';
import { blikSocket } from '@/src/services/blik-service';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { BlikCodeInput } from '@/src/components/BlikCodeInput';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import { truncateAddress } from '@/src/utils/format';

export default function BlikEnterCodeScreen() {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const blik = useAppSelector((state) => state.blik);
  const currentAccount = getCurrentAccount(wallet);

  const [isConnecting, setIsConnecting] = useState(false);

  // Reset sender state on mount
  useEffect(() => {
    dispatch(senderReset());
  }, [dispatch]);

  // Set up BLIK socket callbacks
  useEffect(() => {
    blikSocket.setCallbacks({
      onCodeInfo: (payload) => {
        dispatch(senderCodeFound(payload));
      },
      onCodeNotFound: (payload) => {
        const reasonMessage =
          payload.reason === 'expired'
            ? 'This code has expired'
            : payload.reason === 'completed'
              ? 'This code has already been used'
              : 'Code not found';
        dispatch(senderCodeNotFound(reasonMessage));
      },
      onError: (error) => {
        dispatch(senderError(error.message));
      },
    });

    return () => {
      blikSocket.clearCallbacks();
    };
  }, [dispatch]);

  const handleCodeChange = useCallback((code: string) => {
    dispatch(senderSetCode(code));
  }, [dispatch]);

  const handleCodeComplete = useCallback(async (code: string) => {
    if (!currentAccount) return;

    setIsConnecting(true);
    dispatch(senderStartLookup());

    try {
      await blikSocket.connect(currentAccount.address);
      blikSocket.lookupCode({
        code,
        senderAddress: currentAccount.address,
      });
    } catch (error) {
      dispatch(senderError('Failed to connect to server'));
    } finally {
      setIsConnecting(false);
    }
  }, [currentAccount, dispatch]);

  const handleContinue = useCallback(() => {
    if (blik.sender.codeInfo) {
      router.push('/blik/confirm');
    }
  }, [blik.sender.codeInfo]);

  const isLookingUp = blik.sender.status === 'looking_up' || isConnecting;
  const isFound = blik.sender.status === 'found' && blik.sender.codeInfo;
  const isNotFound = blik.sender.status === 'not_found';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Pay with BLIK" />

      <View style={styles.content}>
        {/* Instruction */}
        <Text style={[styles.instruction, theme.typography.heading]}>
          Enter 6-digit code
        </Text>

        {/* Code Input */}
        <View style={styles.codeInputContainer}>
          <BlikCodeInput
            value={blik.sender.enteredCode}
            onChange={handleCodeChange}
            onComplete={handleCodeComplete}
            autoFocus={true}
            editable={!isLookingUp}
          />
        </View>

        {/* Status Display */}
        {isLookingUp && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            <Text style={[styles.statusText, theme.typography.body]}>
              Looking up code...
            </Text>
          </View>
        )}

        {isNotFound && (
          <View style={styles.statusContainer}>
            <FontAwesome name="times-circle" size={20} color={theme.colors.error} />
            <Text style={[styles.statusText, theme.typography.body, { color: theme.colors.error }]}>
              {blik.sender.error || 'Code not found'}
            </Text>
          </View>
        )}

        {isFound && blik.sender.codeInfo && (
          <View style={styles.foundContainer}>
            <View style={styles.statusContainer}>
              <FontAwesome name="check-circle" size={20} color={theme.colors.success} />
              <Text style={[styles.statusText, theme.typography.body, { color: theme.colors.success }]}>
                Code found
              </Text>
            </View>

            {/* Payment Details Preview */}
            <View style={styles.previewCard}>
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, theme.typography.caption]}>
                  Send
                </Text>
                <Text style={[styles.previewValue, theme.typography.heading]}>
                  {blik.sender.codeInfo.amount} {blik.sender.codeInfo.tokenSymbol}
                </Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, theme.typography.caption]}>
                  To
                </Text>
                <Text style={[styles.previewValue, theme.typography.body]}>
                  {blik.sender.codeInfo.receiverUsername || truncateAddress(blik.sender.codeInfo.receiverAddress)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Error Display */}
        {blik.sender.status === 'error' && blik.sender.error && !isNotFound && (
          <View style={styles.errorCard}>
            <Text style={[styles.errorText, theme.typography.caption, { color: theme.colors.error }]}>
              {blik.sender.error}
            </Text>
          </View>
        )}
      </View>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !isFound && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!isFound}
        >
          <Text style={[styles.continueButtonText, theme.typography.heading]}>
            Continue
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
  },
  instruction: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
  },
  codeInputContainer: {
    marginBottom: theme.spacing.xl,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  statusText: {
    color: theme.colors.textSecondary,
  },
  foundContainer: {
    marginTop: theme.spacing.md,
  },
  previewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    color: theme.colors.textSecondary,
  },
  previewValue: {
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
    borderTopWidth: 1,
    borderTopColor: theme.colors.buttonSecondaryBorder,
  },
  continueButton: {
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: theme.colors.textTertiary,
  },
  continueButtonText: {
    color: theme.colors.buttonPrimaryText,
  },
});
