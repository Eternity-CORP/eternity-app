/**
 * Create Scheduled Payment Screen
 */

import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { createScheduledPaymentThunk } from '@/src/store/slices/scheduled-slice';
import { loadContactsThunk } from '@/src/store/slices/contacts-slice';
import { validateAddress } from '@/src/services/send-service';
import { lookupUsername, isValidUsernameFormat } from '@/src/services/username-service';
import { truncateAddress, sanitizeAmountInput } from '@/src/utils/format';
import { requestNotificationPermissions } from '@/src/services/scheduled-payment-service';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import type { RecurringInterval } from '@/src/services/scheduled-payment-service';

export default function CreateScheduledScreen() {
  const params = useLocalSearchParams<{
    recipient?: string;
    amount?: string;
    token?: string;
  }>();

  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const balance = useAppSelector((state) => state.balance);
  const contacts = useAppSelector((state) => state.contacts.contacts);
  const scheduled = useAppSelector((state) => state.scheduled);
  const currentAccount = getCurrentAccount(wallet);

  // Form state
  const [recipient, setRecipient] = useState(params.recipient || '');
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [resolvedUsername, setResolvedUsername] = useState<string | null>(null);
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [amount, setAmount] = useState(params.amount || '');
  const [selectedToken, setSelectedToken] = useState(params.token || 'ETH');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date(Date.now() + 60 * 60 * 1000)); // 1 hour from now
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<RecurringInterval>('monthly');
  const [error, setError] = useState<string | null>(null);

  // Load contacts
  useEffect(() => {
    dispatch(loadContactsThunk());
    requestNotificationPermissions();
  }, [dispatch]);

  // Resolve recipient address
  useEffect(() => {
    const resolveRecipient = async () => {
      const trimmed = recipient.trim();

      if (!trimmed) {
        setResolvedAddress(null);
        setResolvedUsername(null);
        setResolvedName(null);
        return;
      }

      // Check contacts first
      const contact = contacts.find(
        (c) =>
          c.address.toLowerCase() === trimmed.toLowerCase() ||
          (c.username && `@${c.username}`.toLowerCase() === trimmed.toLowerCase()) ||
          c.name.toLowerCase() === trimmed.toLowerCase()
      );

      if (contact) {
        setResolvedAddress(contact.address);
        setResolvedUsername(contact.username ? `@${contact.username}` : null);
        setResolvedName(contact.name);
        return;
      }

      // Check if it's a username
      if (trimmed.startsWith('@') && trimmed.length > 1) {
        const username = trimmed.slice(1).toLowerCase();
        if (isValidUsernameFormat(username)) {
          setIsLookingUp(true);
          try {
            const address = await lookupUsername(username);
            if (address) {
              setResolvedAddress(address);
              setResolvedUsername(trimmed);
              setResolvedName(null);
            } else {
              setResolvedAddress(null);
              setResolvedUsername(null);
              setError('Username not found');
            }
          } catch {
            setResolvedAddress(null);
            setError('Failed to lookup username');
          } finally {
            setIsLookingUp(false);
          }
        }
        return;
      }

      // Check if it's a valid address
      if (validateAddress(trimmed)) {
        setResolvedAddress(trimmed);
        setResolvedUsername(null);
        setResolvedName(null);
        return;
      }

      setResolvedAddress(null);
    };

    const timeout = setTimeout(resolveRecipient, 300);
    return () => clearTimeout(timeout);
  }, [recipient, contacts]);

  // Check if recipient is the same as current wallet
  const isSelfSend = resolvedAddress && currentAccount?.address
    ? resolvedAddress.toLowerCase() === currentAccount.address.toLowerCase()
    : false;

  const handleCreate = async () => {
    if (!currentAccount?.address) {
      Alert.alert('Error', 'No wallet connected');
      return;
    }

    if (!resolvedAddress) {
      Alert.alert('Error', 'Please enter a valid recipient address');
      return;
    }

    if (isSelfSend) {
      Alert.alert('Error', 'Cannot send to yourself');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (scheduledDate.getTime() <= Date.now()) {
      Alert.alert('Error', 'Scheduled time must be in the future');
      return;
    }

    try {
      await dispatch(
        createScheduledPaymentThunk({
          creatorAddress: currentAccount.address,
          recipient: resolvedAddress,
          recipientUsername: resolvedUsername || undefined,
          recipientName: resolvedName || undefined,
          amount: amount,
          tokenSymbol: selectedToken,
          scheduledAt: scheduledDate.toISOString(),
          recurringInterval: isRecurring ? recurringInterval : undefined,
          description: description || undefined,
        })
      ).unwrap();

      Alert.alert('Success', 'Scheduled payment created', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create scheduled payment';
      Alert.alert('Error', message);
    }
  };

  const canCreate =
    resolvedAddress &&
    !isSelfSend &&
    parseFloat(amount) > 0 &&
    scheduledDate.getTime() > Date.now() &&
    !isLookingUp &&
    scheduled.status !== 'loading';

  const availableTokens = balance.balances.map((b) => b.symbol);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Schedule Payment" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Recipient */}
        <View style={styles.section}>
          <Text style={[styles.label, theme.typography.caption, { color: theme.colors.textSecondary }]}>
            Recipient
          </Text>
          <TextInput
            style={[styles.input, theme.typography.body]}
            placeholder="Address, @username, or contact name"
            placeholderTextColor={theme.colors.textTertiary}
            value={recipient}
            onChangeText={(text) => {
              setRecipient(text);
              setError(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {resolvedAddress && (
            <View style={styles.resolvedRow}>
              <FontAwesome name="check-circle" size={14} color={theme.colors.success} />
              <Text style={[styles.resolvedText, theme.typography.caption, { color: theme.colors.success }]}>
                {resolvedUsername || resolvedName || truncateAddress(resolvedAddress)}
              </Text>
            </View>
          )}
          {error && (
            <Text style={[styles.errorText, theme.typography.caption, { color: theme.colors.error }]}>
              {error}
            </Text>
          )}
          {isSelfSend && (
            <Text style={[styles.errorText, theme.typography.caption, { color: theme.colors.error }]}>
              Cannot send to yourself
            </Text>
          )}
        </View>

        {/* Amount & Token */}
        <View style={styles.section}>
          <Text style={[styles.label, theme.typography.caption, { color: theme.colors.textSecondary }]}>
            Amount
          </Text>
          <View style={styles.amountRow}>
            <TextInput
              style={[styles.amountInput, theme.typography.body]}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textTertiary}
              value={amount}
              onChangeText={(text) => {
                const sanitized = sanitizeAmountInput(text, amount);
                if (sanitized !== null) setAmount(sanitized);
              }}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={styles.tokenSelector}
              onPress={() => {
                // Simple token cycling for now
                const currentIndex = availableTokens.indexOf(selectedToken);
                const nextIndex = (currentIndex + 1) % availableTokens.length;
                setSelectedToken(availableTokens[nextIndex]);
              }}
            >
              <Text style={[styles.tokenText, theme.typography.body]}>{selectedToken}</Text>
              <FontAwesome name="chevron-down" size={12} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <Text style={[styles.label, theme.typography.caption, { color: theme.colors.textSecondary }]}>
            Schedule For
          </Text>
          <View style={styles.dateTimeRow}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <FontAwesome name="calendar" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.dateText, theme.typography.body]}>
                {scheduledDate.toLocaleDateString()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <FontAwesome name="clock-o" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.timeText, theme.typography.body]}>
                {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={scheduledDate}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (event.type === 'set' && date) {
                const newDate = new Date(scheduledDate);
                newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                setScheduledDate(newDate);
              }
            }}
          />
        )}

        {/* Time Picker Modal */}
        {showTimePicker && (
          <DateTimePicker
            value={scheduledDate}
            mode="time"
            display="default"
            onChange={(event, date) => {
              setShowTimePicker(false);
              if (event.type === 'set' && date) {
                const newDate = new Date(scheduledDate);
                newDate.setHours(date.getHours(), date.getMinutes());
                setScheduledDate(newDate);
              }
            }}
          />
        )}

        {/* Recurring */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.recurringToggle}
            onPress={() => setIsRecurring(!isRecurring)}
          >
            <View style={[styles.checkbox, isRecurring && styles.checkboxChecked]}>
              {isRecurring && (
                <FontAwesome name="check" size={12} color={theme.colors.buttonPrimaryText} />
              )}
            </View>
            <Text style={[styles.recurringLabel, theme.typography.body]}>
              Make this a recurring payment
            </Text>
          </TouchableOpacity>

          {isRecurring && (
            <View style={styles.recurringOptions}>
              {(['daily', 'weekly', 'monthly'] as RecurringInterval[]).map((interval) => (
                <TouchableOpacity
                  key={interval}
                  style={[
                    styles.recurringOption,
                    recurringInterval === interval && styles.recurringOptionActive,
                  ]}
                  onPress={() => setRecurringInterval(interval)}
                >
                  <Text
                    style={[
                      styles.recurringOptionText,
                      theme.typography.caption,
                      {
                        color:
                          recurringInterval === interval
                            ? theme.colors.buttonPrimaryText
                            : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {interval.charAt(0).toUpperCase() + interval.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.label, theme.typography.caption, { color: theme.colors.textSecondary }]}>
            Description (Optional)
          </Text>
          <TextInput
            style={[styles.input, styles.descriptionInput, theme.typography.body]}
            placeholder="Add a note"
            placeholderTextColor={theme.colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
          />
        </View>
      </ScrollView>

      {/* Create Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createButton, !canCreate && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={!canCreate}
        >
          <Text style={[styles.createButtonText, theme.typography.heading]}>
            {scheduled.status === 'loading' ? 'Creating...' : 'Schedule Payment'}
          </Text>
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
  section: {
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
  descriptionInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  resolvedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  resolvedText: {
    flex: 1,
  },
  errorText: {
    marginTop: theme.spacing.xs,
  },
  // Amount
  amountRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  amountInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
  },
  tokenSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  tokenText: {
    color: theme.colors.textPrimary,
  },
  // Date/Time
  dateTimeRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  dateText: {
    color: theme.colors.textPrimary,
  },
  timeText: {
    color: theme.colors.textPrimary,
  },
  // Recurring
  recurringToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 2,
    borderColor: theme.colors.textTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.buttonPrimary,
    borderColor: theme.colors.buttonPrimary,
  },
  recurringLabel: {
    color: theme.colors.textPrimary,
  },
  recurringOptions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  recurringOption: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  recurringOptionActive: {
    backgroundColor: theme.colors.buttonPrimary,
  },
  recurringOptionText: {
    fontWeight: '600',
  },
  // Footer
  footer: {
    padding: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.buttonSecondaryBorder,
  },
  createButton: {
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: theme.colors.textTertiary,
  },
  createButtonText: {
    color: theme.colors.buttonPrimaryText,
  },
});
