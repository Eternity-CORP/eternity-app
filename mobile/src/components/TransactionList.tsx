import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { ethers } from 'ethers';
import { Transaction, TransactionStatus, TransactionType } from '../services/blockchain/etherscanService';
import Animated, { SlideInRight } from 'react-native-reanimated'

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
        style={styles.transactionItem}
        onPress={() => onTransactionPress?.(item)}
        activeOpacity={0.7}
      >
        <View style={styles.transactionIcon}>
          <Text style={styles.iconText}>
            {isPending ? '⏳' : isFailed ? '❌' : isSent ? '📤' : '📥'}
          </Text>
        </View>

        <View style={styles.transactionInfo}>
          <View style={styles.transactionRow}>
            <Text style={styles.transactionType}>
              {isSent ? 'Sent to' : 'Received from'}
            </Text>
            <Text
              style={[styles.transactionAmount, isSent && styles.sentAmount, isReceived && styles.receivedAmount]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {isSent ? '-' : '+'}{amountLabel}
            </Text>
          </View>

          <View style={styles.transactionRow}>
            <Text style={styles.transactionAddress}>
              {isSent ? truncateAddress(item.to) : truncateAddress(item.from)}
            </Text>
            <Text style={styles.transactionDate}>{formatDate(item.timestamp)}</Text>
          </View>

          {isFailed && (
            <Text style={styles.failedLabel}>Failed</Text>
          )}
          {isPending && (
            <Text style={styles.pendingLabel}>Pending...</Text>
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
  },
  transactionItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 22,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  sentAmount: {
    color: '#FF3B30',
  },
  receivedAmount: {
    color: '#34C759',
  },
  transactionAddress: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'monospace',
  },
  transactionDate: {
    fontSize: 13,
    color: '#999',
  },
  failedLabel: {
    fontSize: 12,
    color: '#FF3B30',
    fontWeight: '600',
    marginTop: 4,
  },
  pendingLabel: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '600',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
