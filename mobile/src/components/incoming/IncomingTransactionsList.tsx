/**
 * Incoming Transactions List
 * 
 * Displays list of incoming ETH and ERC-20 transactions
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import Card from '../common/Card';
import type { IncomingTransaction } from '../../wallet/incoming';

interface Props {
  transactions: IncomingTransaction[];
  onRefresh?: () => void;
  refreshing?: boolean;
  onTransactionPress?: (transaction: IncomingTransaction) => void;
}

export default function IncomingTransactionsList({
  transactions,
  onRefresh,
  refreshing = false,
  onTransactionPress,
}: Props) {
  const { theme } = useTheme();

  const renderTransaction = ({ item }: { item: IncomingTransaction }) => {
    const isETH = item.type === 'eth';
    const symbol = isETH ? 'ETH' : item.tokenSymbol || 'TOKEN';
    const date = new Date(item.timestamp);
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    return (
      <TouchableOpacity
        onPress={() => onTransactionPress?.(item)}
        activeOpacity={0.7}
      >
        <Card style={styles.transactionCard}>
          <View style={styles.transactionContent}>
            {/* Icon */}
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: item.isStable
                    ? theme.colors.success + '20'
                    : theme.colors.warning + '20',
                },
              ]}
            >
              <Ionicons
                name="arrow-down"
                size={24}
                color={item.isStable ? theme.colors.success : theme.colors.warning}
              />
            </View>

            {/* Details */}
            <View style={styles.detailsContainer}>
              <View style={styles.row}>
                <Text style={[styles.type, { color: theme.colors.text }]}>
                  Received {symbol}
                </Text>
                <Text style={[styles.amount, { color: theme.colors.success }]}>
                  +{item.value}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={[styles.from, { color: theme.colors.textSecondary }]}>
                  From: {item.from.slice(0, 6)}...{item.from.slice(-4)}
                </Text>
                <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
                  {timeStr}
                </Text>
              </View>

              <View style={styles.row}>
                <View style={styles.statusContainer}>
                  {item.isStable ? (
                    <View style={styles.statusBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color={theme.colors.success}
                      />
                      <Text
                        style={[styles.statusText, { color: theme.colors.success }]}
                      >
                        Confirmed
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.statusBadge}>
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={theme.colors.warning}
                      />
                      <Text
                        style={[styles.statusText, { color: theme.colors.warning }]}
                      >
                        {item.confirmations} confirmation{item.confirmations !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
                  {dateStr}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="arrow-down-circle-outline" size={64} color={theme.colors.border} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        No Incoming Transactions
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        When you receive ETH or tokens, they will appear here
      </Text>
    </View>
  );

  return (
    <FlatList
      data={transactions}
      renderItem={renderTransaction}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.listContainer,
        transactions.length === 0 && styles.emptyList,
      ]}
      ListEmptyComponent={renderEmpty}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  transactionCard: {
    marginBottom: 12,
    padding: 16,
  },
  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailsContainer: {
    flex: 1,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  type: {
    fontSize: 16,
    fontWeight: '600',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  from: {
    fontSize: 13,
  },
  time: {
    fontSize: 13,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
