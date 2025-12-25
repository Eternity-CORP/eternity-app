import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../../context/ThemeContext';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { getTransactionHistory, Transaction, TransactionType, TransactionStatus } from '../../services/blockchain/etherscanService';
import { useNetwork } from '../../hooks/useNetwork';
import Card from '../../components/common/Card';

// Item model for FlatList with headers
type Row = { kind: 'header'; dateLabel: string } | { kind: 'item'; tx: Transaction };

type Props = NativeStackScreenProps<MainStackParamList, 'TransactionHistory'>;

export default function TransactionHistoryScreen({ route, navigation }: Props) {
  const { theme } = useTheme();
  const { address } = route.params;
  const { network: currentNetwork, loading: networkLoading } = useNetwork();
  const [page, setPage] = useState(1);
  const [offset] = useState(25); // page size
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const fetchingMore = useRef(false);
  const hasMore = useRef(true);

  const fetchPage = useCallback(async (pageToFetch: number, force = false) => {
    if (!address || networkLoading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getTransactionHistory(address, { network: currentNetwork, page: pageToFetch, offset, forceRefresh: force });
      
      // Check if we got fewer results than requested (no more pages)
      if (res.length < offset) {
        hasMore.current = false;
      }
      
      // Merge and dedupe by hash
      setTransactions((prev) => {
        if (pageToFetch === 1 || force) {
          // Replace all for first page or refresh
          return res.sort((a, b) => b.timestamp - a.timestamp);
        }
        // Append for subsequent pages
        const map = new Map<string, Transaction>();
        for (const t of [...prev, ...res]) {
          map.set(t.hash + ':' + t.timestamp, t);
        }
        return Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [address, offset, currentNetwork, networkLoading]);

  useEffect(() => {
    setTransactions([]);
    setPage(1);
    hasMore.current = true;
    if (!networkLoading) {
      fetchPage(1);
    }
  }, [address, currentNetwork, networkLoading, fetchPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPage(1, true);
    setPage(1);
    setRefreshing(false);
  }, [fetchPage]);

  const onEndReached = useCallback(async () => {
    if (fetchingMore.current || loading || !hasMore.current) return;
    fetchingMore.current = true;
    const next = page + 1;
    await fetchPage(next);
    setPage(next);
    fetchingMore.current = false;
  }, [page, loading, fetchPage]);

  const formatAmount = useCallback((tx: Transaction) => {
    // For ETH, tx.token undefined, value is wei; for tokens, value is base units
    if (!tx.token) {
      // Display ETH
      try {
        const eth = Number(tx.value) / 1e18;
        return `${eth.toFixed(6)} ETH`;
      } catch {
        return `ETH`;
      }
    }
    // Token transfer
    try {
      const base = BigInt(tx.value || '0');
      const divisor = 10 ** tx.token.decimals;
      const num = Number(base) / divisor;
      return `${num.toFixed(6)} ${tx.token.symbol}`;
    } catch {
      return `${tx.token.symbol}`;
    }
  }, []);

  const truncate = useCallback((addr?: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }, []);

  const relTime = useCallback((ts: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.max(0, now - ts);
    const mins = Math.floor(diff / 60);
    const hours = Math.floor(diff / 3600);
    const days = Math.floor(diff / 86400);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    const d = new Date(ts * 1000);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const groupByDate = useMemo(() => {
    const items: Row[] = [];
    let lastLabel = '';
    for (const tx of transactions) {
      const d = new Date(tx.timestamp * 1000);
      const label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      if (label !== lastLabel) {
        items.push({ kind: 'header', dateLabel: label });
        lastLabel = label;
      }
      items.push({ kind: 'item', tx });
    }
    return items;
  }, [transactions]);

  const handleTransactionPress = useCallback((tx: Transaction) => {
    navigation.navigate('TransactionDetails', { transaction: tx });
  }, [navigation]);

  const renderItem = useCallback(({ item }: { item: Row }) => {
    if (item.kind === 'header') {
      return (
        <Text style={[styles.sectionHeader, { color: theme.colors.textSecondary }]}>
          {item.dateLabel}
        </Text>
      );
    }
    const tx = item.tx;
    const isSend = tx.type === TransactionType.SEND;
    const statusLabel = tx.status === TransactionStatus.PENDING ? 'Pending' : tx.status === TransactionStatus.FAILED ? 'Failed' : 'Confirmed';
    
    return (
      <TouchableOpacity
        style={[
          styles.row,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.md,
          }
        ]}
        onPress={() => handleTransactionPress(tx)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.iconCircle,
          {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.md,
          }
        ]}>
          <Text style={styles.icon}>
            {tx.status === TransactionStatus.PENDING ? '⏳' : tx.status === TransactionStatus.FAILED ? '❌' : isSend ? '📤' : '📥'}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.rowTop}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {isSend ? 'Sent to' : 'Received from'}
            </Text>
            <Text style={[styles.amount, isSend ? styles.amountSent : styles.amountReceived]}>
              {formatAmount(tx)}
            </Text>
          </View>
          <View style={styles.rowBottom}>
            <Text style={[styles.address, { color: theme.colors.textSecondary }]}>
              {isSend ? truncate(tx.to) : truncate(tx.from)}
            </Text>
            <Text style={[styles.subtle, { color: theme.colors.textSecondary }]}>
              {relTime(tx.timestamp)} · {statusLabel}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [formatAmount, relTime, truncate, theme, handleTransactionPress]);

  const keyExtractor = useCallback((item: Row, index: number) => item.kind === 'header' ? `h-${item.dateLabel}-${index}` : item.tx.hash + ':' + item.tx.timestamp, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: theme.colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Transaction History</Text>
        <Text style={[styles.headerSub, { color: theme.colors.textSecondary }]}>{truncate(address)}</Text>
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>
        </View>
      )}
      
      <FlatList
        data={groupByDate}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
        onEndReachedThreshold={0.5}
        onEndReached={onEndReached}
        ListFooterComponent={
          loading && transactions.length > 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.loading, { color: theme.colors.textSecondary }]}>Loading more...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading && transactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyIcon, { color: theme.colors.textSecondary }]}>📭</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No transactions found</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 4,
  },
  errorContainer: {
    padding: 16,
  },
  error: {
    textAlign: 'center',
    fontSize: 14,
  },
  listContent: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    padding: 16, // More padding
    alignItems: 'center',
    marginBottom: 8,
    // Soft shadow
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconCircle: {
    width: 48, // Slightly larger
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14, // More spacing
  },
  icon: {
    fontSize: 20,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
  amountSent: {
    color: '#FF3B30',
  },
  amountReceived: {
    color: '#34C759',
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  address: {
    fontSize: 13,
  },
  subtle: {
    fontSize: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loading: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
  },
});
