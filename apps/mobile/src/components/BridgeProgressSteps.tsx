/**
 * BridgeProgressSteps Component
 * Displays step-by-step progress during bridge execution
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { colors, typography, spacing } from '@/src/constants/theme';
import type { BridgeStep } from '@/src/store/slices/bridge-slice';

interface BridgeProgressStepsProps {
  steps: BridgeStep[];
  currentStepIndex: number;
}

export function BridgeProgressSteps({ steps, currentStepIndex }: BridgeProgressStepsProps) {
  return (
    <View style={styles.container}>
      {steps.map((step, index) => (
        <View key={step.id} style={styles.stepRow}>
          <View style={styles.iconContainer}>
            {step.status === 'done' && (
              <FontAwesome name="check-circle" size={20} color={colors.success} />
            )}
            {step.status === 'active' && (
              <ActivityIndicator size="small" color={colors.buttonPrimary} />
            )}
            {step.status === 'pending' && (
              <View style={styles.pendingIndicator} />
            )}
            {step.status === 'failed' && (
              <FontAwesome name="times-circle" size={20} color={colors.error} />
            )}
          </View>

          <Text
            style={[
              styles.stepLabel,
              step.status === 'done' && styles.stepDone,
              step.status === 'active' && styles.stepActive,
              step.status === 'pending' && styles.stepPending,
              step.status === 'failed' && styles.stepFailed,
            ]}
          >
            {step.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textTertiary,
  },
  stepLabel: {
    flex: 1,
    ...typography.body,
  },
  stepDone: {
    color: colors.success,
  },
  stepActive: {
    color: colors.textPrimary,
  },
  stepPending: {
    color: colors.textTertiary,
  },
  stepFailed: {
    color: colors.error,
  },
});
