/**
 * UsernameCard Component
 * Displays username registration confirmation with approve/reject buttons
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
import { LogoStrokeDraw } from './LogoStrokeDraw';
import type { UsernamePreview } from '@e-y/shared';

interface UsernameCardProps {
  preview: UsernamePreview;
  onConfirm: (preview: UsernamePreview) => Promise<string>;
  onCancel: () => void;
  onComplete: () => void;
}

type CardStatus = 'idle' | 'confirming' | 'success' | 'error';

export function UsernameCard({
  preview,
  onConfirm,
  onCancel,
  onComplete,
}: UsernameCardProps) {
  const [status, setStatus] = useState<CardStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleConfirm = async () => {
    setStatus('confirming');
    setErrorMessage('');

    try {
      await onConfirm(preview);
      setStatus('success');
      setTimeout(onComplete, 2000);
    } catch (err) {
      setStatus('error');
      setErrorMessage((err as Error).message || 'Registration failed');
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
          <Text style={styles.successTitle}>Username Registered!</Text>
          <Text style={styles.successText}>@{preview.username} is now yours</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.card}>
        <LogoStrokeDraw />
        {/* Header */}
        <View style={cardStyles.header}>
          <View style={[cardStyles.headerIcon, { backgroundColor: 'rgba(51, 136, 255, 0.15)' }]}>
            <FontAwesome name="user" size={16} color={aiChat.accentBlue} />
          </View>
          <Text style={cardStyles.headerTitle}>Register Username</Text>
        </View>

        {/* Preview */}
        <View style={styles.previewSection}>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Username</Text>
            <Text style={styles.previewValueBlue}>@{preview.username}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Wallet</Text>
            <Text style={styles.previewValueMono}>
              {preview.address.slice(0, 6)}...{preview.address.slice(-4)}
            </Text>
          </View>
        </View>

        <Text style={styles.description}>
          This will link @{preview.username} to your wallet. Requires a signature to verify ownership.
        </Text>

        {/* Error */}
        {status === 'error' && (
          <View style={cardStyles.errorBanner}>
            <Text style={cardStyles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={cardStyles.actions}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
            disabled={status === 'confirming'}
          >
            {status === 'confirming' ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.confirmButtonText}>Register</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={status === 'confirming'}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Preview section (unique to UsernameCard)
  previewSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewLabel: {
    color: aiChat.text.tertiary,
    fontSize: 12,
  },
  previewValueBlue: {
    color: aiChat.accentBlue,
    fontSize: 14,
    fontWeight: '600',
  },
  previewValueMono: {
    color: aiChat.text.secondary,
    fontSize: 12,
    fontFamily: 'monospace',
  },

  // Description text (unique to UsernameCard)
  description: {
    color: aiChat.text.tertiary,
    fontSize: 12,
    lineHeight: 16,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },

  // Confirm button — white bg, black text (unique to UsernameCard)
  confirmButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },

  // Cancel button — bordered variant (unique to UsernameCard)
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelButtonText: {
    color: aiChat.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },

  // Success state — green theme (unique to UsernameCard)
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
