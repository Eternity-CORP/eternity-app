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
import { checkSplitPrivacy, getBlockedParticipantNames } from '@/src/services/split-bill-service';
import { truncateAddress, formatAmount } from '@/src/utils/format';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function SplitConfirmScreen() {
  const dispatch = useAppDispatch();
  const { theme: dynamicTheme } = useTheme();
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
      // Check if participants can receive split bill requests
      const participantAddresses = splitCreate.participants.map((p) => p.address);
      const privacyResults = await checkSplitPrivacy(
        currentAccount.address,
        participantAddresses
      );

      const blockedNames = getBlockedParticipantNames(
        privacyResults,
        splitCreate.participants
      );

      if (blockedNames.length > 0) {
        const message =
          blockedNames.length === 1
            ? `${blockedNames[0]} has disabled split bill requests and won't receive this request.`
            : `The following participants have disabled split bill requests and won't receive this request:\n\n${blockedNames.join('\n')}`;
        Alert.alert('Cannot send to some participants', message);
        return;
      }

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Confirm" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={[styles.stepIndicator, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
          Step 6 of 6
        </Text>
        <Text style={[styles.subtitle, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>
          Review your split bill
        </Text>

        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: dynamicTheme.colors.surface }]}>
          <View style={styles.summaryHeader}>
            <View style={[styles.tokenIcon, { backgroundColor: dynamicTheme.colors.buttonPrimary }]}>
              <Text style={[styles.tokenIconText, theme.typography.heading, { color: dynamicTheme.colors.buttonPrimaryText }]}>
                {splitCreate.selectedToken.charAt(0)}
              </Text>
            </View>
            <View style={styles.summaryAmount}>
              <Text style={[styles.amountValue, theme.typography.title, { color: dynamicTheme.colors.textPrimary }]}>
                {formatAmount(splitCreate.totalAmount)} {splitCreate.selectedToken}
              </Text>
              {usdValue > 0 && (
                <Text style={[styles.amountUsd, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                  ${usdValue.toFixed(2)} USD
                </Text>
              )}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: dynamicTheme.colors.buttonSecondaryBorder }]} />

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
              Split Mode
            </Text>
            <Text style={[styles.detailValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
              {getSplitModeText()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
              Participants
            </Text>
            <Text style={[styles.detailValue, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
              {splitCreate.participants.length}
            </Text>
          </View>

          {splitCreate.description && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                Description
              </Text>
              <Text style={[styles.detailValue, theme.typography.body, styles.descriptionText, { color: dynamicTheme.colors.textPrimary }]}>
                {splitCreate.description}
              </Text>
            </View>
          )}
        </View>

        {/* Participants Card */}
        <View style={[styles.participantsCard, { backgroundColor: dynamicTheme.colors.surface }]}>
          <Text style={[styles.sectionTitle, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
            PARTICIPANTS
          </Text>

          {splitCreate.participants.map((participant) => (
            <View key={participant.id} style={styles.participantRow}>
              <View style={[styles.participantAvatar, { backgroundColor: dynamicTheme.colors.surfaceHover }]}>
                <FontAwesome name="user" size={16} color={dynamicTheme.colors.textTertiary} />
              </View>
              <View style={styles.participantInfo}>
                <Text style={[styles.participantName, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]} numberOfLines={1}>
                  {participant.name || participant.username || truncateAddress(participant.address)}
                </Text>
                {(participant.name || participant.username) && (
                  <Text style={[styles.participantAddress, theme.typography.caption, { color: dynamicTheme.colors.textTertiary }]}>
                    {truncateAddress(participant.address)}
                  </Text>
                )}
              </View>
              <Text style={[styles.participantAmount, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                {formatAmount(participant.amount)} {splitCreate.selectedToken}
              </Text>
            </View>
          ))}
        </View>

        {/* Delivery Card */}
        <View style={[styles.deliveryCard, { backgroundColor: dynamicTheme.colors.surface }]}>
          <Text style={[styles.sectionTitle, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
            PAYMENTS DELIVERED TO
          </Text>

          <View style={styles.deliveryRow}>
            <View style={[styles.deliveryAvatar, { backgroundColor: dynamicTheme.colors.success }]}>
              <FontAwesome name="check" size={16} color={dynamicTheme.colors.buttonPrimaryText} />
            </View>
            <View style={styles.deliveryInfo}>
              {splitCreate.useCustomDelivery ? (
                <>
                  {splitCreate.deliveryUsername && (
                    <Text style={[styles.deliveryName, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                      {splitCreate.deliveryUsername}
                    </Text>
                  )}
                  <Text style={[
                    splitCreate.deliveryUsername ? styles.deliveryAddress : styles.deliveryName,
                    splitCreate.deliveryUsername ? theme.typography.caption : theme.typography.body,
                    { color: splitCreate.deliveryUsername ? dynamicTheme.colors.textTertiary : dynamicTheme.colors.textPrimary }
                  ]}>
                    {truncateAddress(splitCreate.deliveryAddress)}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.deliveryName, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                    My Wallet
                  </Text>
                  <Text style={[styles.deliveryAddress, theme.typography.caption, { color: dynamicTheme.colors.textTertiary }]}>
                    {currentAccount ? truncateAddress(currentAccount.address) : ''}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Info Note */}
        <View style={[styles.infoCard, { backgroundColor: dynamicTheme.colors.buttonPrimary + '10' }]}>
          <FontAwesome name="info-circle" size={16} color={dynamicTheme.colors.buttonPrimary} />
          <Text style={[styles.infoText, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
            Participants will receive a notification to pay their share. Payments will be
            collected at the delivery address.
          </Text>
        </View>

        {/* Test Account Warning */}
        {isTestAccount && <TestModeWarning />}
      </ScrollView>

      {/* Confirm Button */}
      <View style={[styles.footer, { borderTopColor: dynamicTheme.colors.buttonSecondaryBorder }]}>
        <TouchableOpacity
          style={[styles.confirmButton, { backgroundColor: dynamicTheme.colors.buttonPrimary }, isCreating && { backgroundColor: dynamicTheme.colors.textTertiary }]}
          onPress={handleConfirm}
          disabled={isCreating}
        >
          <Text style={[styles.confirmButtonText, theme.typography.heading, { color: dynamicTheme.colors.buttonPrimaryText }]}>
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
