/**
 * Send Screen 2: Recipient Address Input
 * Supports both direct address, @username lookup, and saved contacts
 */

import { StyleSheet, View, Text, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { setRecipient, setStep, fetchRecipientPreferencesThunk, clearRecipientPreferences } from '@/src/store/slices/send-slice';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { loadContactsThunk } from '@/src/store/slices/contacts-slice';
import { validateAddress } from '@/src/services/send-service';
import { lookupUsername, isValidUsernameFormat } from '@/src/services/username-service';
import { truncateAddress } from '@/src/utils/format';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import type { Contact } from '@/src/services/contacts-service';

// Debounce helper
function debounce<T extends (...args: string[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default function RecipientScreen() {
  const dispatch = useAppDispatch();
  const send = useAppSelector((state) => state.send);
  const wallet = useAppSelector((state) => state.wallet);
  const contacts = useAppSelector((state) => state.contacts.contacts);
  const currentAccount = getCurrentAccount(wallet);
  const [input, setInput] = useState(send.recipient);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolvedUsername, setResolvedUsername] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load contacts on mount
  useEffect(() => {
    dispatch(loadContactsThunk());
  }, [dispatch]);

  // Clear recipient preferences when input changes
  useEffect(() => {
    dispatch(clearRecipientPreferences());
  }, [input, dispatch]);

  // Check if input is a username (starts with @)
  const isUsernameInput = input.trim().startsWith('@');

  // Filter contacts based on input
  const filteredContacts = useMemo(() => {
    if (!input.trim()) {
      // Show first 5 recent contacts when no input
      return contacts.slice(0, 5);
    }
    const query = input.toLowerCase();
    return contacts.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.address.toLowerCase().includes(query) ||
      (c.username && c.username.toLowerCase().includes(query))
    ).slice(0, 5);
  }, [contacts, input]);

  // Handle contact selection
  const handleSelectContact = (contact: Contact) => {
    setInput(contact.username ? `@${contact.username}` : contact.address);
    setResolvedAddress(contact.address);
    setResolvedUsername(contact.username ? `@${contact.username}` : null);
    setError(null);
  };

  // Debounced username lookup
  const debouncedLookup = useMemo(
    () =>
      debounce(async (username: string) => {
        setIsLookingUp(true);
        setError(null);
        try {
          const result = await lookupUsername(username);
          if (result) {
            setResolvedAddress(result.address);
            setResolvedUsername(username.startsWith('@') ? username : `@${username}`);
            setError(null);
          } else {
            setResolvedAddress(null);
            setResolvedUsername(null);
            setError('Username not found');
          }
        } catch (err) {
          setResolvedAddress(null);
          setResolvedUsername(null);
          setError('Connection error. Try again.');
        } finally {
          setIsLookingUp(false);
        }
      }, 300),
    []
  );

  // Handle input changes
  const handleInputChange = useCallback(
    (text: string) => {
      setInput(text);
      setError(null);

      const trimmed = text.trim();

      if (trimmed.startsWith('@') && trimmed.length > 1) {
        // Username input - trigger lookup
        const username = trimmed.slice(1).toLowerCase();
        if (isValidUsernameFormat(username)) {
          debouncedLookup(username);
        } else {
          setResolvedAddress(null);
          setResolvedUsername(null);
          if (trimmed.length > 3) {
            setError('Invalid username format');
          }
        }
      } else if (validateAddress(trimmed)) {
        // Direct address
        setResolvedAddress(trimmed);
        setResolvedUsername(null);
        setIsLookingUp(false);
      } else {
        // Invalid or incomplete
        setResolvedAddress(null);
        setResolvedUsername(null);
        setIsLookingUp(false);
      }
    },
    [debouncedLookup]
  );

  // Check if recipient is the same as current wallet
  const isSelfSend = resolvedAddress && currentAccount?.address
    ? resolvedAddress.toLowerCase() === currentAccount.address.toLowerCase()
    : false;

  const handleContinue = () => {
    if (!resolvedAddress) {
      setError('Please enter a valid address or @username');
      return;
    }

    if (isSelfSend) {
      setError('Cannot send to yourself');
      return;
    }

    setError(null);
    dispatch(setRecipient(resolvedAddress));

    // Fetch recipient preferences in background (username if resolved, otherwise address)
    dispatch(fetchRecipientPreferencesThunk(resolvedUsername || resolvedAddress));

    dispatch(setStep('amount'));
    router.push('/send/amount');
  };

  const canContinue = resolvedAddress && !isLookingUp && !isSelfSend;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader
        title="Send"
        rightElement={
          <TouchableOpacity onPress={() => router.push('/send/scan')}>
            <FontAwesome name="qrcode" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <View style={styles.container}>
        <View style={styles.topSection}>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, theme.typography.body]}
              placeholder="Enter address or @username"
              placeholderTextColor={theme.colors.textTertiary}
              value={input}
              onChangeText={handleInputChange}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Status indicators */}
            <View style={styles.statusContainer}>
              {isLookingUp && (
                <View style={styles.statusRow}>
                  <ActivityIndicator size="small" color={theme.colors.buttonPrimary} />
                  <Text style={[styles.statusText, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                    Searching...
                  </Text>
                </View>
              )}

              {!isLookingUp && resolvedAddress && resolvedUsername && (
                <View style={styles.statusRow}>
                  <FontAwesome name="check-circle" size={16} color={theme.colors.success} />
                  <Text style={[styles.statusText, theme.typography.caption, { color: theme.colors.success }]}>
                    {resolvedUsername} → {truncateAddress(resolvedAddress)}
                  </Text>
                </View>
              )}

              {!isLookingUp && resolvedAddress && !resolvedUsername && !isUsernameInput && (
                <View style={styles.statusRow}>
                  <FontAwesome name="check-circle" size={16} color={theme.colors.success} />
                  <Text style={[styles.statusText, theme.typography.caption, { color: theme.colors.success }]}>
                    Valid address
                  </Text>
                </View>
              )}

              {error && (
                <View style={styles.statusRow}>
                  <FontAwesome name="times-circle" size={16} color={theme.colors.error} />
                  <Text style={[styles.statusText, theme.typography.caption, { color: theme.colors.error }]}>
                    {error}
                  </Text>
                </View>
              )}
            </View>
          </View>


          {/* Contacts List */}
          {filteredContacts.length > 0 && (
            <View style={styles.contactsSection}>
              <Text style={[styles.contactsTitle, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                {input.trim() ? 'Matching Contacts' : 'Recent'}
              </Text>
              <ScrollView style={styles.contactsList} showsVerticalScrollIndicator={false}>
                {filteredContacts.map((contact) => (
                  <TouchableOpacity
                    key={contact.id}
                    style={styles.contactItem}
                    onPress={() => handleSelectContact(contact)}
                  >
                    <View style={styles.contactAvatar}>
                      <FontAwesome name="user" size={16} color={theme.colors.textTertiary} />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={[styles.contactName, theme.typography.body]} numberOfLines={1}>
                        {contact.name}
                      </Text>
                      <Text style={[styles.contactAddress, theme.typography.caption, { color: theme.colors.textTertiary }]} numberOfLines={1}>
                        {contact.username ? `@${contact.username}` : truncateAddress(contact.address)}
                      </Text>
                    </View>
                    <FontAwesome name="chevron-right" size={12} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text style={[styles.continueButtonText, theme.typography.heading]}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: 'space-between',
  },
  topSection: {
    flex: 1,
  },
  inputContainer: {
    marginTop: theme.spacing.xl,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    color: theme.colors.textPrimary,
    fontSize: 16,
  },
  statusContainer: {
    marginTop: theme.spacing.md,
    minHeight: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  statusText: {
    flex: 1,
  },
  // Contacts section
  contactsSection: {
    marginTop: theme.spacing.xl,
  },
  contactsTitle: {
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  contactsList: {
    maxHeight: 250,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    color: theme.colors.textPrimary,
  },
  contactAddress: {
    marginTop: 2,
  },
  // Continue button
  continueButton: {
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  continueButtonDisabled: {
    backgroundColor: theme.colors.textTertiary,
  },
  continueButtonText: {
    color: theme.colors.buttonPrimaryText,
  },
});
