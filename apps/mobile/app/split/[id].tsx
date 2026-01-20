/**
 * Split Bill Details Screen
 */

import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { getSplitBillThunk, cancelSplitBillThunk } from '@/src/store/slices/split-slice';
import { setSelectedToken, setRecipient, setAmount, setStep, setSplitBillContext } from '@/src/store/slices/send-slice';
import { truncateAddress, formatAmount } from '@/src/utils/format';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function SplitDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const split = useAppSelector((state) => state.split);
  const currentAccount = getCurrentAccount(wallet);

  const [actionLoading, setActionLoading] = useState(false);

  const bill = split.selectedSplit;

  // Load split bill details
  useEffect(() => {
    if (id) {
      dispatch(getSplitBillThunk(id));
    }
  }, [id, dispatch]);

  const handleCancel = async () => {
    if (!bill) return;

    Alert.alert(
      'Cancel Split Bill',
      'Are you sure you want to cancel this split bill?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await dispatch(cancelSplitBillThunk({ id: bill.id, walletAddress: currentAccount?.address || '' })).unwrap();
              router.back();
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Failed to cancel';
              Alert.alert('Error', message);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handlePayShare = (participant: { address: string; amount: string }) => {
    dispatch(setSelectedToken(bill!.tokenSymbol));
    dispatch(setRecipient(bill!.creatorAddress));
    dispatch(setAmount(participant.amount));
    dispatch(setSplitBillContext({
      splitBillId: bill!.id,
      participantAddress: participant.address,
    }));
    dispatch(setStep('confirm'));
    router.push('/send/confirm');
  };

  // Loading state
  if (split.status === 'loading' && !bill) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Split Bill" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.buttonPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  // Not found state
  if (!bill) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenHeader title="Split Bill" />
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-triangle" size={48} color={theme.colors.error} />
          <Text style={[styles.errorText, theme.typography.heading, { color: theme.colors.textPrimary }]}>
            Split bill not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCreator = currentAccount?.address.toLowerCase() === bill.creatorAddress.toLowerCase();
  const myParticipation = bill.participants.find(
    (p) => p.address.toLowerCase() === currentAccount?.address.toLowerCase()
  );
  const paidCount = bill.participants.filter((p) => p.status === 'paid').length;
  const totalParticipants = bill.participants.length;
  const isCompleted = bill.status === 'completed';
  const isCancelled = bill.status === 'cancelled';

  const getStatusColor = () => {
    if (isCompleted) return theme.colors.success;
    if (isCancelled) return theme.colors.error;
    return theme.colors.buttonPrimary;
  };

  const getStatusText = () => {
    if (isCompleted) return 'Completed';
    if (isCancelled) return 'Cancelled';
    return `${paidCount}/${totalParticipants} Paid`;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Split Bill" />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Status */}
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={[styles.statusText, theme.typography.caption, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>
        </View>

        {/* Amount */}
        <View style={styles.amountSection}>
          <Text
            style={[styles.amountText, theme.typography.displayLarge]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {formatAmount(bill.totalAmount)} {bill.tokenSymbol}
          </Text>
          {bill.description && (
            <Text style={[styles.description, theme.typography.body, { color: theme.colors.textSecondary }]}>
              "{bill.description}"
            </Text>
          )}
        </View>

        {/* Creator Info */}
        <View style={styles.card}>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
              Created by
            </Text>
            <Text style={[styles.detailText, theme.typography.body]}>
              {bill.creatorUsername ? `@${bill.creatorUsername}` : truncateAddress(bill.creatorAddress)}
              {isCreator && ' (You)'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
              Payments go to
            </Text>
            <Text style={[styles.detailText, theme.typography.body]}>
              {truncateAddress(bill.creatorAddress)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, theme.typography.caption, { color: theme.colors.textSecondary }]}>
              Created
            </Text>
            <Text style={[styles.detailText, theme.typography.body]}>
              {new Date(bill.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Participants */}
        <View style={styles.participantsSection}>
          <Text style={[styles.sectionTitle, theme.typography.heading]}>
            Participants
          </Text>
          <View style={styles.participantsList}>
            {bill.participants.map((participant, index) => {
              const isMe = participant.address.toLowerCase() === currentAccount?.address.toLowerCase();
              const isPaid = participant.status === 'paid';
              const displayName = participant.username
                ? `@${participant.username}`
                : participant.name
                  ? participant.name
                  : truncateAddress(participant.address);

              return (
                <View key={index} style={styles.participantItem}>
                  <View style={[styles.participantIcon, isPaid && styles.participantIconPaid]}>
                    <FontAwesome
                      name={isPaid ? 'check' : 'user'}
                      size={14}
                      color={isPaid ? theme.colors.buttonPrimaryText : theme.colors.textTertiary}
                    />
                  </View>
                  <View style={styles.participantInfo}>
                    <Text style={[styles.participantName, theme.typography.body]}>
                      {displayName} {isMe && '(You)'}
                    </Text>
                    <Text style={[styles.participantStatus, theme.typography.caption, { color: isPaid ? theme.colors.success : theme.colors.textSecondary }]}>
                      {isPaid ? 'Paid' : 'Pending'}
                    </Text>
                  </View>
                  <Text
                    style={[styles.participantAmount, theme.typography.body]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {formatAmount(participant.amount)} {bill.tokenSymbol}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Actions */}
        {bill.status === 'active' && (
          <View style={styles.actionsSection}>
            {/* Pay my share button (if I'm a participant and haven't paid) */}
            {myParticipation && myParticipation.status === 'pending' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.primaryButton]}
                onPress={() => handlePayShare(myParticipation)}
              >
                <FontAwesome name="send" size={16} color={theme.colors.buttonPrimaryText} />
                <Text
                  style={[styles.actionButtonText, theme.typography.heading, { color: theme.colors.buttonPrimaryText }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  Pay My Share ({formatAmount(myParticipation.amount)} {bill.tokenSymbol})
                </Text>
              </TouchableOpacity>
            )}

            {/* Cancel button (only for creator) */}
            {isCreator && (
              <TouchableOpacity
                style={[styles.actionButton, styles.dangerButton]}
                onPress={handleCancel}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={theme.colors.error} />
                ) : (
                  <>
                    <FontAwesome name="times" size={16} color={theme.colors.error} />
                    <Text style={[styles.actionButtonText, theme.typography.heading, { color: theme.colors.error }]}>
                      Cancel Split Bill
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  errorText: {
    textAlign: 'center',
  },
  // Status
  statusSection: {
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Amount
  amountSection: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  amountText: {
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    fontStyle: 'italic',
  },
  // Card
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    flex: 0.35,
  },
  detailText: {
    color: theme.colors.textPrimary,
    textAlign: 'right',
    flex: 0.65,
  },
  // Participants
  participantsSection: {
    gap: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
  },
  participantsList: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.buttonSecondaryBorder,
  },
  participantIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantIconPaid: {
    backgroundColor: theme.colors.success,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    color: theme.colors.textPrimary,
  },
  participantStatus: {
    marginTop: 2,
  },
  participantAmount: {
    color: theme.colors.textPrimary,
    fontWeight: '600',
    flexShrink: 0,
    maxWidth: 120,
    textAlign: 'right',
  },
  // Actions
  actionsSection: {
    gap: theme.spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  primaryButton: {
    backgroundColor: theme.colors.buttonPrimary,
  },
  dangerButton: {
    backgroundColor: theme.colors.error + '10',
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  actionButtonText: {
    // Color set inline
  },
});
