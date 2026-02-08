/**
 * Username Registration Screen
 * Allows users to claim, update, or delete their @username
 */

import { StyleSheet, View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppSelector } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { getWalletFromMnemonic } from '@/src/services/wallet-service';
import {
  getUsernameByAddress,
  checkUsernameAvailable,
  registerUsername,
  updateUsername,
  deleteUsername,
  isValidUsernameFormat,
} from '@/src/services/username-service';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import { debounce } from '@e-y/shared';

export default function UsernameScreen() {
  const { theme: dynamicTheme } = useTheme();
  const wallet = useAppSelector((state) => state.wallet);
  const currentAccount = getCurrentAccount(wallet);

  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formatError, setFormatError] = useState<string | null>(null);

  // Load current username on mount
  useEffect(() => {
    async function loadCurrentUsername() {
      if (!currentAccount?.address) {
        setIsLoading(false);
        return;
      }

      try {
        const username = await getUsernameByAddress(currentAccount.address);
        setCurrentUsername(username);
        if (username) {
          setInput(username);
        }
      } catch (err) {
        console.error('Error loading username:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadCurrentUsername();
  }, [currentAccount?.address]);

  // Debounced availability check
  const debouncedCheckAvailability = useMemo(
    () =>
      debounce(async (username: string) => {
        setIsChecking(true);
        setError(null);
        try {
          const available = await checkUsernameAvailable(username);
          setIsAvailable(available);
          if (!available) {
            setError('Username is already taken');
          }
        } catch (err) {
          setIsAvailable(true);
          setError('Could not verify availability. You can still try.');
        } finally {
          setIsChecking(false);
        }
      }, 400),
    []
  );

  // Handle input changes
  const handleInputChange = useCallback(
    (text: string) => {
      // Remove @ prefix if user types it, normalize to lowercase
      const normalized = text.startsWith('@') ? text.slice(1).toLowerCase() : text.toLowerCase();
      setInput(normalized);
      setError(null);
      setFormatError(null);
      setIsAvailable(null);

      if (normalized.length === 0) {
        return;
      }

      // Check format validity
      if (normalized.length >= 3 && !isValidUsernameFormat(normalized)) {
        setFormatError('3-20 chars, letters/numbers/underscore, must start with letter');
        return;
      }

      // If same as current username, skip availability check
      if (currentUsername && normalized === currentUsername) {
        setIsAvailable(true);
        return;
      }

      // Check availability if format is valid and length is sufficient
      if (normalized.length >= 3 && isValidUsernameFormat(normalized)) {
        debouncedCheckAvailability(normalized);
      }
    },
    [currentUsername, debouncedCheckAvailability]
  );

  // Handle claim/update
  const handleSubmit = async () => {
    if (!currentAccount || !wallet.mnemonic) {
      Alert.alert('Error', 'No wallet available');
      return;
    }

    if (!input || input.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!isValidUsernameFormat(input)) {
      setFormatError('Invalid username format');
      return;
    }

    // Skip if submitting same username
    if (currentUsername && input === currentUsername) {
      router.back();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const walletInstance = getWalletFromMnemonic(wallet.mnemonic, currentAccount.accountIndex);

      if (currentUsername) {
        // Update existing username
        await updateUsername(input, walletInstance);
      } else {
        // Register new username
        await registerUsername(input, walletInstance);
      }

      setCurrentUsername(input);
      Alert.alert('Success', `Your username is now @${input}`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to register username';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!currentAccount || !wallet.mnemonic || !currentUsername) {
      return;
    }

    Alert.alert(
      'Delete Username',
      `Are you sure you want to delete @${currentUsername}? Someone else will be able to claim it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            setError(null);

            try {
              const walletInstance = getWalletFromMnemonic(wallet.mnemonic!, currentAccount.accountIndex);
              await deleteUsername(currentUsername, walletInstance);
              setCurrentUsername(null);
              setInput('');
              Alert.alert('Deleted', 'Your username has been deleted');
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to delete username';
              setError(message);
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const isNewUsername = !currentUsername || input !== currentUsername;
  const canSubmit =
    input.length >= 3 &&
    isValidUsernameFormat(input) &&
    !isChecking &&
    !isSubmitting &&
    (isAvailable === true || (currentUsername && input === currentUsername));

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
        <ScreenHeader title="Username" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={dynamicTheme.colors.buttonPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Username" />

      <View style={styles.container}>
        <View style={styles.content}>
          {/* Info */}
          <View style={[styles.infoBox, { backgroundColor: dynamicTheme.colors.surface }]}>
            <FontAwesome name="info-circle" size={20} color={dynamicTheme.colors.buttonPrimary} />
            <Text style={[styles.infoText, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
              Your @username allows others to send tokens to you easily without knowing your wallet address.
            </Text>
          </View>

          {/* Current username display */}
          {currentUsername && (
            <View style={[styles.currentUsernameBox, { backgroundColor: dynamicTheme.colors.surface }]}>
              <Text style={[styles.currentLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                Current Username
              </Text>
              <Text style={[styles.currentValue, theme.typography.title, { color: dynamicTheme.colors.success }]}>
                @{currentUsername}
              </Text>
            </View>
          )}

          {/* Input */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
              {currentUsername ? 'New Username' : 'Choose Username'}
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: dynamicTheme.colors.surface }]}>
              <Text style={[styles.inputPrefix, theme.typography.body, { color: dynamicTheme.colors.textTertiary }]}>@</Text>
              <TextInput
                style={[styles.input, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}
                placeholder="username"
                placeholderTextColor={dynamicTheme.colors.textTertiary}
                value={input}
                onChangeText={handleInputChange}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                editable={!isSubmitting}
              />
              {isChecking && (
                <ActivityIndicator size="small" color={dynamicTheme.colors.buttonPrimary} style={styles.inputIcon} />
              )}
              {!isChecking && isAvailable === true && isNewUsername && (
                <FontAwesome name="check-circle" size={20} color={dynamicTheme.colors.success} style={styles.inputIcon} />
              )}
              {!isChecking && isAvailable === false && (
                <FontAwesome name="times-circle" size={20} color={dynamicTheme.colors.error} style={styles.inputIcon} />
              )}
            </View>

            {/* Format hint */}
            <Text style={[styles.hint, theme.typography.caption, { color: dynamicTheme.colors.textTertiary }]}>
              3-20 characters, letters, numbers, and underscores only
            </Text>

            {/* Errors */}
            {formatError && (
              <Text style={[styles.errorText, theme.typography.caption, { color: dynamicTheme.colors.error }]}>
                {formatError}
              </Text>
            )}
            {error && (
              <Text style={[styles.errorText, theme.typography.caption, { color: dynamicTheme.colors.error }]}>
                {error}
              </Text>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {currentUsername && (
            <TouchableOpacity
              style={[styles.deleteButton, { borderColor: dynamicTheme.colors.error }, isSubmitting && styles.buttonDisabled]}
              onPress={handleDelete}
              disabled={isSubmitting}
            >
              <FontAwesome name="trash" size={16} color={dynamicTheme.colors.error} />
              <Text style={[styles.deleteButtonText, theme.typography.body, { color: dynamicTheme.colors.error }]}>
                Delete Username
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: dynamicTheme.colors.buttonPrimary }, !canSubmit && { backgroundColor: dynamicTheme.colors.textTertiary }]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={dynamicTheme.colors.buttonPrimaryText} />
            ) : (
              <Text style={[styles.submitButtonText, theme.typography.heading, { color: dynamicTheme.colors.buttonPrimaryText }]}>
                {currentUsername ? 'Update Username' : 'Claim Username'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  infoText: {
    flex: 1,
    lineHeight: 20,
  },
  currentUsernameBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  currentLabel: {
    marginBottom: theme.spacing.xs,
  },
  currentValue: {
    color: theme.colors.textPrimary,
  },
  inputContainer: {
    marginBottom: theme.spacing.xl,
  },
  inputLabel: {
    marginBottom: theme.spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
  },
  inputPrefix: {
    marginRight: theme.spacing.xs,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
    color: theme.colors.textPrimary,
    fontSize: 18,
  },
  inputIcon: {
    marginLeft: theme.spacing.sm,
  },
  hint: {
    marginTop: theme.spacing.sm,
  },
  errorText: {
    marginTop: theme.spacing.sm,
  },
  actions: {
    gap: theme.spacing.md,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.error,
    gap: theme.spacing.sm,
  },
  deleteButtonText: {
    color: theme.colors.error,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  submitButton: {
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  submitButtonText: {
    color: theme.colors.buttonPrimaryText,
  },
});
