/**
 * Split Bill Create - Step 6: Confirm & Create
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount, selectIsTestAccount } from '@/src/store/slices/wallet-slice';
import { TestModeWarning } from '@/src/components/TestModeWarning';
import { createSplitBillThunk } from '@/src/store/slices/split-slice';
import { resetSplitCreate } from '@/src/store/slices/split-create-slice';
import { truncateAddress, formatAmount } from '@/src/utils/format';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function SplitConfirmScreen() {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const balance = useAppSelector((state) => state.balance);
  const split = useAppSelector((state) => state.split);
  const splitCreate = useAppSelector((state) => state.splitCreate);
  const currentAccount = getCurrentAccount(wallet);
  const isTestAccount = useAppSelector(selectIsTestAccount);

  const selectedToken = balance.balances.find(
    (t) => t.symbol === splitCreate.selectedToken
  );

  const handleConfirm = async () => {
    if (!currentAccount?.address) {
      Alert.alert('Error', 'No wallet connected');
      return;
    }

    try {
      await dispatch(
        createSplitBillThunk({
          creatorAddress: currentAccount.address,
          totalAmount: splitCreate.totalAmount,
          tokenSymbol: splitCreate.selectedToken,
          description: splitCreate.description || undefined,
          participants: splitCreate.participants.map((p) => ({
            address: p.address,
            username: p.username,
            name: p.name,
            amount: p.amount,
          })),
        })
      ).unwrap();

      dispatch(resetSplitCreate());

      Alert.alert('Success', 'Split bill created! Participants will be notified.', [
        {
          text: 'OK',
          onPress: () => router.replace('/split'),
        },
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create split bill';
      Alert.alert('Error', message);
    }
  };

  const isCreating = split.status === 'loading';

  // Calculate USD value
  const totalValue = parseFloat(splitCreate.totalAmount) || 0;
  const usdValue = selectedToken
    ? (totalValue * (selectedToken.usdValue || 0)) / parseFloat(selectedToken.balance)
    : 0;

  // Get split mode display text
  const getSplitModeText = () => {
    switch (splitCreate.splitMode) {
      case 'equal':
        return 'Equal Split';
      case 'custom':
        return 'Custom Amounts';
      case 'percentage':
        return 'By Percentage';
      default:
        return 'Unknown';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Confirm" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.stepIndicator, theme.typography.caption, { color: theme.colors.textSecondary }]}>
          Step 6 of 6
        </Text>
        <Text style={[styles.subtitle, theme.typography.heading]}>
          Review your split bill
        </Text>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.tokenIcon}>
              <Text style={[styles.tokenIconText, theme.typography.heading]}>
                {splitCreate.selectedToken.charAt(0)}
              </Text>
            </View>
            <View style={styles.summaryAmount}>
              <Text style={[styles.amountValue, theme.typography.title]}>
                {formatAmount(splitCreate.totalAmount)} {splitCreate.selectedToken}
              </Text>
              {usdValue > 0 && (
                <Text style={[styles.amountUsd, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                  ${usdValue.toFixed(2)} USD
                </Text>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
              Split Mode
            </Text>
            <Text style={[styles.detailValue, theme.typography.body]}>
              {getSplitModeText()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
              Participants
            </Text>
            <Text style={[styles.detailValue, theme.typography.body]}>
              {splitCreate.participants.length}
            </Text>
          </View>

          {splitCreate.description && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                Description
              </Text>
              <Text style={[styles.detailValue, theme.typography.body, styles.descriptionText]}>
                {splitCreate.description}
              </Text>
            </View>
          )}
        </View>

        {/* Participants Card */}
        <View style={styles.participantsCard}>
          <Text style={[styles.sectionTitle, theme.typography.caption, { color: theme.colors.textSecondary }]}>
            PARTICIPANTS
          </Text>

          {splitCreate.participants.map((participant, index) => (
            <View key={participant.id} style={styles.participantRow}>
              <View style={styles.participantAvatar}>
                <FontAwesome name="user" size={16} color={theme.colors.textTertiary} />
              </View>
              <View style={styles.participantInfo}>
                <Text style={[styles.participantName, theme.typography.body]} numberOfLines={1}>
                  {participant.name || participant.username || truncateAddress(participant.address)}
                </Text>
                {(participant.name || participant.username) && (
                  <Text style={[styles.participantAddress, theme.typography.caption, { color: theme.colors.textTertiary }]}>
                    {truncateAddress(participant.address)}
                  </Text>
                )}
              </View>
              <Text style={[styles.participantAmount, theme.typography.body]}>
                {formatAmount(participant.amount)} {splitCreate.selectedToken}
              </Text>
            </View>
          ))}
        </View>

        {/* Delivery Card */}
        <View style={styles.deliveryCard}>
          <Text style={[styles.sectionTitle, theme.typography.caption, { color: theme.colors.textSecondary }]}>
            PAYMENTS DELIVERED TO
          </Text>

          <View style={styles.deliveryRow}>
            <View style={[styles.deliveryAvatar, { backgroundColor: theme.colors.success }]}>
              <FontAwesome name="check" size={16} color={theme.colors.buttonPrimaryText} />
            </View>
            <View style={styles.deliveryInfo}>
              {splitCreate.useCustomDelivery ? (
                <>
                  {splitCreate.deliveryUsername && (
                    <Text style={[styles.deliveryName, theme.typography.body]}>
                      {splitCreate.deliveryUsername}
                    </Text>
                  )}
                  <Text style={[
                    splitCreate.deliveryUsername ? styles.deliveryAddress : styles.deliveryName,
                    splitCreate.deliveryUsername ? theme.typography.caption : theme.typography.body,
                    splitCreate.deliveryUsername && { color: theme.colors.textTertiary }
                  ]}>
                    {truncateAddress(splitCreate.deliveryAddress)}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.deliveryName, theme.typography.body]}>
                    My Wallet
                  </Text>
                  <Text style={[styles.deliveryAddress, theme.typography.caption, { color: theme.colors.textTertiary }]}>
                    {currentAccount ? truncateAddress(currentAccount.address) : ''}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Info Note */}
        <View style={styles.infoCard}>
          <FontAwesome name="info-circle" size={16} color={theme.colors.buttonPrimary} />
          <Text style={[styles.infoText, theme.typography.caption, { color: theme.colors.textSecondary }]}>
            Participants will receive a notification to pay their share. Payments will be
            collected at the delivery address.
          </Text>
        </View>

        {/* Test Account Warning */}
        {isTestAccount && <TestModeWarning />}
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, isCreating && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={isCreating}
        >
          <Text style={[styles.confirmButtonText, theme.typography.heading]}>
            {isCreating ? 'Creating...' : 'Create Split Bill'}
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
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  tokenIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.buttonPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenIconText: {
    color: theme.colors.buttonPrimaryText,
  },
  summaryAmount: {
    flex: 1,
  },
  amountValue: {
    color: theme.colors.textPrimary,
  },
  amountUsd: {
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.buttonSecondaryBorder,
    marginVertical: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  detailLabel: {
    flex: 1,
  },
  detailValue: {
    color: theme.colors.textPrimary,
    textAlign: 'right',
  },
  descriptionText: {
    flex: 2,
  },
  participantsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceHover,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    color: theme.colors.textPrimary,
  },
  participantAddress: {
    marginTop: 2,
  },
  participantAmount: {
    color: theme.colors.textPrimary,
  },
  deliveryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  deliveryAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryName: {
    color: theme.colors.textPrimary,
  },
  deliveryAddress: {
    marginTop: 2,
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
