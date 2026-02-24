/**
 * Transactions History Screen
 * Displays full transaction history for the current account
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount, selectCurrentAccountType } from '@/src/store/slices/wallet-slice';
import {
  fetchTransactionsThunk,
  selectTransactionsForAddress,
  subscribeToPendingTransactions,
  unsubscribeFromAllTransactions,
} from '@/src/store/slices/transaction-slice';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { useTheme } from '@/src/contexts';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';
import { SUPPORTED_NETWORKS, type NetworkId } from '@/src/constants/networks';

export default function TransactionsScreen() {
  const { theme: dynamicTheme } = useTheme();
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const transactionState = useAppSelector((state) => state.transaction);
  const currentAccount = getCurrentAccount(wallet);
  const currentAccountType = useAppSelector(selectCurrentAccountType);
  const transactions = useAppSelector((state) => selectTransactionsForAddress(state, currentAccount?.address || null));

  // Load transactions when screen mounts or account changes
  useEffect(() => {
    if (currentAccount?.address) {
      dispatch(fetchTransactionsThunk({ address: currentAccount.address, accountType: currentAccountType || undefined }));
    }

    // Cleanup on unmount
    return () => {
      unsubscribeFromAllTransactions();
    };
  }, [currentAccount?.address, currentAccountType, dispatch]);

  // Subscribe to real-time updates for pending transactions
  useEffect(() => {
    if (currentAccount?.address && transactions.length > 0) {
      subscribeToPendingTransactions(
        transactions,
        currentAccount.address,
        (action) => dispatch(action)
      );
    }
  }, [transactions, currentAccount?.address, dispatch]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    if (currentAccount?.address) {
      dispatch(fetchTransactionsThunk({ address: currentAccount.address, accountType: currentAccountType || undefined }));
    }
  }, [currentAccount?.address, currentAccountType, dispatch]);

  const handleTransactionPress = (txHash: string) => {
    router.push(`/transaction/${txHash}`);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: dynamicTheme.colors.background }]} edges={['top']}>
      <ScreenHeader title="Transaction History" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={transactionState.status === 'loading'}
            onRefresh={onRefresh}
            tintColor={dynamicTheme.colors.buttonPrimary}
          />
        }
      >
        {transactionState.status === 'loading' && transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, theme.typography.body, { color: dynamicTheme.colors.textSecondary }]}>
              Loading transactions...
            </Text>
            {currentAccount?.address ? (
              <Text style={[styles.emptySubtext, theme.typography.caption, { color: dynamicTheme.colors.textTertiary }]}>
                Scanning blocks for {currentAccount.address.slice(0, 8)}...
              </Text>
            ) : null}
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome name="exchange" size={48} color={dynamicTheme.colors.textTertiary} />
            <Text style={[styles.emptyText, theme.typography.heading, { color: dynamicTheme.colors.textPrimary }]}>
              No transactions found
            </Text>
            <Text style={[styles.emptySubtext, theme.typography.body, { color: dynamicTheme.colors.textSecondary }]}>
              We scanned the last 100 blocks. If you sent tokens earlier, they may not appear here.
            </Text>
            {transactionState.error && (
              <Text style={[styles.emptySubtext, theme.typography.caption, { color: dynamicTheme.colors.error, marginTop: theme.spacing.sm }]}>
                Error: {transactionState.error}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {transactions.map((tx) => {
              const isReceived = tx.direction === 'received';
              const txColor = isReceived ? dynamicTheme.colors.success : dynamicTheme.colors.error;
              const statusColor = tx.status === 'confirmed' ? dynamicTheme.colors.success :
                                  tx.status === 'pending' ? '#FFA500' : dynamicTheme.colors.error;
              const netConfig = tx.networkId ? SUPPORTED_NETWORKS[tx.networkId as NetworkId] : null;

              return (
              <TouchableOpacity
                key={`${tx.hash}-${tx.networkId || 'default'}`}
                style={[styles.transactionItem, { backgroundColor: dynamicTheme.colors.surface }]}
                onPress={() => handleTransactionPress(tx.hash)}
                activeOpacity={0.7}
              >
                <View style={[styles.transactionIcon, { backgroundColor: txColor + '15' }]}>
                  <FontAwesome
                    name={isReceived ? 'arrow-down' : 'arrow-up'}
                    size={18}
                    color={txColor}
                  />
                </View>

                <View style={styles.transactionInfo}>
                  <View style={styles.typeRow}>
                    <Text style={[styles.transactionType, { color: dynamicTheme.colors.textPrimary }]}>
                      {isReceived ? 'Received' : 'Sent'}
                    </Text>
                    {netConfig && (
                      <View style={[styles.networkBadge, { backgroundColor: netConfig.color + '18' }]}>
                        <View style={[styles.networkDot, { backgroundColor: netConfig.color }]} />
                        <Text style={[styles.networkName, { color: netConfig.color }]}>
                          {netConfig.shortName}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.transactionDate, { color: dynamicTheme.colors.textTertiary }]}>
                    {new Date(tx.timestamp).toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })} • {new Date(tx.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                <View style={styles.transactionRight}>
                  <Text style={[styles.transactionAmountText, { color: txColor }]}>
                    {isReceived ? '+' : '-'}{tx.amount} {tx.token}
                  </Text>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: dynamicTheme.colors.textTertiary }]}>
                      {tx.status === 'confirmed' ? 'Confirmed' : tx.status === 'pending' ? 'Pending' : 'Failed'}
                    </Text>
                  </View>
                </View>

                <FontAwesome name="chevron-right" size={12} color={dynamicTheme.colors.textTertiary} />
              </TouchableOpacity>
            );
            })}
          </View>
        )}

        {transactionState.error && (
          <View style={[styles.errorContainer, { backgroundColor: dynamicTheme.colors.error + '10' }]}>
            <Text style={[styles.errorText, theme.typography.caption, { color: dynamicTheme.colors.error }]}>
              {transactionState.error}
            </Text>
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
  },
  transactionsList: {
    gap: theme.spacing.sm,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.md,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
    gap: 2,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transactionType: {
    fontSize: 15,
    fontWeight: '500',
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  networkDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  networkName: {
    fontSize: 10,
    fontWeight: '600',
  },
  transactionDate: {
    fontSize: 12,
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  transactionAmountText: {
    fontSize: 15,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 2,
    gap: theme.spacing.md,
  },
  emptyText: {
    textAlign: 'center',
  },
  emptySubtext: {
    textAlign: 'center',
    marginTop: theme.spacing.xs,
  },
  errorContainer: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.error + '10',
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  errorText: {
    textAlign: 'center',
  },
});
