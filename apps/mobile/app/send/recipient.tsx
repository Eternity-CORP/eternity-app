/**
 * Send Screen 2: Recipient Address Input
 * Supports both direct address and @username lookup
 */

import { StyleSheet, View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { setRecipient, setStep } from '@/src/store/slices/send-slice';
import { validateAddress } from '@/src/services/send-service';
import { lookupUsername, isValidUsernameFormat } from '@/src/services/username-service';
import { truncateAddress } from '@/src/utils/format';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

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
  const [input, setInput] = useState(send.recipient);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolvedUsername, setResolvedUsername] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if input is a username (starts with @)
  const isUsernameInput = input.trim().startsWith('@');

  // Debounced username lookup
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

  const handleContinue = () => {
    if (!resolvedAddress) {
      setError('Please enter a valid address or @username');
      return;
    }

    setError(null);
    dispatch(setRecipient(resolvedAddress));
    dispatch(setStep('amount'));
    router.push('/send/amount');
  };

  const canContinue = resolvedAddress && !isLookingUp;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader
        title="Send"
        rightElement={
          <TouchableOpacity>
            <FontAwesome name="qrcode" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      <View style={styles.container}>
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
