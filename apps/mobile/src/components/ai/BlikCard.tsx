/**
 * BlikCard Component
 * Displays BLIK code generation or payment confirmation in AI chat
 */

import React, { useState, useEffect, useMemo } from 'react';
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
import { getAiChatTheme } from '@/src/constants/ai-chat-theme';
import { useTheme } from '@/src/contexts';
import { truncateAddress } from '@/src/utils/format';
import { TestModeWarning } from '@/src/components/TestModeWarning';
import { getCardStyles } from './card-styles';
import { LogoStrokeDraw } from './LogoStrokeDraw';

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
  isTestAccount?: boolean;
}

export function BlikCard({
  blik,
  onConfirmPay,
  onCancel,
  onComplete,
  onSaveContact,
  isInContacts = false,
  isTestAccount = false,
}: BlikCardProps) {
  const { isDark } = useTheme();
  const aiChatTheme = useMemo(() => getAiChatTheme(isDark), [isDark]);
  const cs = useMemo(() => getCardStyles(aiChatTheme), [aiChatTheme]);

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
      <View style={cs.container}>
        <View style={[cs.card, { borderColor: 'rgba(139,92,246,0.2)' }]}>
          <LogoStrokeDraw />
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

          <TouchableOpacity style={cs.doneButton} onPress={onComplete}>
            <Text style={cs.doneButtonText}>
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
    : truncateAddress(blik.receiverAddress);

  // Success state
  if (status === 'success') {
    return (
      <View style={cs.container}>
        <View style={cs.successContainer}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={cs.successCard}
          >
            <FontAwesome name="check-circle" size={32} color="#FFFFFF" />
            <Text style={cs.successTitle}>BLIK Payment Sent!</Text>
            <Text style={cs.successSubtitle}>
              {blik.amount} {blik.token} → {recipient}
            </Text>
            {txHash && (
              <Text style={cs.txHash}>{truncateAddress(txHash)}</Text>
            )}
          </LinearGradient>

          {/* Save Contact Section */}
          {!isInContacts && !contactSaved && onSaveContact && !blik.receiverUsername && (
            <View style={cs.saveContactSection}>
              {!showSaveContact ? (
                <TouchableOpacity
                  style={cs.saveContactPrompt}
                  onPress={() => setShowSaveContact(true)}
                >
                  <FontAwesome name="user-plus" size={16} color={aiChatTheme.accentBlue} />
                  <Text style={cs.saveContactPromptText}>Save to contacts?</Text>
                </TouchableOpacity>
              ) : (
                <View style={cs.saveContactForm}>
                  <TextInput
                    style={cs.contactNameInput}
                    placeholder="Contact name"
                    placeholderTextColor={aiChatTheme.text.tertiary}
                    value={contactName}
                    onChangeText={setContactName}
                    autoFocus
                  />
                  <View style={cs.saveContactActions}>
                    <TouchableOpacity
                      style={cs.saveContactCancel}
                      onPress={() => setShowSaveContact(false)}
                    >
                      <Text style={cs.saveContactCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={cs.saveContactSave}
                      onPress={handleSaveContact}
                      disabled={savingContact || !contactName.trim()}
                    >
                      {savingContact ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={cs.saveContactSaveText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {contactSaved && (
            <View style={cs.contactSavedBanner}>
              <FontAwesome name="check" size={14} color={aiChatTheme.accentGreen} />
              <Text style={cs.contactSavedText}>Contact saved!</Text>
            </View>
          )}

          <TouchableOpacity style={cs.doneButton} onPress={onComplete}>
            <Text style={cs.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Payment confirmation state
  return (
    <View style={cs.container}>
      <View style={[cs.card, { borderColor: 'rgba(139,92,246,0.2)' }]}>
        <LogoStrokeDraw />
        {/* Header */}
        <View style={cs.header}>
          <View style={[cs.headerIcon, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
            <FontAwesome name="bolt" size={16} color="#8B5CF6" />
          </View>
          <Text style={cs.headerTitle}>Confirm BLIK Payment</Text>
        </View>

        {/* Code Display */}
        <View style={[styles.codeSection, { borderBottomColor: aiChatTheme.divider }]}>
          <Text style={[styles.codeSectionLabel, { color: aiChatTheme.text.tertiary }]}>BLIK Code</Text>
          <Text style={styles.codeSectionValue}>{formatCode(blik.code)}</Text>
        </View>

        {/* Amount */}
        <View style={cs.amountSection}>
          <Text style={cs.amountValue}>
            {blik.amount} {blik.token}
          </Text>
          <Text style={cs.amountUsd}>≈ ${blik.amountUsd}</Text>
        </View>

        {/* Details */}
        <View style={cs.details}>
          <View style={cs.detailRow}>
            <Text style={cs.detailLabel}>To</Text>
            <Text style={cs.detailValue}>{recipient}</Text>
          </View>
          <View style={cs.detailRow}>
            <Text style={cs.detailLabel}>Network</Text>
            <Text style={cs.detailValue}>{blik.network}</Text>
          </View>
          <View style={cs.detailRow}>
            <Text style={cs.detailLabel}>Gas Fee</Text>
            <Text style={cs.detailValue}>
              ~{blik.estimatedGas} ETH (${blik.estimatedGasUsd})
            </Text>
          </View>
        </View>

        {/* Error */}
        {error && (
          <View style={cs.errorBanner}>
            <FontAwesome name="exclamation-circle" size={14} color={aiChatTheme.accentRed} />
            <Text style={cs.errorText}>{error}</Text>
          </View>
        )}

        {/* Test Account Warning */}
        {isTestAccount && (
          <View style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <TestModeWarning />
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
            onPress={handleConfirmPay}
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
                  <FontAwesome name="bolt" size={14} color="#FFFFFF" />
                  <Text style={cs.confirmButtonText}>Pay</Text>
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
  // Code section (pay mode)
  codeSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
  },
  codeSectionLabel: {
    ...theme.typography.caption,
    marginBottom: theme.spacing.xs,
  },
  codeSectionValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: 4,
  },
});
