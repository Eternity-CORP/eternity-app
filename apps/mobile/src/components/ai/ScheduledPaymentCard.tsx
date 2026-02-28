/**
 * ScheduledPaymentCard Component
 * Displays scheduled payment confirmation with approve/reject buttons
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { theme } from '@/src/constants/theme';
import { getAiChatTheme } from '@/src/constants/ai-chat-theme';
import { useTheme } from '@/src/contexts';
import { getCardStyles } from './card-styles';
import { LogoStrokeDraw } from './LogoStrokeDraw';
import type { ScheduledPaymentPreview } from '@e-y/shared';

interface ScheduledPaymentCardProps {
  preview: ScheduledPaymentPreview;
  onConfirm: () => void;
  onCancel: () => void;
}

type CardStatus = 'idle' | 'confirming' | 'success' | 'error';

/** Map recurring value to human-readable label */
function recurringLabel(recurring: ScheduledPaymentPreview['recurring']): string {
  switch (recurring) {
    case 'once':
      return 'One-time';
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    default:
      return recurring;
  }
}

/** Format ISO date string to a readable date/time */
function formatScheduledDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoDate;
  }
}

export function ScheduledPaymentCard({
  preview,
  onConfirm,
  onCancel,
}: ScheduledPaymentCardProps) {
  const { isDark } = useTheme();
  const aiChatTheme = useMemo(() => getAiChatTheme(isDark), [isDark]);
  const cs = useMemo(() => getCardStyles(aiChatTheme), [aiChatTheme]);

  const [status, setStatus] = useState<CardStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleConfirm = async () => {
    setStatus('confirming');
    setErrorMessage('');

    try {
      onConfirm();
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage((err as Error).message || 'Failed to schedule payment');
    }
  };

  const recipient = preview.recipientUsername
    ? `@${preview.recipientUsername}`
    : `${preview.recipient.slice(0, 6)}...${preview.recipient.slice(-4)}`;

  if (status === 'success') {
    return (
      <View style={cs.container}>
        <LinearGradient
          colors={['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.05)']}
          style={styles.successCard}
        >
          <FontAwesome name="check-circle" size={32} color="#22C55E" />
          <Text style={styles.successTitle}>Payment Scheduled!</Text>
          <Text style={[styles.successText, { color: aiChatTheme.text.secondary }]}>
            {preview.amount} {preview.token} to {recipient}
          </Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={cs.container}>
      <View style={cs.card}>
        <LogoStrokeDraw />
        {/* Header */}
        <View style={cs.header}>
          <View style={[cs.headerIcon, styles.headerIconBg]}>
            <FontAwesome name="clock-o" size={16} color={aiChatTheme.accentPurple} />
          </View>
          <Text style={cs.headerTitle}>Schedule Payment</Text>
        </View>

        {/* Amount */}
        <View style={cs.amountSection}>
          <Text style={[cs.amountValue, styles.amountValueTypography]}>
            {preview.amount} {preview.token}
          </Text>
        </View>

        {/* Details */}
        <View style={cs.details}>
          <View style={cs.detailRow}>
            <Text style={cs.detailLabel}>To</Text>
            <Text style={cs.detailValue}>{recipient}</Text>
          </View>
          <View style={cs.detailRow}>
            <Text style={cs.detailLabel}>Date & Time</Text>
            <Text style={cs.detailValue}>
              {formatScheduledDate(preview.scheduledAt)}
            </Text>
          </View>
          <View style={cs.detailRow}>
            <Text style={cs.detailLabel}>Frequency</Text>
            <Text style={cs.detailValue}>
              {recurringLabel(preview.recurring)}
            </Text>
          </View>
          {preview.description && (
            <View style={cs.detailRow}>
              <Text style={cs.detailLabel}>Description</Text>
              <Text style={[cs.detailValue, styles.descriptionValue]}>
                {preview.description}
              </Text>
            </View>
          )}
        </View>

        {/* Error */}
        {status === 'error' && (
          <View style={cs.errorBanner}>
            <FontAwesome name="exclamation-circle" size={14} color={aiChatTheme.accentRed} />
            <Text style={cs.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={cs.actions}>
          <TouchableOpacity
            style={cs.cancelButton}
            onPress={onCancel}
            disabled={status === 'confirming'}
          >
            <Text style={cs.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[cs.confirmButton, status === 'confirming' && cs.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={status === 'confirming'}
          >
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={cs.confirmButtonGradient}
            >
              {status === 'confirming' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <FontAwesome name="clock-o" size={14} color="#FFFFFF" />
                  <Text style={cs.confirmButtonText}>Schedule</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/**
 * Local styles unique to ScheduledPaymentCard.
 */
const styles = StyleSheet.create({
  headerIconBg: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  amountValueTypography: {
    ...theme.typography.title,
  },
  descriptionValue: {
    flex: 1,
    textAlign: 'right',
    maxWidth: '60%',
  },
  successCard: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  successTitle: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: '700',
  },
  successText: {
    fontSize: 14,
  },
});
