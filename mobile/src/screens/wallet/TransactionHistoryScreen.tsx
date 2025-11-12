import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { getTransactionHistory, Transaction, TransactionType, TransactionStatus } from '../../services/blockchain/etherscanService';
import { defaultNetwork } from '../../constants/rpcUrls';
import { getExplorerUrl } from '../../constants/etherscanApi';

// Item model for FlatList with headers
type Row = { kind: 'header'; dateLabel: string } | { kind: 'item'; tx: Transaction };

type Props = NativeStackScreenProps<MainStackParamList, 'TransactionHistory'>;

export default function TransactionHistoryScreen({ route }: Props) {
  const { address } = route.params;
  const [page, setPage] = useState(1);
  const [offset] = useState(25); // page size
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const fetchingMore = useRef(false);

  const fetchPage = useCallback(async (pageToFetch: number, force = false) => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getTransactionHistory(address, { network: defaultNetwork, page: pageToFetch, offset, forceRefresh: force });
      // Merge and dedupe by hash
      setTransactions((prev) => {
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
  }, [address, offset]);

  useEffect(() => {
    setTransactions([]);
    setPage(1);
    fetchPage(1);
  }, [address, fetchPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPage(1, true);
    setPage(1);
    setRefreshing(false);
  }, [fetchPage]);

  const onEndReached = useCallback(async () => {
    if (fetchingMore.current || loading) return;
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

  const renderItem = useCallback(({ item }: { item: Row }) => {
    if (item.kind === 'header') {
      return <Text style={styles.sectionHeader}>{item.dateLabel}</Text>;
    }
    const tx = item.tx;
    const isSend = tx.type === TransactionType.SEND;
    const statusLabel = tx.status === TransactionStatus.PENDING ? 'Pending' : tx.status === TransactionStatus.FAILED ? 'Failed' : 'Confirmed';
    return (
      <TouchableOpacity style={styles.row} onPress={() => {
        const url = `${getExplorerUrl(defaultNetwork)}/tx/${tx.hash}`;
        Linking.openURL(url);
      }}>
        <View style={styles.iconCircle}><Text style={styles.icon}>{tx.status === TransactionStatus.PENDING ? '⏳' : tx.status === TransactionStatus.FAILED ? '❌' : isSend ? '📤' : '📥'}</Text></View>
        <View style={{ flex: 1 }}>
          <View style={styles.rowTop}>
            <Text style={styles.title}>{isSend ? 'Sent to' : 'Received from'}</Text>
            <Text style={[styles.amount, isSend ? styles.amountSent : styles.amountReceived]}>{formatAmount(tx)}</Text>
          </View>
          <View style={styles.rowBottom}>
            <Text style={styles.address}>{isSend ? truncate(tx.to) : truncate(tx.from)}</Text>
            <Text style={styles.subtle}>{relTime(tx.timestamp)} · {statusLabel}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [formatAmount, relTime, truncate]);

  const keyExtractor = useCallback((item: Row, index: number) => item.kind === 'header' ? `h-${item.dateLabel}-${index}` : item.tx.hash + ':' + item.tx.timestamp, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Transaction History</Text>
        <Text style={styles.headerSub}>{truncate(address)}</Text>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={groupByDate}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.5}
        onEndReached={onEndReached}
        ListFooterComponent={loading ? <Text style={styles.loading}>Loading…</Text> : null}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff' },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSub: { fontSize: 12, color: '#666', marginTop: 4 },
  listContent: { padding: 16 },
  sectionHeader: { fontSize: 14, color: '#999', marginTop: 16, marginBottom: 8 },
  row: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 8 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f2f2f2', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  icon: { fontSize: 20 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '600' },
  amount: { fontSize: 15, fontWeight: '700' },
  amountSent: { color: '#FF3B30' },
  amountReceived: { color: '#34C759' },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  address: { fontSize: 13, color: '#666' },
  subtle: { fontSize: 12, color: '#999' },
  loading: { textAlign: 'center', color: '#666', paddingVertical: 12 },
  error: { color: '#FF3B30', textAlign: 'center', padding: 8 },
});
