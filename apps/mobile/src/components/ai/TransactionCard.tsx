/**
 * TransactionCard Component
 * Displays transaction confirmation request with approve/reject buttons
 * Also supports save contact after successful transaction
 */

import React, { useState, useMemo } from 'react';
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
  const { isDark } = useTheme();
  const aiChatTheme = useMemo(() => getAiChatTheme(isDark), [isDark]);
  const cs = useMemo(() => getCardStyles(aiChatTheme), [aiChatTheme]);

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
      console.error('Failed to save contact:', err);
    } finally {
      setSavingContact(false);
    }
  };

  const recipient = transaction.toUsername
    ? `@${transaction.toUsername}`
    : truncateAddress(transaction.to);

  // Success state with save contact option
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
            <Text style={cs.successTitle}>Transaction Sent!</Text>
            <Text style={cs.successSubtitle}>
              {transaction.amount} {transaction.token} → {recipient}
            </Text>
            {txHash && (
              <Text style={cs.txHash}>
                {truncateAddress(txHash)}
              </Text>
            )}
          </LinearGradient>

          {/* Save Contact Section */}
          {!isInContacts && !contactSaved && onSaveContact && !transaction.toUsername && (
            <View style={cs.saveContactSection}>
              {!showSaveContact ? (
                <TouchableOpacity
                  style={cs.saveContactPrompt}
                  onPress={() => setShowSaveContact(true)}
                >
                  <FontAwesome name="user-plus" size={16} color={aiChatTheme.accentBlue} />
                  <Text style={cs.saveContactPromptText}>
                    Save to contacts?
                  </Text>
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

          {/* Contact Saved Confirmation */}
          {contactSaved && (
            <View style={cs.contactSavedBanner}>
              <FontAwesome name="check" size={14} color={aiChatTheme.accentGreen} />
              <Text style={cs.contactSavedText}>Contact saved!</Text>
            </View>
          )}

          {/* Done Button */}
          <TouchableOpacity style={cs.doneButton} onPress={onComplete}>
            <Text style={cs.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={cs.container}>
      <View style={cs.card}>
        {/* Particle background */}
        <LogoStrokeDraw />

        {/* Header */}
        <View style={cs.header}>
          <View style={[cs.headerIcon, styles.headerIconBg]}>
            <FontAwesome name="paper-plane" size={16} color={aiChatTheme.accentBlue} />
          </View>
          <Text style={cs.headerTitle}>Confirm Transaction</Text>
        </View>

        {/* Amount */}
        <View style={cs.amountSection}>
          <Text style={[cs.amountValue, styles.amountValueTypography]}>
            {transaction.amount} {transaction.token}
          </Text>
          <Text style={cs.amountUsd}>≈ ${transaction.amountUsd}</Text>
        </View>

        {/* Details */}
        <View style={cs.details}>
          <View style={cs.detailRow}>
            <Text style={cs.detailLabel}>To</Text>
            <Text style={cs.detailValue}>{recipient}</Text>
          </View>
          <View style={cs.detailRow}>
            <Text style={cs.detailLabel}>Network</Text>
            <Text style={cs.detailValue}>{transaction.network}</Text>
          </View>
          <View style={cs.detailRow}>
            <Text style={cs.detailLabel}>Gas Fee</Text>
            <Text style={cs.detailValue}>
              ~{transaction.estimatedGas} ETH (${transaction.estimatedGasUsd})
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
            onPress={handleConfirm}
            disabled={status === 'confirming'}
          >
            <LinearGradient
              colors={['#3388FF', '#2266CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={cs.confirmButtonGradient}
            >
              {status === 'confirming' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <FontAwesome name="check" size={14} color="#FFFFFF" />
                  <Text style={cs.confirmButtonText}>Confirm</Text>
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
 * Local styles unique to TransactionCard.
 * - headerIconBg: transaction-specific blue icon background
 * - amountValueTypography: includes theme.typography.title spread not in shared styles
 */
const styles = StyleSheet.create({
  headerIconBg: {
    backgroundColor: 'rgba(51,136,255,0.15)',
  },
  amountValueTypography: {
    ...theme.typography.title,
  },
});
