/**
 * Scheduled Payment Create - Step 5: Confirm & Create
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { createScheduledPaymentThunk } from '@/src/store/slices/scheduled-slice';
import { resetScheduledCreate } from '@/src/store/slices/scheduled-create-slice';
import { truncateAddress } from '@/src/utils/format';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function ScheduledConfirmScreen() {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const balance = useAppSelector((state) => state.balance);
  const scheduled = useAppSelector((state) => state.scheduled);
  const scheduledCreate = useAppSelector((state) => state.scheduledCreate);
  const currentAccount = getCurrentAccount(wallet);

  const selectedToken = balance.balances.find(
    (t) => t.symbol === scheduledCreate.selectedToken
  );
  const scheduledDate = new Date(scheduledCreate.scheduledDate);

  const handleConfirm = async () => {
    if (!currentAccount?.address) {
      Alert.alert('Error', 'No wallet connected');
      return;
    }

    try {
      await dispatch(
        createScheduledPaymentThunk({
          creatorAddress: currentAccount.address,
          recipient: scheduledCreate.recipient,
          recipientUsername: scheduledCreate.recipientUsername || undefined,
          recipientName: scheduledCreate.recipientName || undefined,
          amount: scheduledCreate.amount,
          tokenSymbol: scheduledCreate.selectedToken,
          scheduledAt: scheduledCreate.scheduledDate,
          recurringInterval: scheduledCreate.isRecurring
            ? scheduledCreate.recurringInterval
            : undefined,
          description: scheduledCreate.description || undefined,
        })
      ).unwrap();

      dispatch(resetScheduledCreate());

      Alert.alert('Success', 'Scheduled payment created', [
        {
          text: 'OK',
          onPress: () => router.replace('/scheduled'),
        },
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create scheduled payment';
      Alert.alert('Error', message);
    }
  };

  const isCreating = scheduled.status === 'loading';

  // Calculate USD value
  const amountValue = parseFloat(scheduledCreate.amount) || 0;
  const usdValue = selectedToken
    ? (amountValue * (selectedToken.usdValue || 0)) / parseFloat(selectedToken.balance)
    : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Confirm" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.stepIndicator, theme.typography.caption, { color: theme.colors.textSecondary }]}>
          Step 5 of 5
        </Text>
        <Text style={[styles.subtitle, theme.typography.heading]}>
          Review your scheduled payment
        </Text>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.avatar}>
              <FontAwesome name="user" size={24} color={theme.colors.buttonPrimaryText} />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={[styles.summaryLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                From
              </Text>
              <Text style={[styles.summaryValue, theme.typography.body]}>
                {currentAccount ? truncateAddress(currentAccount.address) : ''}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.success }]}>
              <FontAwesome name="user" size={24} color={theme.colors.buttonPrimaryText} />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={[styles.summaryLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                To
              </Text>
              {scheduledCreate.recipientName || scheduledCreate.recipientUsername ? (
                <>
                  <Text style={[styles.summaryValue, theme.typography.body]}>
                    {scheduledCreate.recipientName || scheduledCreate.recipientUsername}
                  </Text>
                  <Text style={[styles.summarySubValue, theme.typography.caption, { color: theme.colors.textTertiary }]}>
                    {truncateAddress(scheduledCreate.recipient)}
                  </Text>
                </>
              ) : (
                <Text style={[styles.summaryValue, theme.typography.body]}>
                  {truncateAddress(scheduledCreate.recipient)}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
              Amount
            </Text>
            <View style={styles.detailValueColumn}>
              <Text style={[styles.detailValue, theme.typography.body]}>
                {scheduledCreate.amount} {scheduledCreate.selectedToken}
              </Text>
              {usdValue > 0 && (
                <Text style={[styles.detailSubValue, theme.typography.caption, { color: theme.colors.textTertiary }]}>
                  ${usdValue.toFixed(2)} USD
                </Text>
              )}
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
              Scheduled For
            </Text>
            <View style={styles.detailValueColumn}>
              <Text style={[styles.detailValue, theme.typography.body]}>
                {scheduledDate.toLocaleDateString()}
              </Text>
              <Text style={[styles.detailSubValue, theme.typography.caption, { color: theme.colors.textTertiary }]}>
                {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>

          {scheduledCreate.isRecurring && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                Recurring
              </Text>
              <Text style={[styles.detailValue, theme.typography.body]}>
                {scheduledCreate.recurringInterval.charAt(0).toUpperCase() +
                  scheduledCreate.recurringInterval.slice(1)}
              </Text>
            </View>
          )}

          {scheduledCreate.description && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                Description
              </Text>
              <Text style={[styles.detailValue, theme.typography.body, styles.descriptionText]}>
                {scheduledCreate.description}
              </Text>
            </View>
          )}
        </View>

        {/* Info Note */}
        <View style={styles.infoCard}>
          <FontAwesome name="info-circle" size={16} color={theme.colors.buttonPrimary} />
          <Text style={[styles.infoText, theme.typography.caption, { color: theme.colors.textSecondary }]}>
            You will receive a notification when the payment is due. Make sure you have
            sufficient funds at the scheduled time.
          </Text>
        </View>
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, isCreating && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={isCreating}
        >
          <Text style={[styles.confirmButtonText, theme.typography.heading]}>
            {isCreating ? 'Creating...' : 'Schedule Payment'}
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
  stepIndicator: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.buttonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    marginBottom: theme.spacing.xs / 2,
  },
  summaryValue: {
    color: theme.colors.textPrimary,
  },
  summarySubValue: {
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.buttonSecondaryBorder,
    marginVertical: theme.spacing.sm,
  },
  detailsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailLabel: {
    flex: 1,
  },
  detailValueColumn: {
    alignItems: 'flex-end',
  },
  detailValue: {
    color: theme.colors.textPrimary,
    textAlign: 'right',
  },
  detailSubValue: {
    marginTop: 2,
  },
  descriptionText: {
    flex: 2,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.buttonPrimary + '10',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  infoText: {
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    padding: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.buttonSecondaryBorder,
  },
  confirmButton: {
    backgroundColor: theme.colors.buttonPrimary,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: theme.colors.textTertiary,
  },
  confirmButtonText: {
    color: theme.colors.buttonPrimaryText,
  },
});
