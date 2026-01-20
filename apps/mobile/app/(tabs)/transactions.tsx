/**
 * Transactions History Screen
 * Displays full transaction history for the current account
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import {
  fetchTransactionsThunk,
  selectTransactionsForAddress,
  subscribeToPendingTransactions,
  unsubscribeFromAllTransactions,
} from '@/src/store/slices/transaction-slice';
import { ScreenHeader } from '@/src/components/ScreenHeader';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function TransactionsScreen() {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const transactionState = useAppSelector((state) => state.transaction);
  const currentAccount = getCurrentAccount(wallet);
  const transactions = useAppSelector((state) => selectTransactionsForAddress(state, currentAccount?.address || null));

  // Load transactions when screen mounts or account changes
  useEffect(() => {
    if (currentAccount?.address) {
      dispatch(fetchTransactionsThunk(currentAccount.address));
    }

    // Cleanup on unmount
    return () => {
      unsubscribeFromAllTransactions();
    };
  }, [currentAccount?.address, dispatch]);

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
      dispatch(fetchTransactionsThunk(currentAccount.address));
    }
  }, [currentAccount?.address, dispatch]);

  const handleTransactionPress = (txHash: string) => {
    router.push(`/transaction/${txHash}`);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScreenHeader title="Transaction History" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={transactionState.status === 'loading'}
            onRefresh={onRefresh}
            tintColor={theme.colors.buttonPrimary}
          />
        }
      >
        {transactionState.status === 'loading' && transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, theme.typography.body, { color: theme.colors.textSecondary }]}>
              Loading transactions...
            </Text>
            {currentAccount?.address ? (
              <Text style={[styles.emptySubtext, theme.typography.caption, { color: theme.colors.textTertiary }]}>
                Scanning blocks for {currentAccount.address.slice(0, 8)}...
              </Text>
            ) : null}
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome name="exchange" size={48} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyText, theme.typography.heading, { color: theme.colors.textPrimary }]}>
              No transactions found
            </Text>
            <Text style={[styles.emptySubtext, theme.typography.body, { color: theme.colors.textSecondary }]}>
              We scanned the last 100 blocks. If you sent tokens earlier, they may not appear here.
            </Text>
            {transactionState.error && (
              <Text style={[styles.emptySubtext, theme.typography.caption, { color: theme.colors.error, marginTop: theme.spacing.sm }]}>
                Error: {transactionState.error}
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {transactions.map((tx) => {
              const isReceived = tx.direction === 'received';
              const txColor = isReceived ? theme.colors.success : theme.colors.error;
              const statusColor = tx.status === 'confirmed' ? theme.colors.success :
                                  tx.status === 'pending' ? '#FFA500' : theme.colors.error;

              return (
              <TouchableOpacity
                key={tx.hash}
                style={styles.transactionItem}
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
                  <Text style={[styles.transactionType, { color: theme.colors.textPrimary }]}>
                    {isReceived ? 'Received' : 'Sent'}
                  </Text>
                  <Text style={[styles.transactionDate, { color: theme.colors.textTertiary }]}>
                    {new Date(tx.timestamp).toLocaleDateString('ru-RU')} • {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                <View style={styles.transactionRight}>
                  <Text style={[styles.transactionAmountText, { color: txColor }]}>
                    {isReceived ? '+' : '-'}{tx.amount} {tx.token}
                  </Text>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: theme.colors.textTertiary }]}>
                      {tx.status === 'confirmed' ? 'Confirmed' : tx.status === 'pending' ? 'Pending' : 'Failed'}
                    </Text>
                  </View>
                </View>

                <FontAwesome name="chevron-right" size={12} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            );
            })}
          </View>
        )}

        {transactionState.error && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, theme.typography.caption, { color: theme.colors.error }]}>
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
  transactionType: {
    fontSize: 15,
    fontWeight: '500',
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
