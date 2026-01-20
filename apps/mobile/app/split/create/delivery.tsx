/**
 * Split Bill Create - Step 5: Delivery Address
 */

import { StyleSheet, View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { setDelivery, setStep, setDescription } from '@/src/store/slices/split-create-slice';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { loadContactsThunk } from '@/src/store/slices/contacts-slice';
import { validateAddress } from '@/src/services/send-service';
import { lookupUsername, isValidUsernameFormat } from '@/src/services/username-service';
import { truncateAddress } from '@/src/utils/format';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

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

export default function SplitDeliveryScreen() {
  const dispatch = useAppDispatch();
  const splitCreate = useAppSelector((state) => state.splitCreate);
  const wallet = useAppSelector((state) => state.wallet);
  const contacts = useAppSelector((state) => state.contacts.contacts);
  const currentAccount = getCurrentAccount(wallet);

  const [useCustomDelivery, setUseCustomDelivery] = useState(splitCreate.useCustomDelivery);
  const [input, setInput] = useState(splitCreate.deliveryAddress || '');
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(
    splitCreate.deliveryAddress || null
  );
  const [resolvedUsername, setResolvedUsername] = useState<string | null>(
    splitCreate.deliveryUsername || null
  );
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setLocalDescription] = useState(splitCreate.description);

  // Load contacts
  useEffect(() => {
    dispatch(loadContactsThunk());
  }, [dispatch]);

  const debouncedLookup = useMemo(
    () =>
      debounce(async (username: string) => {
        setIsLookingUp(true);
        setError(null);
        try {
          const address = await lookupUsername(username);
          if (address) {
            setResolvedAddress(address);
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

  const handleInputChange = useCallback(
    (text: string) => {
      setInput(text);
      setError(null);

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

  const handleContinue = () => {
    if (useCustomDelivery && !resolvedAddress) {
      setError('Please enter a valid address');
      return;
    }

    dispatch(setDelivery({
      address: useCustomDelivery ? resolvedAddress! : currentAccount?.address || '',
      username: useCustomDelivery ? resolvedUsername : null,
      useCustom: useCustomDelivery,
    }));
    dispatch(setDescription(description));
    dispatch(setStep('confirm'));
    router.push('/split/create/confirm');
  };

  const canContinue = !isLookingUp && (!useCustomDelivery || resolvedAddress);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Split Bill" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.stepIndicator, theme.typography.caption, { color: theme.colors.textSecondary }]}>
          Step 5 of 6
        </Text>
        <Text style={[styles.subtitle, theme.typography.heading]}>
          Where should payments go?
        </Text>

        {/* Delivery Options */}
        <View style={styles.optionsSection}>
          <TouchableOpacity
            style={[
              styles.optionCard,
              !useCustomDelivery && styles.optionCardSelected
            ]}
            onPress={() => setUseCustomDelivery(false)}
          >
            <View style={[
              styles.radioOuter,
              !useCustomDelivery && styles.radioOuterSelected
            ]}>
              {!useCustomDelivery && <View style={styles.radioInner} />}
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, theme.typography.body]}>
                My Wallet
              </Text>
              <Text style={[styles.optionAddress, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                {currentAccount ? truncateAddress(currentAccount.address) : ''}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              useCustomDelivery && styles.optionCardSelected
            ]}
            onPress={() => setUseCustomDelivery(true)}
          >
            <View style={[
              styles.radioOuter,
              useCustomDelivery && styles.radioOuterSelected
            ]}>
              {useCustomDelivery && <View style={styles.radioInner} />}
            </View>
            <View style={styles.optionContent}>
              <Text style={[styles.optionTitle, theme.typography.body]}>
                Different Address
              </Text>
              <Text style={[styles.optionDescription, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                Send collected funds to another wallet
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Custom Address Input */}
        {useCustomDelivery && (
          <View style={styles.inputSection}>
            <Text style={[styles.label, theme.typography.caption, { color: theme.colors.textSecondary }]}>
              Delivery Address
            </Text>
            <TextInput
              style={[styles.input, theme.typography.body]}
              placeholder="Enter address or @username"
              placeholderTextColor={theme.colors.textTertiary}
              value={input}
              onChangeText={handleInputChange}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.statusContainer}>
              {isLookingUp && (
                <View style={styles.statusRow}>
                  <ActivityIndicator size="small" color={theme.colors.buttonPrimary} />
                  <Text style={[styles.statusText, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                    Searching...
                  </Text>
                </View>
              )}

              {!isLookingUp && resolvedAddress && (
                <View style={styles.statusRow}>
                  <FontAwesome name="check-circle" size={16} color={theme.colors.success} />
                  <Text style={[styles.statusText, theme.typography.caption, { color: theme.colors.success }]}>
                    {resolvedUsername ? `${resolvedUsername} \u2192 ` : ''}{truncateAddress(resolvedAddress)}
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
        )}

        {/* Description */}
        <View style={styles.descriptionSection}>
          <Text style={[styles.label, theme.typography.caption, { color: theme.colors.textSecondary }]}>
            Description (Optional)
          </Text>
          <TextInput
            style={[styles.input, styles.descriptionInput, theme.typography.body]}
            placeholder="e.g., Dinner at Restaurant"
            placeholderTextColor={theme.colors.textTertiary}
            value={description}
            onChangeText={setLocalDescription}
            multiline
            numberOfLines={2}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
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
  },
  content: {
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  stepIndicator: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  optionsSection: {
    gap: theme.spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.md,
  },
  optionCardSelected: {
    borderWidth: 2,
    borderColor: theme.colors.buttonPrimary,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.textTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: theme.colors.buttonPrimary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.buttonPrimary,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
  },
  optionAddress: {
    marginTop: 2,
  },
  optionDescription: {
    marginTop: 2,
  },
  inputSection: {
    gap: theme.spacing.sm,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
  },
  statusContainer: {
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
  descriptionSection: {
    gap: theme.spacing.sm,
  },
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    padding: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.buttonSecondaryBorder,
  },
  continueButton: {
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: theme.colors.textTertiary,
  },
  continueButtonText: {
    color: theme.colors.buttonPrimaryText,
  },
});
