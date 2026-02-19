/**
 * ScheduledPaymentCard Component
 * Displays scheduled payment confirmation with approve/reject buttons
 */

import React, { useState } from 'react';
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
import { aiChat } from '@/src/constants/ai-chat-theme';
import { cardStyles } from './card-styles';
import { ParticleBg } from './ParticleBg';
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
      <View style={cardStyles.container}>
        <LinearGradient
          colors={['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.05)']}
          style={styles.successCard}
        >
          <FontAwesome name="check-circle" size={32} color="#22C55E" />
          <Text style={styles.successTitle}>Payment Scheduled!</Text>
          <Text style={styles.successText}>
            {preview.amount} {preview.token} to {recipient}
          </Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.card}>
        <ParticleBg />
        {/* Header */}
        <View style={cardStyles.header}>
          <View style={[cardStyles.headerIcon, styles.headerIconBg]}>
            <FontAwesome name="clock-o" size={16} color={aiChat.accentPurple} />
          </View>
          <Text style={cardStyles.headerTitle}>Schedule Payment</Text>
        </View>

        {/* Amount */}
        <View style={cardStyles.amountSection}>
          <Text style={[cardStyles.amountValue, styles.amountValueTypography]}>
            {preview.amount} {preview.token}
          </Text>
        </View>

        {/* Details */}
        <View style={cardStyles.details}>
          <View style={cardStyles.detailRow}>
            <Text style={cardStyles.detailLabel}>To</Text>
            <Text style={cardStyles.detailValue}>{recipient}</Text>
          </View>
          <View style={cardStyles.detailRow}>
            <Text style={cardStyles.detailLabel}>Date & Time</Text>
            <Text style={cardStyles.detailValue}>
              {formatScheduledDate(preview.scheduledAt)}
            </Text>
          </View>
          <View style={cardStyles.detailRow}>
            <Text style={cardStyles.detailLabel}>Frequency</Text>
            <Text style={cardStyles.detailValue}>
              {recurringLabel(preview.recurring)}
            </Text>
          </View>
          {preview.description && (
            <View style={cardStyles.detailRow}>
              <Text style={cardStyles.detailLabel}>Description</Text>
              <Text style={[cardStyles.detailValue, styles.descriptionValue]}>
                {preview.description}
              </Text>
            </View>
          )}
        </View>

        {/* Error */}
        {status === 'error' && (
          <View style={cardStyles.errorBanner}>
            <FontAwesome name="exclamation-circle" size={14} color={aiChat.accentRed} />
            <Text style={cardStyles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={cardStyles.actions}>
          <TouchableOpacity
            style={cardStyles.cancelButton}
            onPress={onCancel}
            disabled={status === 'confirming'}
          >
            <Text style={cardStyles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[cardStyles.confirmButton, status === 'confirming' && cardStyles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={status === 'confirming'}
          >
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={cardStyles.confirmButtonGradient}
            >
              {status === 'confirming' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <FontAwesome name="clock-o" size={14} color="#FFFFFF" />
                  <Text style={cardStyles.confirmButtonText}>Schedule</Text>
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
    color: aiChat.text.secondary,
    fontSize: 14,
  },
});
