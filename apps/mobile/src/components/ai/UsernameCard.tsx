/**
 * UsernameCard Component
 * Displays username registration confirmation with approve/reject buttons
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
  const { isDark } = useTheme();
  const aiChatTheme = useMemo(() => getAiChatTheme(isDark), [isDark]);
  const cs = useMemo(() => getCardStyles(aiChatTheme), [aiChatTheme]);

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
      <View style={cs.container}>
        <LinearGradient
          colors={['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.05)']}
          style={styles.successCard}
        >
          <FontAwesome name="check-circle" size={32} color="#22C55E" />
          <Text style={styles.successTitle}>Username Registered!</Text>
          <Text style={[styles.successText, { color: aiChatTheme.text.secondary }]}>@{preview.username} is now yours</Text>
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
          <View style={[cs.headerIcon, { backgroundColor: 'rgba(51, 136, 255, 0.15)' }]}>
            <FontAwesome name="user" size={16} color={aiChatTheme.accentBlue} />
          </View>
          <Text style={cs.headerTitle}>Register Username</Text>
        </View>

        {/* Preview */}
        <View style={[styles.previewSection, { backgroundColor: aiChatTheme.surfaceTintLight }]}>
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: aiChatTheme.text.tertiary }]}>Username</Text>
            <Text style={styles.previewValueBlue}>@{preview.username}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { color: aiChatTheme.text.tertiary }]}>Wallet</Text>
            <Text style={[styles.previewValueMono, { color: aiChatTheme.text.secondary }]}>
              {preview.address.slice(0, 6)}...{preview.address.slice(-4)}
            </Text>
          </View>
        </View>

        <Text style={[styles.description, { color: aiChatTheme.text.tertiary }]}>
          This will link @{preview.username} to your wallet. Requires a signature to verify ownership.
        </Text>

        {/* Error */}
        {status === 'error' && (
          <View style={cs.errorBanner}>
            <Text style={cs.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={cs.actions}>
          <TouchableOpacity
            style={[styles.confirmButton, {
              backgroundColor: isDark ? '#FFFFFF' : '#000000',
            }]}
            onPress={handleConfirm}
            disabled={status === 'confirming'}
          >
            {status === 'confirming' ? (
              <ActivityIndicator size="small" color={isDark ? '#000' : '#FFF'} />
            ) : (
              <Text style={[styles.confirmButtonText, {
                color: isDark ? '#000000' : '#FFFFFF',
              }]}>Register</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cancelButton, {
              backgroundColor: aiChatTheme.surfaceTintInput,
              borderColor: aiChatTheme.borderTintMedium,
            }]}
            onPress={onCancel}
            disabled={status === 'confirming'}
          >
            <Text style={[styles.cancelButtonText, { color: aiChatTheme.text.secondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Preview section (unique to UsernameCard)
  previewSection: {
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
    fontSize: 12,
  },
  previewValueBlue: {
    color: '#3388FF',
    fontSize: 14,
    fontWeight: '600',
  },
  previewValueMono: {
    fontSize: 12,
    fontFamily: 'monospace',
  },

  // Description text (unique to UsernameCard)
  description: {
    fontSize: 12,
    lineHeight: 16,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },

  // Confirm button -- inverted colors (unique to UsernameCard)
  confirmButton: {
    flex: 1,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Cancel button -- bordered variant (unique to UsernameCard)
  cancelButton: {
    flex: 1,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Success state -- green theme (unique to UsernameCard)
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
