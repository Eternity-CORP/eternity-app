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
import { truncateAddress } from '@/src/utils/format';
import { TestModeWarning } from '@/src/components/TestModeWarning';
import { cardStyles } from './card-styles';
import { ParticleBg } from './ParticleBg';

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
      <View style={cardStyles.container}>
        <View style={cardStyles.successContainer}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={cardStyles.successCard}
          >
            <FontAwesome name="check-circle" size={32} color="#FFFFFF" />
            <Text style={cardStyles.successTitle}>Transaction Sent!</Text>
            <Text style={cardStyles.successSubtitle}>
              {transaction.amount} {transaction.token} → {recipient}
            </Text>
            {txHash && (
              <Text style={cardStyles.txHash}>
                {truncateAddress(txHash)}
              </Text>
            )}
          </LinearGradient>

          {/* Save Contact Section */}
          {!isInContacts && !contactSaved && onSaveContact && !transaction.toUsername && (
            <View style={cardStyles.saveContactSection}>
              {!showSaveContact ? (
                <TouchableOpacity
                  style={cardStyles.saveContactPrompt}
                  onPress={() => setShowSaveContact(true)}
                >
                  <FontAwesome name="user-plus" size={16} color={aiChat.accentBlue} />
                  <Text style={cardStyles.saveContactPromptText}>
                    Save to contacts?
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={cardStyles.saveContactForm}>
                  <TextInput
                    style={cardStyles.contactNameInput}
                    placeholder="Contact name"
                    placeholderTextColor={aiChat.text.tertiary}
                    value={contactName}
                    onChangeText={setContactName}
                    autoFocus
                  />
                  <View style={cardStyles.saveContactActions}>
                    <TouchableOpacity
                      style={cardStyles.saveContactCancel}
                      onPress={() => setShowSaveContact(false)}
                    >
                      <Text style={cardStyles.saveContactCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={cardStyles.saveContactSave}
                      onPress={handleSaveContact}
                      disabled={savingContact || !contactName.trim()}
                    >
                      {savingContact ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={cardStyles.saveContactSaveText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Contact Saved Confirmation */}
          {contactSaved && (
            <View style={cardStyles.contactSavedBanner}>
              <FontAwesome name="check" size={14} color={aiChat.accentGreen} />
              <Text style={cardStyles.contactSavedText}>Contact saved!</Text>
            </View>
          )}

          {/* Done Button */}
          <TouchableOpacity style={cardStyles.doneButton} onPress={onComplete}>
            <Text style={cardStyles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.card}>
        {/* Particle background */}
        <ParticleBg />

        {/* Header */}
        <View style={cardStyles.header}>
          <View style={[cardStyles.headerIcon, styles.headerIconBg]}>
            <FontAwesome name="paper-plane" size={16} color={aiChat.accentBlue} />
          </View>
          <Text style={cardStyles.headerTitle}>Confirm Transaction</Text>
        </View>

        {/* Amount */}
        <View style={cardStyles.amountSection}>
          <Text style={[cardStyles.amountValue, styles.amountValueTypography]}>
            {transaction.amount} {transaction.token}
          </Text>
          <Text style={cardStyles.amountUsd}>≈ ${transaction.amountUsd}</Text>
        </View>

        {/* Details */}
        <View style={cardStyles.details}>
          <View style={cardStyles.detailRow}>
            <Text style={cardStyles.detailLabel}>To</Text>
            <Text style={cardStyles.detailValue}>{recipient}</Text>
          </View>
          <View style={cardStyles.detailRow}>
            <Text style={cardStyles.detailLabel}>Network</Text>
            <Text style={cardStyles.detailValue}>{transaction.network}</Text>
          </View>
          <View style={cardStyles.detailRow}>
            <Text style={cardStyles.detailLabel}>Gas Fee</Text>
            <Text style={cardStyles.detailValue}>
              ~{transaction.estimatedGas} ETH (${transaction.estimatedGasUsd})
            </Text>
          </View>
        </View>

        {/* Error */}
        {error && (
          <View style={cardStyles.errorBanner}>
            <FontAwesome name="exclamation-circle" size={14} color={aiChat.accentRed} />
            <Text style={cardStyles.errorText}>{error}</Text>
          </View>
        )}

        {/* Test Account Warning */}
        {isTestAccount && (
          <View style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.md }}>
            <TestModeWarning />
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
              colors={['#3388FF', '#2266CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={cardStyles.confirmButtonGradient}
            >
              {status === 'confirming' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <FontAwesome name="check" size={14} color="#FFFFFF" />
                  <Text style={cardStyles.confirmButtonText}>Confirm</Text>
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
