/**
 * Send Screen: Bridge Progress
 * Shows real-time progress during bridge execution
 */

import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import {
  selectBridgeStatus,
  selectBridgeSteps,
  selectBridgeProgress,
  selectBridgeError,
  selectBridgeCurrentStepIndex,
  resetBridge,
  incrementRetry,
} from '@/src/store/slices/bridge-slice';
import { resetSend } from '@/src/store/slices/send-slice';
import { BridgeProgressSteps } from '@/src/components';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function BridgingScreen() {
  const { theme: dynamicTheme } = useTheme();
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectBridgeStatus);
  const steps = useAppSelector(selectBridgeSteps);
  const progress = useAppSelector(selectBridgeProgress);
  const error = useAppSelector(selectBridgeError);
  const currentStepIndex = useAppSelector(selectBridgeCurrentStepIndex);
  const send = useAppSelector((state) => state.send);

  // Navigate to success when bridge completes
  useEffect(() => {
    if (status === 'success') {
      router.replace('/send/success');
    }
  }, [status]);

  const handleRetry = () => {
    dispatch(incrementRetry());
    // Go back to confirm to re-trigger the send
    router.back();
  };

  const handleSendAlternative = () => {
    // Reset bridge and go back to confirm with direct send option
    dispatch(resetBridge());
    router.back();
  };

  const handleCancel = () => {
    dispatch(resetBridge());
    dispatch(resetSend());
    router.replace('/send/token');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader
        title={status === 'failed' ? 'Bridge Failed' : 'Sending'}
        showBackButton={false}
      />

      <View style={styles.container}>
        {/* Progress Circle */}
        <View style={styles.progressContainer}>
          <View style={[
            styles.progressCircle,
            { borderColor: dynamicTheme.colors.buttonPrimary, backgroundColor: dynamicTheme.colors.surface },
            status === 'failed' && { borderColor: dynamicTheme.colors.error },
          ]}>
            {status === 'failed' ? (
              <FontAwesome name="times" size={32} color={dynamicTheme.colors.error} />
            ) : (
              <Text style={[styles.progressText, theme.typography.displayLarge, { color: dynamicTheme.colors.textPrimary }]}>
                {progress}%
              </Text>
            )}
          </View>
        </View>

        {/* Amount being sent */}
        <Text style={[styles.amountText, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>
          Sending {send.amount} {send.selectedToken}
        </Text>

        {/* Steps */}
        {steps.length > 0 && (
          <View style={[styles.stepsContainer, { backgroundColor: dynamicTheme.colors.surface }]}>
            <BridgeProgressSteps steps={steps} currentStepIndex={currentStepIndex} />
          </View>
        )}

        {/* Error state */}
        {status === 'failed' && error.message && (
          <View style={styles.errorContainer}>
            <FontAwesome name="exclamation-triangle" size={24} color={dynamicTheme.colors.error} />
            <Text style={[styles.errorText, theme.typography.body, { color: dynamicTheme.colors.error }]}>
              {error.message}
            </Text>
            <Text style={[styles.safeText, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
              Your funds are safe. Nothing was deducted.
            </Text>
          </View>
        )}

        {/* Info message */}
        {status === 'processing' && (
          <View style={[styles.infoContainer, { backgroundColor: dynamicTheme.colors.surface }]}>
            <FontAwesome name="info-circle" size={16} color={dynamicTheme.colors.textSecondary} />
            <Text style={[styles.infoText, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
              You can minimize the app. We'll notify you when done.
            </Text>
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.footer}>
        {status === 'failed' && (
          <>
            {error.canRetry && (
              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: dynamicTheme.colors.buttonPrimary }]} onPress={handleRetry}>
                <Text style={[styles.primaryButtonText, theme.typography.heading, { color: dynamicTheme.colors.buttonPrimaryText }]}>
                  Try Again
                </Text>
              </TouchableOpacity>
            )}
            {error.canSendAlternative && (
              <TouchableOpacity style={[styles.secondaryButton, { backgroundColor: dynamicTheme.colors.surface, borderColor: dynamicTheme.colors.glassBorder }]} onPress={handleSendAlternative}>
                <Text style={[styles.secondaryButtonText, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                  Send Without Bridge
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={[styles.cancelButtonText, theme.typography.body, { color: dynamicTheme.colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  progressContainer: {
    marginVertical: theme.spacing.xl,
  },
  progressCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: theme.colors.buttonPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  progressCircleFailed: {
    borderColor: theme.colors.error,
  },
  progressText: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  amountText: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xl,
  },
  stepsContainer: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
  },
  errorContainer: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.error,
    textAlign: 'center',
  },
  safeText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xl,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
  },
  infoText: {
    color: theme.colors.textSecondary,
    flex: 1,
  },
  footer: {
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  primaryButton: {
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: theme.colors.buttonPrimaryText,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.buttonSecondaryBorder,
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
  },
  cancelButton: {
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
  },
});
