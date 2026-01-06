import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { ethers } from 'ethers';
import { Transaction, TransactionStatus, TransactionType } from '../services/blockchain/etherscanService';
import Animated, { SlideInRight } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

interface TransactionListProps {
  transactions: Transaction[];
  loading?: boolean;
  onRefresh?: () => void;
  onTransactionPress?: (transaction: Transaction) => void;
}

export default function TransactionList({
  transactions,
  loading = false,
  onRefresh,
  onTransactionPress,
}: TransactionListProps) {
  const { theme } = useTheme();
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatValueEth = (wei: string, decimals = 4) => {
    // lightweight formatter: parse wei string to ETH
    try {
      const eth = Number(wei) / 1e18;
      if (eth === 0) return '0';
      if (eth < 0.0001) return '< 0.0001';
      return eth.toFixed(decimals);
    } catch {
      return '—';
    }
  };

  const truncateAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isSent = item.type === TransactionType.SEND;
    const isReceived = item.type === TransactionType.RECEIVE;
    const isFailed = item.status === TransactionStatus.FAILED;
    const isPending = item.status === TransactionStatus.PENDING;

    const amountLabel = item.token
      ? `${formatTokenAmount(item.value, item.token.decimals)} ${item.token.symbol}`
      : `${formatValueEth(item.value)} ETH`;

    return (
      <TouchableOpacity
        style={[
          styles.transactionItem,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
          }
        ]}
        onPress={() => onTransactionPress?.(item)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.transactionIcon,
          {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.md,
          }
        ]}>
          <Text style={styles.iconText}>
            {isPending ? '⏳' : isFailed ? '❌' : isSent ? '📤' : '📥'}
          </Text>
        </View>

        <View style={styles.transactionInfo}>
          <View style={styles.transactionRow}>
            <Text style={[styles.transactionType, { color: theme.colors.text }]}>
              {isSent ? 'Sent to' : 'Received from'}
            </Text>
            <Text
              style={[
                styles.transactionAmount,
                { color: isSent ? theme.colors.error : theme.colors.success }
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {isSent ? '-' : '+'}{amountLabel}
            </Text>
          </View>

          <View style={styles.transactionRow}>
            <Text style={[styles.transactionAddress, { color: theme.colors.textSecondary }]}>
              {isSent ? truncateAddress(item.to) : truncateAddress(item.from)}
            </Text>
            <Text style={[styles.transactionDate, { color: theme.colors.textSecondary }]}>
              {formatDate(item.timestamp)}
            </Text>
          </View>

          {isFailed && (
            <Text style={[styles.failedLabel, { color: theme.colors.error }]}>Failed</Text>
          )}
          {isPending && (
            <Text style={[styles.pendingLabel, { color: theme.colors.warning }]}>Pending...</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyText}>No transactions yet</Text>
        {onRefresh && (
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.list, styles.listContent]}>
      {transactions.map((tx, index) => (
        <Animated.View key={tx.hash} entering={SlideInRight.duration(300).delay(index * 40)}>
          {renderTransaction({ item: tx })}
        </Animated.View>
      ))}
      {!!onRefresh && (
        <TouchableOpacity style={[styles.refreshButton, { marginTop: 8 }]} onPress={onRefresh}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
    gap: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    padding: 14,
    marginBottom: 8,
    alignItems: 'center',
    // Bittensor style - no shadows
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  transactionType: {
    fontSize: 13,
    fontWeight: '500',
  },
  transactionAmount: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  transactionAddress: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  transactionDate: {
    fontSize: 11,
  },
  failedLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  pendingLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 12,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  refreshButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6, // Bittensor style
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
  const formatTokenAmount = (value: string, decimals: number, fractionDigits = 4) => {
    try {
      const formatted = ethers.utils.formatUnits(value || '0', decimals);
      const num = Number(formatted);
      if (!isFinite(num)) {
        // Fallback: limit raw string length to avoid overflow
        return formatted.slice(0, 12);
      }
      if (num === 0) return '0';
      const threshold = Math.pow(10, -fractionDigits);
      if (num > 0 && num < threshold) return `< ${threshold.toFixed(fractionDigits)}`;
      return num.toLocaleString(undefined, { maximumFractionDigits: fractionDigits });
    } catch {
      return '—';
    }
  };
