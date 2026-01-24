/**
 * BlikCard Component
 * Displays BLIK code generation or payment confirmation in AI chat
 */

import React, { useState, useEffect, useCallback } from 'react';
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

export interface PendingBlikGenerate {
  type: 'generate';
  id: string;
  code: string;
  amount: string;
  token: string;
  amountUsd: string;
  expiresAt: number; // Unix timestamp
  status: 'pending' | 'paid' | 'expired';
}

export interface PendingBlikPay {
  type: 'pay';
  id: string;
  code: string;
  receiverAddress: string;
  receiverUsername?: string;
  amount: string;
  token: string;
  amountUsd: string;
  estimatedGas: string;
  estimatedGasUsd: string;
  network: string;
  status: 'pending_confirmation';
}

export type PendingBlik = PendingBlikGenerate | PendingBlikPay;

interface BlikCardProps {
  blik: PendingBlik;
  onConfirmPay: (blik: PendingBlikPay) => Promise<string>; // Returns txHash
  onCancel: () => void;
  onComplete: () => void;
  onSaveContact?: (address: string, name: string) => Promise<void>;
  isInContacts?: boolean;
}

export function BlikCard({
  blik,
  onConfirmPay,
  onCancel,
  onComplete,
  onSaveContact,
  isInContacts = false,
}: BlikCardProps) {
  const [status, setStatus] = useState<'idle' | 'confirming' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showSaveContact, setShowSaveContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const [contactSaved, setContactSaved] = useState(false);

  // Countdown timer for generate mode
  useEffect(() => {
    if (blik.type !== 'generate') return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((blik.expiresAt - now) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [blik]);

  const handleConfirmPay = async () => {
    if (blik.type !== 'pay') return;

    setStatus('confirming');
    setError(null);

    try {
      const hash = await onConfirmPay(blik);
      setTxHash(hash);
      setStatus('success');
    } catch (err) {
      setError((err as Error).message || 'Payment failed');
      setStatus('error');
    }
  };

  const handleSaveContact = async () => {
    if (!contactName.trim() || !onSaveContact || blik.type !== 'pay') return;

    setSavingContact(true);
    try {
      await onSaveContact(blik.receiverAddress, contactName.trim());
      setContactSaved(true);
      setShowSaveContact(false);
    } catch {
      // Silently fail - contact saving is optional
    } finally {
      setSavingContact(false);
    }
  };

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCode = (code: string) => {
    return code.slice(0, 3) + ' ' + code.slice(3);
  };

  // Generate mode - show code with countdown
  if (blik.type === 'generate') {
    const isExpired = timeLeft === 0;

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.generateCard}
          >
            <View style={styles.generateHeader}>
              <FontAwesome name="qrcode" size={24} color="#FFFFFF" />
              <Text style={styles.generateTitle}>BLIK Code</Text>
            </View>

            <Text style={styles.codeDisplay}>{formatCode(blik.code)}</Text>

            <Text style={styles.amountText}>
              {blik.amount} {blik.token} (~${blik.amountUsd})
            </Text>

            <View style={styles.timerContainer}>
              {isExpired ? (
                <Text style={styles.expiredText}>Code expired</Text>
              ) : (
                <>
                  <FontAwesome name="clock-o" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.timerText}>Expires in {formatTime(timeLeft)}</Text>
                </>
              )}
            </View>

            {blik.status === 'paid' && (
              <View style={styles.paidBadge}>
                <FontAwesome name="check-circle" size={16} color="#10B981" />
                <Text style={styles.paidText}>Payment received!</Text>
              </View>
            )}
          </LinearGradient>

          <TouchableOpacity style={styles.doneButton} onPress={onComplete}>
            <Text style={styles.doneButtonText}>
              {blik.status === 'paid' ? 'Done' : 'Cancel'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Pay mode - show payment confirmation
  const recipient = blik.receiverUsername
    ? `@${blik.receiverUsername}`
    : formatAddress(blik.receiverAddress);

  // Success state
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
            <Text style={styles.successTitle}>BLIK Payment Sent!</Text>
            <Text style={styles.successSubtitle}>
              {blik.amount} {blik.token} → {recipient}
            </Text>
            {txHash && (
              <Text style={styles.txHash}>{formatAddress(txHash)}</Text>
            )}
          </LinearGradient>

          {/* Save Contact Section */}
          {!isInContacts && !contactSaved && onSaveContact && !blik.receiverUsername && (
            <View style={styles.saveContactSection}>
              {!showSaveContact ? (
                <TouchableOpacity
                  style={styles.saveContactPrompt}
                  onPress={() => setShowSaveContact(true)}
                >
                  <FontAwesome name="user-plus" size={16} color={theme.colors.accent} />
                  <Text style={styles.saveContactPromptText}>Save to contacts?</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.saveContactForm}>
                  <TextInput
                    style={styles.contactNameInput}
                    placeholder="Contact name"
                    placeholderTextColor={theme.colors.textTertiary}
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

          {contactSaved && (
            <View style={styles.contactSavedBanner}>
              <FontAwesome name="check" size={14} color={theme.colors.success} />
              <Text style={styles.contactSavedText}>Contact saved!</Text>
            </View>
          )}

          <TouchableOpacity style={styles.doneButton} onPress={onComplete}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Payment confirmation state
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <FontAwesome name="bolt" size={16} color="#8B5CF6" />
          </View>
          <Text style={styles.headerTitle}>Confirm BLIK Payment</Text>
        </View>

        {/* Code Display */}
        <View style={styles.codeSection}>
          <Text style={styles.codeSectionLabel}>BLIK Code</Text>
          <Text style={styles.codeSectionValue}>{formatCode(blik.code)}</Text>
        </View>

        {/* Amount */}
        <View style={styles.amountSection}>
          <Text style={styles.amountValue}>
            {blik.amount} {blik.token}
          </Text>
          <Text style={styles.amountUsd}>≈ ${blik.amountUsd}</Text>
        </View>

        {/* Details */}
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>To</Text>
            <Text style={styles.detailValue}>{recipient}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Network</Text>
            <Text style={styles.detailValue}>{blik.network}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Gas Fee</Text>
            <Text style={styles.detailValue}>
              ~{blik.estimatedGas} ETH (${blik.estimatedGasUsd})
            </Text>
          </View>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorBanner}>
            <FontAwesome name="exclamation-circle" size={14} color={theme.colors.error} />
            <Text style={styles.errorText}>{error}</Text>
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
            onPress={handleConfirmPay}
            disabled={status === 'confirming'}
          >
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.confirmButtonGradient}
            >
              {status === 'confirming' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <FontAwesome name="bolt" size={14} color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>Pay</Text>
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
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#8B5CF6' + '40',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6' + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  codeSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  codeSectionLabel: {
    ...theme.typography.caption,
    color: theme.colors.textTertiary,
    marginBottom: theme.spacing.xs,
  },
  codeSectionValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: 4,
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  amountValue: {
    ...theme.typography.title,
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  amountUsd: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
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
    color: theme.colors.textTertiary,
  },
  detailValue: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.error + '15',
    borderRadius: theme.borderRadius.sm,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
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
  // Generate mode styles
  generateCard: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
  },
  generateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  generateTitle: {
    ...theme.typography.heading,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  codeDisplay: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 8,
    marginBottom: theme.spacing.md,
  },
  amountText: {
    ...theme.typography.body,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: theme.spacing.lg,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  timerText: {
    ...theme.typography.caption,
    color: 'rgba(255,255,255,0.8)',
  },
  expiredText: {
    ...theme.typography.caption,
    color: '#FCA5A5',
    fontWeight: '600',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: theme.borderRadius.md,
  },
  paidText: {
    ...theme.typography.body,
    color: '#10B981',
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  doneButtonText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
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
    backgroundColor: theme.colors.surface,
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
    color: theme.colors.accent,
    fontWeight: '500',
  },
  saveContactForm: {
    gap: theme.spacing.sm,
  },
  contactNameInput: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
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
    color: theme.colors.textSecondary,
  },
  saveContactSave: {
    flex: 2,
    backgroundColor: theme.colors.accent,
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
    backgroundColor: theme.colors.success + '15',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
  },
  contactSavedText: {
    ...theme.typography.body,
    color: theme.colors.success,
    fontWeight: '500',
  },
});
