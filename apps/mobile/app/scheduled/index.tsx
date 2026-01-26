/**
 * Scheduled Payments List Screen
 */

import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { loadScheduledPaymentsThunk } from '@/src/store/slices/scheduled-slice';
import { truncateAddress } from '@/src/utils/format';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function ScheduledListScreen() {
  const { theme: dynamicTheme } = useTheme();
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const scheduled = useAppSelector((state) => state.scheduled);
  const currentAccount = getCurrentAccount(wallet);

  // Load scheduled payments when screen loads
  useEffect(() => {
    if (currentAccount?.address) {
      dispatch(loadScheduledPaymentsThunk(currentAccount.address));
    }
  }, [currentAccount?.address, dispatch]);

  const onRefresh = useCallback(() => {
    if (currentAccount?.address) {
      dispatch(loadScheduledPaymentsThunk(currentAccount.address));
    }
  }, [currentAccount?.address, dispatch]);

  const isLoading = scheduled.status === 'loading';

  // Sort payments: overdue first, then by date
  const sortedPayments = [...scheduled.payments].sort((a, b) => {
    const now = Date.now();
    const aTime = new Date(a.scheduledAt).getTime();
    const bTime = new Date(b.scheduledAt).getTime();
    const aOverdue = aTime < now;
    const bOverdue = bTime < now;
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    return aTime - bTime;
  });

  const overduePayments = sortedPayments.filter((p) => new Date(p.scheduledAt).getTime() < Date.now());
  const upcomingPayments = sortedPayments.filter((p) => new Date(p.scheduledAt).getTime() >= Date.now());

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader
        title="Scheduled Payments"
        rightElement={
          <TouchableOpacity onPress={() => router.push('/scheduled/create')}>
            <FontAwesome name="plus" size={20} color={dynamicTheme.colors.buttonPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={dynamicTheme.colors.buttonPrimary}
          />
        }
      >
        {/* Overdue Section */}
        {overduePayments.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, theme.typography.heading, { color: dynamicTheme.colors.error }]}>
              Overdue
            </Text>
            {overduePayments.map((payment) => {
              const recipientDisplay = payment.recipientUsername
                ? `@${payment.recipientUsername}`
                : payment.recipientName
                  ? payment.recipientName
                  : truncateAddress(payment.recipient);
              const scheduledDate = new Date(payment.scheduledAt);
              return (
                <TouchableOpacity
                  key={payment.id}
                  style={[styles.paymentItem, styles.overdueItem, { backgroundColor: dynamicTheme.colors.error + '10', borderColor: dynamicTheme.colors.error + '30' }]}
                  onPress={() => router.push(`/scheduled/${payment.id}`)}
                >
                  <View style={[styles.paymentIcon, styles.overdueIcon, { backgroundColor: dynamicTheme.colors.error + '20' }]}>
                    <FontAwesome name="exclamation" size={16} color={dynamicTheme.colors.error} />
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={[styles.paymentAmount, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                      {payment.amount} {payment.tokenSymbol}
                    </Text>
                    <Text style={[styles.paymentRecipient, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                      To: {recipientDisplay}
                    </Text>
                    <Text style={[styles.paymentDate, theme.typography.caption, { color: dynamicTheme.colors.error }]}>
                      Was due: {scheduledDate.toLocaleDateString()}
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={14} color={dynamicTheme.colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Upcoming Section */}
        {upcomingPayments.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>
              Upcoming
            </Text>
            {upcomingPayments.map((payment) => {
              const recipientDisplay = payment.recipientUsername
                ? `@${payment.recipientUsername}`
                : payment.recipientName
                  ? payment.recipientName
                  : truncateAddress(payment.recipient);
              const scheduledDate = new Date(payment.scheduledAt);
              return (
                <TouchableOpacity
                  key={payment.id}
                  style={[styles.paymentItem, { backgroundColor: dynamicTheme.colors.surface }]}
                  onPress={() => router.push(`/scheduled/${payment.id}`)}
                >
                  <View style={[styles.paymentIcon, { backgroundColor: dynamicTheme.colors.buttonPrimary + '20' }]}>
                    <FontAwesome
                      name={payment.recurringInterval ? 'refresh' : 'calendar'}
                      size={16}
                      color={dynamicTheme.colors.buttonPrimary}
                    />
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={[styles.paymentAmount, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                      {payment.amount} {payment.tokenSymbol}
                    </Text>
                    <Text style={[styles.paymentRecipient, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                      To: {recipientDisplay}
                    </Text>
                    <Text style={[styles.paymentDate, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                      {scheduledDate.toLocaleDateString()} at {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {payment.recurringInterval && ` · ${payment.recurringInterval}`}
                    </Text>
                  </View>
                  <FontAwesome name="chevron-right" size={14} color={dynamicTheme.colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {scheduled.payments.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <FontAwesome name="calendar" size={48} color={dynamicTheme.colors.textTertiary} />
            <Text style={[styles.emptyTitle, theme.typography.heading, { color: dynamicTheme.colors.textSecondary }]}>
              No Scheduled Payments
            </Text>
            <Text style={[styles.emptyText, theme.typography.body, { color: dynamicTheme.colors.textTertiary }]}>
              Schedule payments to send crypto at a specific time
            </Text>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: dynamicTheme.colors.buttonPrimary }]}
              onPress={() => router.push('/scheduled/create')}
            >
              <FontAwesome name="plus" size={16} color={dynamicTheme.colors.buttonPrimaryText} />
              <Text style={[styles.createButtonText, theme.typography.heading, { color: dynamicTheme.colors.buttonPrimaryText }]}>
                Schedule Payment
              </Text>
            </TouchableOpacity>
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
    paddingBottom: theme.spacing.xxl,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  overdueItem: {
    backgroundColor: theme.colors.error + '10',
    borderWidth: 1,
    borderColor: theme.colors.error + '30',
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.buttonPrimary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overdueIcon: {
    backgroundColor: theme.colors.error + '20',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  paymentRecipient: {
    marginBottom: 2,
  },
  paymentDate: {
    // color set inline
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 280,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.buttonPrimary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.md,
  },
  createButtonText: {
    // color set inline
  },
});
