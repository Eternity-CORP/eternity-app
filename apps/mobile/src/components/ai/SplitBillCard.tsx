/**
 * SplitBillCard Component
 * Displays split bill confirmation with participant list and approve/reject buttons
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
import type { SplitPreview } from '@e-y/shared';

interface SplitBillCardProps {
  preview: SplitPreview;
  onConfirm: () => void;
  onCancel: () => void;
}

type CardStatus = 'idle' | 'confirming' | 'success' | 'error';

/** Truncate a wallet address for display */
function truncateAddr(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function SplitBillCard({
  preview,
  onConfirm,
  onCancel,
}: SplitBillCardProps) {
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
      setErrorMessage((err as Error).message || 'Failed to create split');
    }
  };

  if (status === 'success') {
    return (
      <View style={cardStyles.container}>
        <LinearGradient
          colors={['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.05)']}
          style={styles.successCard}
        >
          <FontAwesome name="check-circle" size={32} color="#22C55E" />
          <Text style={styles.successTitle}>Split Created!</Text>
          <Text style={styles.successText}>
            {preview.totalAmount} {preview.token} split between{' '}
            {preview.participants.length} people
          </Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.card}>
        {/* Header */}
        <View style={cardStyles.header}>
          <View style={[cardStyles.headerIcon, styles.headerIconBg]}>
            <FontAwesome name="users" size={14} color={aiChat.accentGreen} />
          </View>
          <Text style={cardStyles.headerTitle}>Split Bill</Text>
        </View>

        {/* Total Amount */}
        <View style={cardStyles.amountSection}>
          <Text style={[cardStyles.amountValue, styles.amountValueTypography]}>
            {preview.totalAmount} {preview.token}
          </Text>
          <Text style={cardStyles.amountUsd}>
            {preview.perPerson} {preview.token} per person
          </Text>
        </View>

        {/* Details */}
        <View style={cardStyles.details}>
          {preview.description && (
            <View style={cardStyles.detailRow}>
              <Text style={cardStyles.detailLabel}>Description</Text>
              <Text style={cardStyles.detailValue}>{preview.description}</Text>
            </View>
          )}
          <View style={cardStyles.detailRow}>
            <Text style={cardStyles.detailLabel}>Participants</Text>
            <Text style={cardStyles.detailValue}>
              {preview.participants.length}
            </Text>
          </View>
        </View>

        {/* Participant List */}
        <View style={styles.participantList}>
          {preview.participants.map((p, index) => {
            const displayName = p.username
              ? `@${p.username}`
              : p.name
              ? p.name
              : truncateAddr(p.address);

            return (
              <View key={`${p.address}-${index}`} style={styles.participantRow}>
                <View style={styles.participantInfo}>
                  <View style={styles.participantAvatar}>
                    <FontAwesome name="user" size={10} color={aiChat.text.tertiary} />
                  </View>
                  <Text style={styles.participantName} numberOfLines={1}>
                    {displayName}
                  </Text>
                </View>
                <Text style={styles.participantAmount}>
                  {p.amount} {preview.token}
                </Text>
              </View>
            );
          })}
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
              colors={['#22C55E', '#16A34A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={cardStyles.confirmButtonGradient}
            >
              {status === 'confirming' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <FontAwesome name="users" size={14} color="#FFFFFF" />
                  <Text style={cardStyles.confirmButtonText}>Create Split</Text>
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
 * Local styles unique to SplitBillCard.
 */
const styles = StyleSheet.create({
  headerIconBg: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  amountValueTypography: {
    ...theme.typography.title,
  },

  // Participant list
  participantList: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    gap: 2,
  },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.sm,
  },
  participantAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantName: {
    color: aiChat.text.secondary,
    fontSize: 13,
    flex: 1,
  },
  participantAmount: {
    color: aiChat.text.primary,
    fontSize: 13,
    fontWeight: '600',
  },

  // Success state
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
    textAlign: 'center',
  },
});
