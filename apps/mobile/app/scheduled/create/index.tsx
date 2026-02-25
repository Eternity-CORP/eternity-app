/**
 * Scheduled Payment Create - Step 1: Recipient Selection
 */

import { StyleSheet, View, Text, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { setRecipient, setStep, resetScheduledCreate, setSelectedNetwork } from '@/src/store/slices/scheduled-create-slice';
import { getCurrentAccount, selectIsTestAccount } from '@/src/store/slices/wallet-slice';
import { loadContactsThunk } from '@/src/store/slices/contacts-slice';
import { validateAddress } from '@/src/services/send-service';
import { lookupUsername, isValidUsernameFormat } from '@/src/services/username-service';
import { truncateAddress } from '@/src/utils/format';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import { debounce, SUPPORTED_NETWORKS, TIER1_NETWORK_IDS, type NetworkId } from '@e-y/shared';
import type { Contact } from '@/src/services/contacts-service';

export default function ScheduledRecipientScreen() {
  const dispatch = useAppDispatch();
  const { theme: dynamicTheme } = useTheme();
  const scheduledCreate = useAppSelector((state) => state.scheduledCreate);
  const wallet = useAppSelector((state) => state.wallet);
  const contacts = useAppSelector((state) => state.contacts.contacts);
  const currentAccount = getCurrentAccount(wallet);
  const isTestAccount = useAppSelector(selectIsTestAccount);
  const [input, setInput] = useState(scheduledCreate.recipient);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolvedUsername, setResolvedUsername] = useState<string | null>(null);
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when starting new flow
  useEffect(() => {
    dispatch(resetScheduledCreate());
  }, [dispatch]);

  // Load contacts on mount
  useEffect(() => {
    dispatch(loadContactsThunk());
  }, [dispatch]);

  const isUsernameInput = input.trim().startsWith('@');

  const filteredContacts = useMemo(() => {
    if (!input.trim()) {
      return contacts.slice(0, 5);
    }
    const query = input.toLowerCase();
    return contacts.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.address.toLowerCase().includes(query) ||
      (c.username && c.username.toLowerCase().includes(query))
    ).slice(0, 5);
  }, [contacts, input]);

  const handleSelectContact = (contact: Contact) => {
    setInput(contact.username ? `@${contact.username}` : contact.address);
    setResolvedAddress(contact.address);
    setResolvedUsername(contact.username ? `@${contact.username}` : null);
    setResolvedName(contact.name);
    setError(null);
  };

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
            setResolvedName(null);
            setError(null);
          } else {
            setResolvedAddress(null);
            setResolvedUsername(null);
            setResolvedName(null);
            setError('Username not found');
          }
        } catch (err) {
          setResolvedAddress(null);
          setResolvedUsername(null);
          setResolvedName(null);
          setError('Connection error. Try again.');
        } finally {
          setIsLookingUp(false);
        }
      }, 300),
    []
  );

  const handleInputChange = useCallback(
    (text: string) => {
      setInput(text);
      setError(null);
      setResolvedName(null);

      const trimmed = text.trim();

      // Check contacts first
      const contact = contacts.find(
        c =>
          c.address.toLowerCase() === trimmed.toLowerCase() ||
          (c.username && `@${c.username}`.toLowerCase() === trimmed.toLowerCase()) ||
          c.name.toLowerCase() === trimmed.toLowerCase()
      );

      if (contact) {
        setResolvedAddress(contact.address);
        setResolvedUsername(contact.username ? `@${contact.username}` : null);
        setResolvedName(contact.name);
        setIsLookingUp(false);
        return;
      }

      if (trimmed.startsWith('@') && trimmed.length > 1) {
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
        setResolvedAddress(trimmed);
        setResolvedUsername(null);
        setIsLookingUp(false);
      } else {
        setResolvedAddress(null);
        setResolvedUsername(null);
        setIsLookingUp(false);
      }
    },
    [debouncedLookup, contacts]
  );

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
    dispatch(setRecipient({
      address: resolvedAddress,
      username: resolvedUsername,
      name: resolvedName,
    }));
    dispatch(setStep('token'));
    router.push('/scheduled/create/token');
  };

  const canContinue = resolvedAddress && !isLookingUp && !isSelfSend;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Schedule Payment" />

      <View style={styles.container}>
        <View style={styles.topSection}>
          <Text style={[styles.stepIndicator, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
            Step 1 of 5
          </Text>
          <Text style={[styles.subtitle, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>
            Who are you sending to?
          </Text>

          {/* Network selector — only for real accounts */}
          {!isTestAccount && (
            <View style={styles.networkSection}>
              <Text style={[styles.networkLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                Network
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.networkScroll}>
                {TIER1_NETWORK_IDS.map((id) => {
                  const net = SUPPORTED_NETWORKS[id];
                  const isSelected = id === scheduledCreate.selectedNetwork;
                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => dispatch(setSelectedNetwork(id as NetworkId))}
                      style={[
                        styles.networkChip,
                        {
                          borderColor: isSelected ? net.color + '60' : 'rgba(255,255,255,0.08)',
                          backgroundColor: isSelected ? net.color + '20' : 'transparent',
                        },
                      ]}
                    >
                      <Text style={[styles.networkChipText, { color: isSelected ? net.color : 'rgba(255,255,255,0.4)' }]}>
                        {net.shortName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, theme.typography.body, { backgroundColor: dynamicTheme.colors.surface, color: dynamicTheme.colors.textPrimary }]}
              placeholder="Enter address or @username"
              placeholderTextColor={dynamicTheme.colors.textTertiary}
              value={input}
              onChangeText={handleInputChange}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.statusContainer}>
              {isLookingUp && (
                <View style={styles.statusRow}>
                  <ActivityIndicator size="small" color={dynamicTheme.colors.buttonPrimary} />
                  <Text style={[styles.statusText, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                    Searching...
                  </Text>
                </View>
              )}

              {!isLookingUp && resolvedAddress && (resolvedUsername || resolvedName) && (
                <View style={styles.statusRow}>
                  <FontAwesome name="check-circle" size={16} color={dynamicTheme.colors.success} />
                  <Text style={[styles.statusText, theme.typography.caption, { color: dynamicTheme.colors.success }]}>
                    {resolvedName || resolvedUsername} {'\u2192'} {truncateAddress(resolvedAddress)}
                  </Text>
                </View>
              )}

              {!isLookingUp && resolvedAddress && !resolvedUsername && !resolvedName && !isUsernameInput && (
                <View style={styles.statusRow}>
                  <FontAwesome name="check-circle" size={16} color={dynamicTheme.colors.success} />
                  <Text style={[styles.statusText, theme.typography.caption, { color: dynamicTheme.colors.success }]}>
                    Valid address
                  </Text>
                </View>
              )}

              {error && (
                <View style={styles.statusRow}>
                  <FontAwesome name="times-circle" size={16} color={dynamicTheme.colors.error} />
                  <Text style={[styles.statusText, theme.typography.caption, { color: dynamicTheme.colors.error }]}>
                    {error}
                  </Text>
                </View>
              )}

              {isSelfSend && (
                <View style={styles.statusRow}>
                  <FontAwesome name="times-circle" size={16} color={dynamicTheme.colors.error} />
                  <Text style={[styles.statusText, theme.typography.caption, { color: dynamicTheme.colors.error }]}>
                    Cannot send to yourself
                  </Text>
                </View>
              )}
            </View>
          </View>

          {filteredContacts.length > 0 && (
            <View style={styles.contactsSection}>
              <Text style={[styles.contactsTitle, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                {input.trim() ? 'Matching Contacts' : 'Recent'}
              </Text>
              <ScrollView style={styles.contactsList} showsVerticalScrollIndicator={false}>
                {filteredContacts.map((contact) => (
                  <TouchableOpacity
                    key={contact.id}
                    style={[styles.contactItem, { backgroundColor: dynamicTheme.colors.surface }]}
                    onPress={() => handleSelectContact(contact)}
                  >
                    <View style={[styles.contactAvatar, { backgroundColor: dynamicTheme.colors.surfaceHover }]}>
                      <FontAwesome name="user" size={16} color={dynamicTheme.colors.textTertiary} />
                    </View>
                    <View style={styles.contactInfo}>
                      <Text style={[styles.contactName, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]} numberOfLines={1}>
                        {contact.name}
                      </Text>
                      <Text style={[styles.contactAddress, theme.typography.caption, { color: dynamicTheme.colors.textTertiary }]} numberOfLines={1}>
                        {contact.username ? `@${contact.username}` : truncateAddress(contact.address)}
                      </Text>
                    </View>
                    <FontAwesome name="chevron-right" size={12} color={dynamicTheme.colors.textTertiary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: dynamicTheme.colors.buttonPrimary }, !canContinue && { backgroundColor: dynamicTheme.colors.textTertiary }]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text style={[styles.continueButtonText, theme.typography.heading, { color: dynamicTheme.colors.buttonPrimaryText }]}>Continue</Text>
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
  stepIndicator: {
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xl,
  },
  networkSection: {
    marginBottom: theme.spacing.lg,
  },
  networkLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.sm,
  },
  networkScroll: {
    flexGrow: 0,
  },
  networkChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  networkChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    marginTop: theme.spacing.md,
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
