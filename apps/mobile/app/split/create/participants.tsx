/**
 * Split Bill Create - Step 4: Participants
 */

import { StyleSheet, View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { setParticipants, setStep } from '@/src/store/slices/split-create-slice';
import type { SplitParticipant } from '@/src/store/slices/split-create-slice';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { loadContactsThunk } from '@/src/store/slices/contacts-slice';
import { validateAddress } from '@/src/services/send-service';
import { lookupUsername, isValidUsernameFormat } from '@/src/services/username-service';
import { calculateEqualSplit } from '@/src/services/split-bill-service';
import { truncateAddress, sanitizeAmountInput, formatAmount } from '@/src/utils/format';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

interface LocalParticipant {
  id: string;
  input: string;
  address: string | null;
  username?: string;
  name?: string;
  amount: string;
  percentage: string;
  isLookingUp: boolean;
  error?: string;
}

export default function SplitParticipantsScreen() {
  const dispatch = useAppDispatch();
  const splitCreate = useAppSelector((state) => state.splitCreate);
  const wallet = useAppSelector((state) => state.wallet);
  const contacts = useAppSelector((state) => state.contacts.contacts);
  const currentAccount = getCurrentAccount(wallet);

  const [participants, setLocalParticipants] = useState<LocalParticipant[]>(() => {
    if (splitCreate.participants.length > 0) {
      return splitCreate.participants.map((p) => ({
        id: p.id,
        input: p.username || p.name || p.address,
        address: p.address,
        username: p.username,
        name: p.name,
        amount: p.amount,
        percentage: p.percentage?.toString() || '',
        isLookingUp: false,
      }));
    }
    return [{ id: '1', input: '', address: null, amount: '', percentage: '', isLookingUp: false }];
  });

  // Load contacts
  useEffect(() => {
    dispatch(loadContactsThunk());
  }, [dispatch]);

  // Recalculate amounts based on mode
  useEffect(() => {
    const validParticipants = participants.filter((p) => p.address);
    if (validParticipants.length === 0) return;

    if (splitCreate.splitMode === 'equal') {
      const perPerson = calculateEqualSplit(splitCreate.totalAmount, validParticipants.length);
      setLocalParticipants((prev) =>
        prev.map((p) => ({
          ...p,
          amount: p.address ? perPerson : '',
          percentage: p.address ? (100 / validParticipants.length).toFixed(1) : '',
        }))
      );
    } else if (splitCreate.splitMode === 'percentage') {
      // Recalculate amounts from percentages
      setLocalParticipants((prev) =>
        prev.map((p) => {
          if (!p.address || !p.percentage) return p;
          const pct = parseFloat(p.percentage) || 0;
          const amt = (parseFloat(splitCreate.totalAmount) * pct / 100).toFixed(6);
          return { ...p, amount: amt };
        })
      );
    }
  }, [splitCreate.splitMode, splitCreate.totalAmount, participants.filter((p) => p.address).length]);

  const isSelf = useCallback((address: string) =>
    currentAccount?.address && address.toLowerCase() === currentAccount.address.toLowerCase(),
    [currentAccount?.address]
  );

  const resolveParticipant = async (index: number, input: string) => {
    const trimmed = input.trim();

    setLocalParticipants((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, input, error: undefined } : p
      )
    );

    if (!trimmed) {
      setLocalParticipants((prev) =>
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
      if (isSelf(contact.address)) {
        setLocalParticipants((prev) =>
          prev.map((p, i) =>
            i === index
              ? { ...p, address: null, isLookingUp: false, error: 'Cannot add yourself' }
              : p
          )
        );
        return;
      }
      setLocalParticipants((prev) =>
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
        setLocalParticipants((prev) =>
          prev.map((p, i) => (i === index ? { ...p, isLookingUp: true } : p))
        );

        try {
          const address = await lookupUsername(username);
          if (address) {
            if (isSelf(address)) {
              setLocalParticipants((prev) =>
                prev.map((p, i) =>
                  i === index
                    ? { ...p, address: null, isLookingUp: false, error: 'Cannot add yourself' }
                    : p
                )
              );
            } else {
              setLocalParticipants((prev) =>
                prev.map((p, i) =>
                  i === index
                    ? { ...p, address, username: trimmed, isLookingUp: false }
                    : p
                )
              );
            }
          } else {
            setLocalParticipants((prev) =>
              prev.map((p, i) =>
                i === index
                  ? { ...p, address: null, isLookingUp: false, error: 'Username not found' }
                  : p
              )
            );
          }
        } catch {
          setLocalParticipants((prev) =>
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
      if (isSelf(trimmed)) {
        setLocalParticipants((prev) =>
          prev.map((p, i) =>
            i === index
              ? { ...p, address: null, isLookingUp: false, error: 'Cannot add yourself' }
              : p
          )
        );
        return;
      }
      setLocalParticipants((prev) =>
        prev.map((p, i) =>
          i === index
            ? { ...p, address: trimmed, username: undefined, name: undefined, isLookingUp: false }
            : p
        )
      );
      return;
    }

    setLocalParticipants((prev) =>
      prev.map((p, i) =>
        i === index ? { ...p, address: null, isLookingUp: false } : p
      )
    );
  };

  const addParticipant = () => {
    setLocalParticipants((prev) => [
      ...prev,
      { id: Date.now().toString(), input: '', address: null, amount: '', percentage: '', isLookingUp: false },
    ]);
  };

  const removeParticipant = (index: number) => {
    if (participants.length <= 1) return;
    setLocalParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAmount = (index: number, newAmount: string) => {
    const currentAmount = participants[index]?.amount || '';
    const sanitized = sanitizeAmountInput(newAmount, currentAmount);
    if (sanitized === null) return;
    setLocalParticipants((prev) =>
      prev.map((p, i) => (i === index ? { ...p, amount: sanitized } : p))
    );
  };

  const updatePercentage = (index: number, newPercentage: string) => {
    // Only allow valid percentage input
    const sanitized = newPercentage.replace(/[^0-9.]/g, '');
    if (parseFloat(sanitized) > 100) return;
    setLocalParticipants((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        const pct = parseFloat(sanitized) || 0;
        const amt = (parseFloat(splitCreate.totalAmount) * pct / 100).toFixed(6);
        return { ...p, percentage: sanitized, amount: amt };
      })
    );
  };

  const handleContinue = () => {
    const validParticipants = participants.filter((p) => p.address);
    if (validParticipants.length === 0) return;

    const splitParticipants: SplitParticipant[] = validParticipants.map((p) => ({
      id: p.id,
      address: p.address!,
      username: p.username,
      name: p.name,
      amount: p.amount,
      percentage: p.percentage ? parseFloat(p.percentage) : undefined,
    }));

    dispatch(setParticipants(splitParticipants));
    dispatch(setStep('delivery'));
    router.push('/split/create/delivery');
  };

  const validParticipants = participants.filter((p) => p.address);
  const isLookingUp = participants.some((p) => p.isLookingUp);

  // Calculate total of custom amounts (only in custom mode)
  const totalCustomAmount = splitCreate.splitMode === 'custom'
    ? participants.reduce(
        (sum, p) => sum + parseFloat(p.amount || '0'),
        0
      )
    : 0;

  const totalBillAmount = parseFloat(splitCreate.totalAmount) || 0;
  const remainingAmount = totalBillAmount - totalCustomAmount;
  const isOverBudget = splitCreate.splitMode === 'custom' && totalCustomAmount > totalBillAmount;

  const canContinue = validParticipants.length > 0 && !isLookingUp && !isOverBudget;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Split Bill" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.stepIndicator, theme.typography.caption, { color: theme.colors.textSecondary }]}>
          Step 4 of 6
        </Text>
        <Text style={[styles.subtitle, theme.typography.heading]}>
          Who's splitting the bill?
        </Text>

        <View style={styles.amountSummary}>
          <Text style={[styles.amountLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
            Total: {formatAmount(splitCreate.totalAmount)} {splitCreate.selectedToken}
          </Text>
          <Text style={[styles.modeLabel, theme.typography.caption, { color: theme.colors.buttonPrimary }]}>
            {splitCreate.splitMode === 'equal' ? 'Equal Split' :
             splitCreate.splitMode === 'percentage' ? 'By Percentage' : 'Custom Amounts'}
          </Text>
        </View>

        {/* Over budget warning */}
        {isOverBudget && (
          <View style={styles.warningBanner}>
            <FontAwesome name="exclamation-triangle" size={16} color={theme.colors.warning} />
            <Text style={[styles.warningText, theme.typography.caption, { color: theme.colors.warning }]}>
              Total exceeds bill by {formatAmount(Math.abs(remainingAmount))} {splitCreate.selectedToken}
            </Text>
          </View>
        )}

        {/* Show remaining in custom mode */}
        {splitCreate.splitMode === 'custom' && !isOverBudget && remainingAmount > 0 && (
          <View style={styles.infoBanner}>
            <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
              Remaining to distribute: {formatAmount(remainingAmount)} {splitCreate.selectedToken}
            </Text>
          </View>
        )}

        <View style={styles.participantsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.label, theme.typography.caption, { color: theme.colors.textSecondary }]}>
              Participants ({validParticipants.length})
            </Text>
            <TouchableOpacity onPress={addParticipant}>
              <FontAwesome name="plus-circle" size={24} color={theme.colors.buttonPrimary} />
            </TouchableOpacity>
          </View>

          {participants.map((participant, index) => (
            <View key={participant.id} style={styles.participantCard}>
              <View style={styles.participantInputRow}>
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
                    <ActivityIndicator size="small" color={theme.colors.buttonPrimary} style={styles.checkIcon} />
                  )}
                  {participant.error && (
                    <FontAwesome name="times-circle" size={16} color={theme.colors.error} style={styles.checkIcon} />
                  )}
                </View>

                {participants.length > 1 && (
                  <TouchableOpacity onPress={() => removeParticipant(index)} style={styles.removeButton}>
                    <FontAwesome name="times-circle" size={20} color={theme.colors.error} />
                  </TouchableOpacity>
                )}
              </View>

              {participant.error && (
                <Text style={[styles.participantError, theme.typography.caption, { color: theme.colors.error }]}>
                  {participant.error}
                </Text>
              )}

              {participant.address && (
                <View style={styles.amountRow}>
                  {splitCreate.splitMode === 'equal' && (
                    <Text style={[styles.equalAmount, theme.typography.body, { color: theme.colors.textSecondary }]}>
                      {formatAmount(participant.amount)} {splitCreate.selectedToken}
                    </Text>
                  )}

                  {splitCreate.splitMode === 'custom' && (
                    <View style={styles.customAmountRow}>
                      <TextInput
                        style={[styles.amountInputSmall, theme.typography.body]}
                        placeholder="0.00"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={participant.amount}
                        onChangeText={(text) => updateAmount(index, text)}
                        keyboardType="decimal-pad"
                      />
                      <Text style={[styles.tokenLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                        {splitCreate.selectedToken}
                      </Text>
                    </View>
                  )}

                  {splitCreate.splitMode === 'percentage' && (
                    <View style={styles.percentageRow}>
                      <TextInput
                        style={[styles.percentageInput, theme.typography.body]}
                        placeholder="0"
                        placeholderTextColor={theme.colors.textTertiary}
                        value={participant.percentage}
                        onChangeText={(text) => updatePercentage(index, text)}
                        keyboardType="decimal-pad"
                      />
                      <Text style={[styles.percentLabel, theme.typography.body]}>%</Text>
                      <Text style={[styles.percentAmount, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                        = {formatAmount(participant.amount)} {splitCreate.selectedToken}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}
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
  amountSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
  },
  amountLabel: {
    // Styled inline
  },
  modeLabel: {
    fontWeight: '600',
  },
  participantsSection: {
    gap: theme.spacing.md,
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
  participantCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  participantInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  participantInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
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
  removeButton: {
    padding: theme.spacing.xs,
  },
  participantError: {
    marginLeft: theme.spacing.sm,
  },
  amountRow: {
    marginTop: theme.spacing.xs,
  },
  equalAmount: {
    textAlign: 'center',
  },
  customAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  amountInputSmall: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  tokenLabel: {
    // Styled inline
  },
  percentageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  percentageInput: {
    width: 60,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  percentLabel: {
    color: theme.colors.textPrimary,
  },
  percentAmount: {
    flex: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning + '15',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.warning + '30',
  },
  warningText: {
    flex: 1,
  },
  infoBanner: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
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
