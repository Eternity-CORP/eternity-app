/**
 * Transaction History Screen
 * 
 * Unified view of all incoming and outgoing transactions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { useTheme } from '../../context/ThemeContext';
import { useWallet } from '../../context/WalletContext';
import { useTransactionHistory } from '../../hooks/useTransactionHistory';
import Card from '../../components/common/Card';
import { getSelectedNetwork } from '../../services/networkService';
import type { Network } from '../../config/env';
import type { NormalizedTransaction, HistoryFilter } from '../../wallet/history';

type Props = NativeStackScreenProps<MainStackParamList, 'TransactionHistory'>;

export default function HistoryScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { activeAccount } = useWallet();
  const [network, setNetwork] = useState<Network>('sepolia');
  const [showFilters, setShowFilters] = useState(false);

  const address = route.params?.address || activeAccount?.address || '';

  const {
    transactions,
    loading,
    refreshing,
    hasMore,
    filter,
    setFilter,
    loadMore,
    refresh,
  } = useTransactionHistory({
    address,
    network,
    autoLoad: true,
  });

  useEffect(() => {
    const loadNetwork = async () => {
      const net = await getSelectedNetwork();
      setNetwork(net);
    };
    loadNetwork();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return theme.colors.success;
      case 'pending':
        return theme.colors.warning;
      case 'failed':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'checkmark-circle';
      case 'pending':
        return 'time-outline';
      case 'failed':
        return 'close-circle';
      default:
        return 'help-circle-outline';
    }
  };

  const handleTransactionPress = (tx: NormalizedTransaction) => {
    const explorerUrl =
      network === 'mainnet'
        ? `https://etherscan.io/tx/${tx.hash}`
        : network === 'sepolia'
        ? `https://sepolia.etherscan.io/tx/${tx.hash}`
        : `https://holesky.etherscan.io/tx/${tx.hash}`;

    Alert.alert(
      'Transaction Details',
      `Type: ${tx.type}\nDirection: ${tx.direction}\nAmount: ${tx.amount} ${tx.type === 'ETH' ? 'ETH' : tx.token?.symbol}\nStatus: ${tx.status}\n\nHash: ${tx.hash}\n\nView in explorer?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'View',
          onPress: () => console.log('Open:', explorerUrl),
        },
      ]
    );
  };

  const renderTransaction = ({ item }: { item: NormalizedTransaction }) => {
    const isIncoming = item.direction === 'in';
    const symbol = item.type === 'ETH' ? 'ETH' : item.token?.symbol || 'TOKEN';
    const date = new Date(item.timestamp);

    return (
      <TouchableOpacity onPress={() => handleTransactionPress(item)}>
        <Card style={styles.txCard}>
          <View style={styles.txContent}>
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: isIncoming
                    ? theme.colors.success + '20'
                    : theme.colors.primary + '20',
                },
              ]}
            >
              <Ionicons
                name={isIncoming ? 'arrow-down' : 'arrow-up'}
                size={24}
                color={isIncoming ? theme.colors.success : theme.colors.primary}
              />
            </View>

            <View style={styles.details}>
              <View style={styles.row}>
                <Text style={[styles.type, { color: theme.colors.text }]}>
                  {isIncoming ? 'Received' : 'Sent'} {symbol}
                </Text>
                <Text
                  style={[
                    styles.amount,
                    { color: isIncoming ? theme.colors.success : theme.colors.text },
                  ]}
                >
                  {isIncoming ? '+' : '-'}
                  {item.amount}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={[styles.address, { color: theme.colors.textSecondary }]}>
                  {isIncoming ? 'From' : 'To'}: {(isIncoming ? item.from : item.to).slice(0, 6)}...
                  {(isIncoming ? item.from : item.to).slice(-4)}
                </Text>
                <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
                  {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              <View style={styles.row}>
                <View style={styles.statusBadge}>
                  <Ionicons
                    name={getStatusIcon(item.status) as any}
                    size={14}
                    color={getStatusColor(item.status)}
                  />
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {item.status}
                  </Text>
                </View>
                <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
                  {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderFilters = () => {
    if (!showFilters) return null;

    return (
      <View style={[styles.filtersContainer, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.filtersTitle, { color: theme.colors.text }]}>Filters</Text>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor: !filter.direction
                  ? theme.colors.primary
                  : theme.colors.border,
              },
            ]}
            onPress={() => setFilter({ ...filter, direction: undefined })}
          >
            <Text
              style={[
                styles.filterButtonText,
                { color: !filter.direction ? '#FFF' : theme.colors.text },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor:
                  filter.direction === 'in' ? theme.colors.success : theme.colors.border,
              },
            ]}
            onPress={() => setFilter({ ...filter, direction: 'in' })}
          >
            <Text
              style={[
                styles.filterButtonText,
                { color: filter.direction === 'in' ? '#FFF' : theme.colors.text },
              ]}
            >
              Incoming
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor:
                  filter.direction === 'out' ? theme.colors.primary : theme.colors.border,
              },
            ]}
            onPress={() => setFilter({ ...filter, direction: 'out' })}
          >
            <Text
              style={[
                styles.filterButtonText,
                { color: filter.direction === 'out' ? '#FFF' : theme.colors.text },
              ]}
            >
              Outgoing
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="list-outline" size={64} color={theme.colors.border} />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Transactions</Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        Your transaction history will appear here
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;

    return (
      <View style={styles.footer}>
        {loading && <ActivityIndicator size="small" color={theme.colors.primary} />}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>History</Text>
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={styles.filterIcon}>
          <Ionicons
            name={showFilters ? 'close' : 'filter'}
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
      </View>

      {renderFilters()}

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          transactions.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={!loading ? renderEmpty : null}
        ListFooterComponent={renderFooter}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={refresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  filterIcon: {
    padding: 8,
  },
  filtersContainer: {
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 6,
  },
  filtersTitle: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  txCard: {
    marginBottom: 12,
    padding: 16,
  },
  txContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  details: {
    flex: 1,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  type: {
    fontSize: 14,
    fontWeight: '500',
  },
  amount: {
    fontSize: 14,
    fontWeight: '500',
  },
  address: {
    fontSize: 13,
  },
  time: {
    fontSize: 13,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
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
    fontSize: 14,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
