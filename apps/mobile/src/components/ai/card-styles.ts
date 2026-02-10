/**
 * Shared styles for AI chat card components
 * Eliminates duplication between TransactionCard, BlikCard, SwapCard, UsernameCard
 */

import { StyleSheet } from 'react-native';
import { theme } from '@/src/constants/theme';
import { aiChat } from '@/src/constants/ai-chat-theme';

export const cardStyles = StyleSheet.create({
  // Layout
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  card: {
    backgroundColor: aiChat.glassCard.bg,
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
    borderBottomColor: aiChat.divider,
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
    color: aiChat.text.primary,
    fontWeight: '600',
  },

  // Amount section
  amountSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: aiChat.divider,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  amountUsd: {
    ...theme.typography.body,
    color: aiChat.text.secondary,
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
    color: aiChat.text.tertiary,
  },
  detailValue: {
    ...theme.typography.body,
    color: aiChat.text.primary,
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
    color: aiChat.accentRed,
    flex: 1,
  },

  // Actions (Cancel + Confirm)
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: aiChat.divider,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...theme.typography.body,
    color: aiChat.text.secondary,
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: theme.spacing.md,
  },
  successSubtitle: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.8)',
    marginTop: theme.spacing.xs,
  },
  txHash: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.6)',
    marginTop: theme.spacing.sm,
  },

  // Done button
  doneButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  doneButtonText: {
    ...theme.typography.body,
    color: aiChat.text.primary,
    fontWeight: '600',
  },

  // Save contact
  saveContactSection: {
    backgroundColor: aiChat.glassCard.bg,
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
    color: aiChat.accentBlue,
    fontWeight: '500',
  },
  saveContactForm: {
    gap: theme.spacing.sm,
  },
  contactNameInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: '#FFFFFF',
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
    color: aiChat.text.secondary,
  },
  saveContactSave: {
    flex: 2,
    backgroundColor: aiChat.accentBlue,
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
    color: aiChat.accentGreen,
    fontWeight: '500',
  },
});
