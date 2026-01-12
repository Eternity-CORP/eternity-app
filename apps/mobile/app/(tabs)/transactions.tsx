/**
 * Transactions History Screen
 * Displays full transaction history for the current account
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import { fetchTransactionsThunk, fetchTransactionDetailsThunk } from '@/src/store/slices/transaction-slice';
import { theme } from '@/src/constants/theme';
import { FontAwesome } from '@expo/vector-icons';

export default function TransactionsScreen() {
  const dispatch = useAppDispatch();
  const wallet = useAppSelector((state) => state.wallet);
  const transaction = useAppSelector((state) => state.transaction);
  const currentAccount = getCurrentAccount(wallet);

  // Load transactions when screen mounts or account changes
  useEffect(() => {
    if (currentAccount?.address) {
      dispatch(fetchTransactionsThunk(currentAccount.address));
    }
  }, [currentAccount?.address, dispatch]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    if (currentAccount?.address) {
      dispatch(fetchTransactionsThunk(currentAccount.address));
    }
  }, [currentAccount?.address, dispatch]);

  const handleTransactionPress = async (txHash: string) => {
    if (currentAccount?.address) {
      try {
        await dispatch(fetchTransactionDetailsThunk({ txHash, userAddress: currentAccount.address }));
        // TODO: Navigate to transaction details screen
        // router.push(`/(tabs)/transaction-details?hash=${txHash}`);
      } catch (error) {
        console.error('Error loading transaction details:', error);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, theme.typography.title]}>Transaction History</Text>
        <View style={styles.backButton} /> {/* Spacer for centering */}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={transaction.status === 'loading'}
            onRefresh={onRefresh}
            tintColor={theme.colors.buttonPrimary}
          />
        }
      >
        {transaction.status === 'loading' && transaction.transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, theme.typography.body, { color: theme.colors.textSecondary }]}>
              Loading transactions...
            </Text>
          </View>
        ) : transaction.transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome name="exchange" size={48} color={theme.colors.textTertiary} />
            <Text style={[styles.emptyText, theme.typography.heading, { color: theme.colors.textPrimary }]}>
              No transactions yet
            </Text>
            <Text style={[styles.emptySubtext, theme.typography.body, { color: theme.colors.textSecondary }]}>
              Your transaction history will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.transactionsList}>
            {transaction.transactions.map((tx) => (
              <TouchableOpacity
                key={tx.hash}
                style={styles.transactionItem}
                onPress={() => handleTransactionPress(tx.hash)}
              >
                <View style={styles.transactionIcon}>
                  <FontAwesome
                    name={tx.direction === 'sent' ? 'arrow-up' : 'arrow-down'}
                    size={20}
                    color={tx.direction === 'sent' ? theme.colors.error : theme.colors.success || theme.colors.buttonPrimary}
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={[styles.transactionDirection, theme.typography.heading]}>
                    {tx.direction === 'sent' ? 'Sent' : 'Received'}
                  </Text>
                  <Text style={[styles.transactionAddress, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                    {tx.direction === 'sent' 
                      ? `To: ${tx.to.slice(0, 6)}...${tx.to.slice(-4)}`
                      : `From: ${tx.from.slice(0, 6)}...${tx.from.slice(-4)}`
                    }
                  </Text>
                  <Text style={[styles.transactionDate, theme.typography.caption, { color: theme.colors.textTertiary }]}>
                    {new Date(tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={styles.transactionAmount}>
                  <Text style={[
                    styles.transactionAmountText,
                    theme.typography.heading,
                    { color: tx.direction === 'sent' ? theme.colors.textPrimary : theme.colors.success || theme.colors.buttonPrimary }
                  ]}>
                    {tx.direction === 'sent' ? '-' : '+'}{tx.amount} {tx.token}
                  </Text>
                  <View style={styles.transactionStatus}>
                    <View style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          tx.status === 'confirmed' ? (theme.colors.success || theme.colors.buttonPrimary) :
                          tx.status === 'pending' ? theme.colors.warning || '#FFA500' :
                          theme.colors.error
                      }
                    ]} />
                    <Text style={[styles.transactionStatusText, theme.typography.caption, { color: theme.colors.textSecondary }]}>
                      {tx.status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {transaction.error && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, theme.typography.caption, { color: theme.colors.error }]}>
              {transaction.error}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.buttonSecondaryBorder,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.xl,
  },
  transactionsList: {
    gap: theme.spacing.md,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.md,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDirection: {
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs / 2,
  },
  transactionAddress: {
    marginBottom: theme.spacing.xs / 2,
  },
  transactionDate: {
    // Already styled
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionAmountText: {
    marginBottom: theme.spacing.xs / 2,
  },
  transactionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs / 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  transactionStatusText: {
    textTransform: 'capitalize',
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
