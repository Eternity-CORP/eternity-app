/**
 * Split Bill List Screen
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
import { loadCreatedSplitsThunk, loadPendingSplitsThunk } from '@/src/store/slices/split-slice';
import { truncateAddress, formatAmount } from '@/src/utils/format';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import { getNetworkBadge } from '@e-y/shared';

export default function SplitListScreen() {
  const { theme: dynamicTheme } = useTheme();
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const split = useAppSelector((state) => state.split);
  const currentAccount = getCurrentAccount(wallet);

  // Load splits when screen loads
  useEffect(() => {
    if (currentAccount?.address) {
      dispatch(loadCreatedSplitsThunk(currentAccount.address));
      dispatch(loadPendingSplitsThunk(currentAccount.address));
    }
  }, [currentAccount?.address, dispatch]);

  const onRefresh = useCallback(() => {
    if (currentAccount?.address) {
      dispatch(loadCreatedSplitsThunk(currentAccount.address));
      dispatch(loadPendingSplitsThunk(currentAccount.address));
    }
  }, [currentAccount?.address, dispatch]);

  const isLoading = split.status === 'loading';
  const allSplits = [...split.pendingSplits, ...split.createdSplits].filter(
    (bill, index, self) => self.findIndex((b) => b.id === bill.id) === index
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return { color: theme.colors.success, text: 'Completed' };
      case 'cancelled':
        return { color: theme.colors.error, text: 'Cancelled' };
      default:
        return { color: theme.colors.buttonPrimary, text: 'Active' };
    }
  };


  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader
        title="Split Bills"
        rightElement={
          <TouchableOpacity onPress={() => router.push('/split/create')}>
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
        {/* Pending Splits Section */}
        {split.pendingSplits.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>
              Pending Payments
            </Text>
            {split.pendingSplits.map((bill) => {
              const myShare = bill.participants.find(
                (p) => p.address.toLowerCase() === currentAccount?.address?.toLowerCase()
              );
              const networkBadge = getNetworkBadge(bill.chainId);
              return (
                <TouchableOpacity
                  key={`pending-${bill.id}`}
                  style={[styles.splitItem, styles.pendingItem]}
                  onPress={() => router.push(`/split/${bill.id}`)}
                >
                  <View style={[styles.splitIcon, { backgroundColor: dynamicTheme.colors.background }]}>
                    <FontAwesome name="exclamation-circle" size={20} color="#FFA500" />
                  </View>
                  <View style={styles.splitInfo}>
                    <Text style={[styles.splitAmount, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                      {formatAmount(myShare?.amount || bill.totalAmount)} {bill.tokenSymbol}
                    </Text>
                    <Text style={[styles.splitDescription, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                      {bill.description || `From ${bill.creatorUsername ? `@${bill.creatorUsername}` : truncateAddress(bill.creatorAddress)}`}
                    </Text>
                    {networkBadge && (
                      <Text style={[styles.networkBadgeText, { color: networkBadge.color }]}>
                        {networkBadge.name}
                      </Text>
                    )}
                  </View>
                  <FontAwesome name="chevron-right" size={14} color={dynamicTheme.colors.textTertiary} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Created Splits Section */}
        {split.createdSplits.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>
              Your Split Bills
            </Text>
            {split.createdSplits.map((bill) => {
              const paidCount = bill.participants.filter((p) => p.status === 'paid').length;
              const totalCount = bill.participants.length;
              const statusBadge = getStatusBadge(bill.status);
              const networkBadge = getNetworkBadge(bill.chainId);
              return (
                <TouchableOpacity
                  key={`created-${bill.id}`}
                  style={[styles.splitItem, { backgroundColor: dynamicTheme.colors.surface }]}
                  onPress={() => router.push(`/split/${bill.id}`)}
                >
                  <View style={[styles.splitIcon, { backgroundColor: statusBadge.color + '20' }]}>
                    <FontAwesome
                      name={bill.status === 'completed' ? 'check' : bill.status === 'cancelled' ? 'times' : 'users'}
                      size={16}
                      color={statusBadge.color}
                    />
                  </View>
                  <View style={styles.splitInfo}>
                    <Text style={[styles.splitAmount, theme.typography.body, { color: dynamicTheme.colors.textPrimary }]}>
                      {formatAmount(bill.totalAmount)} {bill.tokenSymbol}
                    </Text>
                    <Text style={[styles.splitDescription, theme.typography.caption, { color: dynamicTheme.colors.textSecondary }]}>
                      {bill.description || `${paidCount}/${totalCount} paid`}
                    </Text>
                    {networkBadge && (
                      <Text style={[styles.networkBadgeText, { color: networkBadge.color }]}>
                        {networkBadge.name}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusBadge.color + '20' }]}>
                    <Text style={[styles.statusText, theme.typography.caption, { color: statusBadge.color }]}>
                      {bill.status === 'active' ? `${paidCount}/${totalCount}` : statusBadge.text}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {allSplits.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <FontAwesome name="users" size={48} color={dynamicTheme.colors.textTertiary} />
            <Text style={[styles.emptyTitle, theme.typography.heading, { color: dynamicTheme.colors.textSecondary }]}>
              No Split Bills
            </Text>
            <Text style={[styles.emptyText, theme.typography.body, { color: dynamicTheme.colors.textTertiary }]}>
              Create a split bill to share expenses with friends
            </Text>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: dynamicTheme.colors.buttonPrimary }]}
              onPress={() => router.push('/split/create')}
            >
              <FontAwesome name="plus" size={16} color={dynamicTheme.colors.buttonPrimaryText} />
              <Text style={[styles.createButtonText, theme.typography.heading, { color: dynamicTheme.colors.buttonPrimaryText }]}>
                Create Split Bill
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
  splitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  pendingItem: {
    backgroundColor: '#FFA50010',
    borderWidth: 1,
    borderColor: '#FFA50030',
  },
  splitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splitInfo: {
    flex: 1,
  },
  splitAmount: {
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  splitDescription: {
    // color set inline
  },
  networkBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  statusText: {
    fontWeight: '600',
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
