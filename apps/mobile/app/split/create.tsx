/**
 * Create Split Bill Screen
 */

import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { createSplitBillThunk } from '@/src/store/slices/split-slice';
import { loadContactsThunk } from '@/src/store/slices/contacts-slice';
import { validateAddress } from '@/src/services/send-service';
import { lookupUsername, isValidUsernameFormat } from '@/src/services/username-service';
import { calculateEqualSplit, validateSplitAmounts } from '@/src/services/split-bill-service';
import { truncateAddress } from '@/src/utils/format';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

interface Participant {
  id: string;
  input: string;
  address: string | null;
  username?: string;
  name?: string;
  amount: string;
  isLookingUp: boolean;
  error?: string;
}

export default function CreateSplitScreen() {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const balance = useAppSelector((state) => state.balance);
  const contacts = useAppSelector((state) => state.contacts.contacts);
  const split = useAppSelector((state) => state.split);
  const currentAccount = getCurrentAccount(wallet);

  // Form state
  const [totalAmount, setTotalAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('ETH');
  const [description, setDescription] = useState('');
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', input: '', address: null, amount: '', isLookingUp: false },
  ]);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [useCustomRecipient, setUseCustomRecipient] = useState(false);

  // Load contacts
  useEffect(() => {
    dispatch(loadContactsThunk());
  }, [dispatch]);

  // Recalculate equal split when total or participants change
  useEffect(() => {
    if (splitMode === 'equal' && totalAmount) {
      const validParticipants = participants.filter((p) => p.address);
      if (validParticipants.length > 0) {
        const perPerson = calculateEqualSplit(totalAmount, validParticipants.length);
        setParticipants((prev) =>
          prev.map((p) => ({
            ...p,
            amount: p.address ? perPerson : '',
          }))
        );
      }
    }
  }, [totalAmount, splitMode, participants.filter((p) => p.address).length]);

  const resolveParticipant = async (index: number, input: string) => {
    const trimmed = input.trim();

    setParticipants((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, input, error: undefined } : p
      )
    );

    if (!trimmed) {
      setParticipants((prev) =>
        prev.map((p, i) =>
          i === index
            ? { ...p, address: null, username: undefined, name: undefined, isLookingUp: false }
            : p
        )
      );
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
      setParticipants((prev) =>
        prev.map((p, i) =>
          i === index
            ? {
                ...p,
                address: contact.address,
                username: contact.username,
                name: contact.name,
                isLookingUp: false,
              }
            : p
        )
      );
      return;
    }

    // Check username
    if (trimmed.startsWith('@') && trimmed.length > 1) {
      const username = trimmed.slice(1).toLowerCase();
      if (isValidUsernameFormat(username)) {
        setParticipants((prev) =>
          prev.map((p, i) => (i === index ? { ...p, isLookingUp: true } : p))
        );

        try {
          const address = await lookupUsername(username);
          if (address) {
            setParticipants((prev) =>
              prev.map((p, i) =>
                i === index
                  ? { ...p, address, username: trimmed, isLookingUp: false }
                  : p
              )
            );
          } else {
            setParticipants((prev) =>
              prev.map((p, i) =>
                i === index
                  ? { ...p, address: null, isLookingUp: false, error: 'Username not found' }
                  : p
              )
            );
          }
        } catch {
          setParticipants((prev) =>
            prev.map((p, i) =>
              i === index
                ? { ...p, address: null, isLookingUp: false, error: 'Lookup failed' }
                : p
            )
          );
        }
      }
      return;
    }

    // Check address
    if (validateAddress(trimmed)) {
      setParticipants((prev) =>
        prev.map((p, i) =>
          i === index
            ? { ...p, address: trimmed, username: undefined, name: undefined, isLookingUp: false }
            : p
        )
      );
      return;
    }

    setParticipants((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, address: null, isLookingUp: false } : p
      )
    );
  };

  const addParticipant = () => {
    setParticipants((prev) => [
      ...prev,
      { id: Date.now().toString(), input: '', address: null, amount: '', isLookingUp: false },
    ]);
  };

  const removeParticipant = (index: number) => {
    if (participants.length <= 1) return;
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAmount = (index: number, amount: string) => {
    setParticipants((prev) =>
      prev.map((p, i) => (i === index ? { ...p, amount } : p))
    );
  };

  const handleCreate = async () => {
    if (!currentAccount?.address) {
      Alert.alert('Error', 'No wallet connected');
      return;
    }

    const validParticipants = participants.filter((p) => p.address);
    if (validParticipants.length === 0) {
      Alert.alert('Error', 'Add at least one participant');
      return;
    }

    const totalNum = parseFloat(totalAmount);
    if (isNaN(totalNum) || totalNum <= 0) {
      Alert.alert('Error', 'Please enter a valid total amount');
      return;
    }

    const amounts = validParticipants.map((p) => p.amount);
    if (!validateSplitAmounts(totalAmount, amounts)) {
      Alert.alert('Error', 'Split amounts must equal the total');
      return;
    }

    try {
      await dispatch(
        createSplitBillThunk({
          creatorAddress: currentAccount.address,
          totalAmount,
          tokenSymbol: selectedToken,
          description: description || undefined,
          participants: validParticipants.map((p) => ({
            address: p.address!,
            username: p.username,
            name: p.name,
            amount: p.amount,
          })),
        })
      ).unwrap();

      Alert.alert('Success', 'Split bill created! Participants will be notified.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create split bill';
      Alert.alert('Error', message);
    }
  };

  const validParticipants = participants.filter((p) => p.address);
  const isLookingUp = participants.some((p) => p.isLookingUp);
  const canCreate =
    validParticipants.length > 0 &&
    parseFloat(totalAmount) > 0 &&
    !isLookingUp &&
    split.status !== 'loading';

  const availableTokens = balance.balances.map((b) => b.symbol);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Split Bill" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Total Amount */}
        <View style={styles.section}>
          <Text style={[styles.label, theme.typography.caption, { color: theme.colors.textSecondary }]}>
            Total Amount
          </Text>
          <View style={styles.amountRow}>
            <TextInput
              style={[styles.amountInput, theme.typography.body]}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textTertiary}
              value={totalAmount}
              onChangeText={setTotalAmount}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity
              style={styles.tokenSelector}
              onPress={() => {
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

        {/* Split Mode */}
        <View style={styles.section}>
          <Text style={[styles.label, theme.typography.caption, { color: theme.colors.textSecondary }]}>
            Split Mode
          </Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeButton, splitMode === 'equal' && styles.modeButtonActive]}
              onPress={() => setSplitMode('equal')}
            >
              <Text
                style={[
                  styles.modeText,
                  theme.typography.body,
                  { color: splitMode === 'equal' ? theme.colors.buttonPrimaryText : theme.colors.textPrimary },
                ]}
              >
                Equal Split
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, splitMode === 'custom' && styles.modeButtonActive]}
              onPress={() => setSplitMode('custom')}
            >
              <Text
                style={[
                  styles.modeText,
                  theme.typography.body,
                  { color: splitMode === 'custom' ? theme.colors.buttonPrimaryText : theme.colors.textPrimary },
                ]}
              >
                Custom Amounts
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Participants */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.label, theme.typography.caption, { color: theme.colors.textSecondary }]}>
              Participants ({validParticipants.length})
            </Text>
            <TouchableOpacity onPress={addParticipant}>
              <FontAwesome name="plus-circle" size={24} color={theme.colors.buttonPrimary} />
            </TouchableOpacity>
          </View>

          {participants.map((participant, index) => (
            <View key={participant.id} style={styles.participantRow}>
              <View style={styles.participantInputContainer}>
                <TextInput
                  style={[styles.participantInput, theme.typography.body]}
                  placeholder="Address, @username, or name"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={participant.input}
                  onChangeText={(text) => resolveParticipant(index, text)}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {participant.address && (
                  <FontAwesome name="check-circle" size={16} color={theme.colors.success} style={styles.checkIcon} />
                )}
                {participant.isLookingUp && (
                  <Text style={[styles.lookupText, theme.typography.caption, { color: theme.colors.textTertiary }]}>
                    ...
                  </Text>
                )}
              </View>

              {splitMode === 'custom' && (
                <TextInput
                  style={[styles.amountInputSmall, theme.typography.body]}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textTertiary}
                  value={participant.amount}
                  onChangeText={(text) => updateAmount(index, text)}
                  keyboardType="decimal-pad"
                />
              )}

              {splitMode === 'equal' && participant.amount && (
                <Text style={[styles.equalAmount, theme.typography.body]}>
                  {participant.amount}
                </Text>
              )}

              {participants.length > 1 && (
                <TouchableOpacity onPress={() => removeParticipant(index)} style={styles.removeButton}>
                  <FontAwesome name="times-circle" size={20} color={theme.colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Custom Recipient */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setUseCustomRecipient(!useCustomRecipient)}
          >
            <View style={[styles.checkbox, useCustomRecipient && styles.checkboxChecked]}>
              {useCustomRecipient && (
                <FontAwesome name="check" size={12} color={theme.colors.buttonPrimaryText} />
              )}
            </View>
            <Text style={[styles.checkboxLabel, theme.typography.body]}>
              Send to a different address
            </Text>
          </TouchableOpacity>

          {useCustomRecipient && (
            <TextInput
              style={[styles.input, theme.typography.body, { marginTop: theme.spacing.sm }]}
              placeholder="Recipient address"
              placeholderTextColor={theme.colors.textTertiary}
              value={recipientAddress}
              onChangeText={setRecipientAddress}
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.label, theme.typography.caption, { color: theme.colors.textSecondary }]}>
            Description (Optional)
          </Text>
          <TextInput
            style={[styles.input, styles.descriptionInput, theme.typography.body]}
            placeholder="e.g., Dinner at Restaurant"
            placeholderTextColor={theme.colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
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
            {split.status === 'loading' ? 'Creating...' : 'Create Split Bill'}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    minHeight: 60,
    textAlignVertical: 'top',
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
    fontSize: 18,
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
  // Mode
  modeRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  modeButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: theme.colors.buttonPrimary,
  },
  modeText: {
    fontWeight: '600',
  },
  // Participants
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  participantInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
  },
  participantInput: {
    flex: 1,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
  },
  checkIcon: {
    marginRight: theme.spacing.md,
  },
  lookupText: {
    marginRight: theme.spacing.md,
  },
  amountInputSmall: {
    width: 80,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  equalAmount: {
    width: 80,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  removeButton: {
    padding: theme.spacing.xs,
  },
  // Checkbox
  checkboxRow: {
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
  checkboxLabel: {
    color: theme.colors.textPrimary,
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
