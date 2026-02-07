/**
 * TransactionCard Component
 * Displays transaction confirmation request with approve/reject buttons
 * Also supports save contact after successful transaction
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome } from '@expo/vector-icons';
import { theme } from '@/src/constants/theme';
import { aiChat } from '@/src/constants/ai-chat-theme';
import { TestModeWarning } from '@/src/components/TestModeWarning';

export interface PendingTransaction {
  id: string;
  from: string;
  to: string;
  toUsername?: string;
  amount: string;
  token: string;
  amountUsd: string;
  estimatedGas: string;
  estimatedGasUsd: string;
  network: string;
  status: 'pending_confirmation' | 'sending' | 'sent' | 'failed';
}

interface TransactionCardProps {
  transaction: PendingTransaction;
  onConfirm: (tx: PendingTransaction) => Promise<string>; // Returns txHash
  onCancel: () => void;
  onComplete: () => void;
  onSaveContact?: (address: string, name: string) => Promise<void>;
  isInContacts?: boolean;
  isTestAccount?: boolean;
}

export function TransactionCard({
  transaction,
  onConfirm,
  onCancel,
  onComplete,
  onSaveContact,
  isInContacts = false,
  isTestAccount = false,
}: TransactionCardProps) {
  const [status, setStatus] = useState<'idle' | 'confirming' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [showSaveContact, setShowSaveContact] = useState(false);
  const [contactName, setContactName] = useState(transaction.toUsername || '');
  const [savingContact, setSavingContact] = useState(false);
  const [contactSaved, setContactSaved] = useState(false);

  const handleConfirm = async () => {
    setStatus('confirming');
    setError(null);

    try {
      const hash = await onConfirm(transaction);
      setTxHash(hash);
      setStatus('success');
    } catch (err) {
      setError((err as Error).message || 'Transaction failed');
      setStatus('error');
    }
  };

  const handleSaveContact = async () => {
    if (!contactName.trim() || !onSaveContact) return;

    setSavingContact(true);
    try {
      await onSaveContact(transaction.to, contactName.trim());
      setContactSaved(true);
      setShowSaveContact(false);
    } catch (err) {
      // Silently fail - contact saving is optional
    } finally {
      setSavingContact(false);
    }
  };

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const recipient = transaction.toUsername
    ? `@${transaction.toUsername}`
    : formatAddress(transaction.to);

  // Success state with save contact option
  if (status === 'success') {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.successCard}
          >
            <FontAwesome name="check-circle" size={32} color="#FFFFFF" />
            <Text style={styles.successTitle}>Transaction Sent!</Text>
            <Text style={styles.successSubtitle}>
              {transaction.amount} {transaction.token} → {recipient}
            </Text>
            {txHash && (
              <Text style={styles.txHash}>
                {formatAddress(txHash)}
              </Text>
            )}
          </LinearGradient>

          {/* Save Contact Section */}
          {!isInContacts && !contactSaved && onSaveContact && !transaction.toUsername && (
            <View style={styles.saveContactSection}>
              {!showSaveContact ? (
                <TouchableOpacity
                  style={styles.saveContactPrompt}
                  onPress={() => setShowSaveContact(true)}
                >
                  <FontAwesome name="user-plus" size={16} color={aiChat.accentBlue} />
                  <Text style={styles.saveContactPromptText}>
                    Save to contacts?
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.saveContactForm}>
                  <TextInput
                    style={styles.contactNameInput}
                    placeholder="Contact name"
                    placeholderTextColor={aiChat.text.tertiary}
                    value={contactName}
                    onChangeText={setContactName}
                    autoFocus
                  />
                  <View style={styles.saveContactActions}>
                    <TouchableOpacity
                      style={styles.saveContactCancel}
                      onPress={() => setShowSaveContact(false)}
                    >
                      <Text style={styles.saveContactCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveContactSave}
                      onPress={handleSaveContact}
                      disabled={savingContact || !contactName.trim()}
                    >
                      {savingContact ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.saveContactSaveText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Contact Saved Confirmation */}
          {contactSaved && (
            <View style={styles.contactSavedBanner}>
              <FontAwesome name="check" size={14} color={aiChat.accentGreen} />
              <Text style={styles.contactSavedText}>Contact saved!</Text>
            </View>
          )}

          {/* Done Button */}
          <TouchableOpacity style={styles.doneButton} onPress={onComplete}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <FontAwesome name="paper-plane" size={16} color={aiChat.accentBlue} />
          </View>
          <Text style={styles.headerTitle}>Confirm Transaction</Text>
        </View>

        {/* Amount */}
        <View style={styles.amountSection}>
          <Text style={styles.amountValue}>
            {transaction.amount} {transaction.token}
          </Text>
          <Text style={styles.amountUsd}>≈ ${transaction.amountUsd}</Text>
        </View>

        {/* Details */}
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>To</Text>
            <Text style={styles.detailValue}>{recipient}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Network</Text>
            <Text style={styles.detailValue}>{transaction.network}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gas Fee</Text>
            <Text style={styles.detailValue}>
              ~{transaction.estimatedGas} ETH (${transaction.estimatedGasUsd})
            </Text>
          </View>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBanner}>
            <FontAwesome name="exclamation-circle" size={14} color={aiChat.accentRed} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Test Account Warning */}
        {isTestAccount && (
          <View style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <TestModeWarning />
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            disabled={status === 'confirming'}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmButton, status === 'confirming' && styles.confirmButtonDisabled]}
            onPress={handleConfirm}
            disabled={status === 'confirming'}
          >
            <LinearGradient
              colors={['#3388FF', '#2266CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.confirmButtonGradient}
            >
              {status === 'confirming' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <FontAwesome name="check" size={14} color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(51,136,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.body,
    color: aiChat.text.primary,
    fontWeight: '600',
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: aiChat.divider,
  },
  amountValue: {
    ...theme.typography.title,
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  amountUsd: {
    ...theme.typography.body,
    color: aiChat.text.secondary,
    marginTop: theme.spacing.xs,
  },
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
  // Success state styles
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
  // Save contact styles
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
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
});
