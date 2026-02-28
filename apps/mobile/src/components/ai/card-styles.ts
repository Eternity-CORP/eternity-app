/**
 * Shared styles for AI chat card components
 * Eliminates duplication between TransactionCard, BlikCard, SwapCard, UsernameCard
 *
 * Now theme-aware: use getCardStyles(aiChatTheme) inside components.
 */

import { StyleSheet } from 'react-native';
import { theme } from '@/src/constants/theme';
import { type AiChatTheme, getAiChatTheme } from '@/src/constants/ai-chat-theme';

export function getCardStyles(t: AiChatTheme) {
  return StyleSheet.create({
    // Layout
    container: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
    },
    card: {
      backgroundColor: t.glassCard.bg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(51,136,255,0.2)',
      overflow: 'hidden',
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: t.divider,
    },
    headerIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.sm,
    },
    headerTitle: {
      ...theme.typography.body,
      color: t.text.primary,
      fontWeight: '600',
    },

    // Amount section
    amountSection: {
      alignItems: 'center',
      paddingVertical: theme.spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: t.divider,
    },
    amountValue: {
      fontSize: 28,
      fontWeight: '700',
      color: t.amountText,
    },
    amountUsd: {
      ...theme.typography.body,
      color: t.text.secondary,
      marginTop: theme.spacing.xs,
    },

    // Detail rows
    details: {
      padding: theme.spacing.md,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    detailLabel: {
      ...theme.typography.caption,
      color: t.text.tertiary,
    },
    detailValue: {
      ...theme.typography.body,
      color: t.text.primary,
      fontWeight: '500',
    },

    // Error banner
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      padding: theme.spacing.sm,
      backgroundColor: 'rgba(239,68,68,0.1)',
      borderRadius: theme.borderRadius.sm,
    },
    errorText: {
      ...theme.typography.caption,
      color: t.accentRed,
      flex: 1,
    },

    // Actions (Cancel + Confirm)
    actions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: t.divider,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      backgroundColor: t.cancelButtonBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButtonText: {
      ...theme.typography.body,
      color: t.text.secondary,
      fontWeight: '600',
    },
    confirmButton: {
      flex: 2,
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
    },
    confirmButtonDisabled: {
      opacity: 0.6,
    },
    confirmButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
    },
    confirmButtonText: {
      ...theme.typography.body,
      color: t.onGradientText,
      fontWeight: '600',
    },

    // Success state
    successContainer: {
      gap: theme.spacing.md,
    },
    successCard: {
      alignItems: 'center',
      padding: theme.spacing.xl,
      borderRadius: theme.borderRadius.lg,
    },
    successTitle: {
      ...theme.typography.heading,
      color: t.onGradientText,
      fontWeight: '700',
      marginTop: theme.spacing.md,
    },
    successSubtitle: {
      ...theme.typography.body,
      color: t.successSubtitleColor,
      marginTop: theme.spacing.xs,
    },
    txHash: {
      ...theme.typography.caption,
      color: t.txHashColor,
      marginTop: theme.spacing.sm,
    },

    // Done button
    doneButton: {
      backgroundColor: t.doneButtonBg,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: t.doneButtonBorder,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    doneButtonText: {
      ...theme.typography.body,
      color: t.text.primary,
      fontWeight: '600',
    },

    // Save contact
    saveContactSection: {
      backgroundColor: t.glassCard.bg,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
    },
    saveContactPrompt: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    saveContactPromptText: {
      ...theme.typography.body,
      color: t.accentBlue,
      fontWeight: '500',
    },
    saveContactForm: {
      gap: theme.spacing.sm,
    },
    contactNameInput: {
      backgroundColor: t.surfaceTintInput,
      borderWidth: 1,
      borderColor: t.borderTintLight,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      color: t.contactInputText,
      ...theme.typography.body,
    },
    saveContactActions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    saveContactCancel: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveContactCancelText: {
      ...theme.typography.body,
      color: t.text.secondary,
    },
    saveContactSave: {
      flex: 2,
      backgroundColor: t.accentBlue,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveContactSaveText: {
      ...theme.typography.body,
      color: '#FFFFFF',
      fontWeight: '600',
    },
    contactSavedBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      backgroundColor: 'rgba(34,197,94,0.15)',
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
    },
    contactSavedText: {
      ...theme.typography.body,
      color: t.accentGreen,
      fontWeight: '500',
    },
  });
}

// Backward compatibility — dark-theme styles as default export
export const cardStyles = getCardStyles(getAiChatTheme(true));
