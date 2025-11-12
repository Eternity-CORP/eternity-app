/**
 * Incoming Transactions Screen
 * 
 * Shows all incoming ETH and ERC-20 transactions
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MainStackParamList } from '../navigation/MainNavigator';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import { useIncomingTransactions } from '../hooks/useIncomingTransactions';
import IncomingTransactionsList from '../components/incoming/IncomingTransactionsList';
import IncomingTransactionBanner from '../components/incoming/IncomingTransactionBanner';
import { getSelectedNetwork } from '../services/networkService';
import type { Network } from '../config/env';

type Props = NativeStackScreenProps<MainStackParamList, 'IncomingTransactions'>;

export default function IncomingTransactionsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { activeAccount } = useWallet();
  const {
    transactions,
    newTransaction,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearNewTransaction,
  } = useIncomingTransactions();

  const [network, setNetwork] = React.useState<Network>('sepolia');

  // Load network and start monitoring
  useEffect(() => {
    const init = async () => {
      if (!activeAccount?.address) return;

      const selectedNetwork = await getSelectedNetwork();
      setNetwork(selectedNetwork);

      // Start monitoring
      await startMonitoring({
        address: activeAccount.address,
        network: selectedNetwork,
        pollInterval: 12000, // 12 seconds
        confirmationsRequired: 2,
        lookbackBlocks: 100,
      });
    };

    init();

    return () => {
      stopMonitoring();
    };
  }, [activeAccount?.address]);

  const handleTransactionPress = (tx: any) => {
    const explorerUrl =
      network === 'mainnet'
        ? `https://etherscan.io/tx/${tx.txHash}`
        : network === 'sepolia'
        ? `https://sepolia.etherscan.io/tx/${tx.txHash}`
        : `https://holesky.etherscan.io/tx/${tx.txHash}`;

    Alert.alert(
      'Transaction Details',
      `Hash: ${tx.txHash}\n\nView in Etherscan?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'View',
          onPress: () => {
            console.log('Open explorer:', explorerUrl);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Incoming</Text>
        <View style={styles.statusContainer}>
          {isMonitoring && (
            <View style={styles.monitoringBadge}>
              <View style={[styles.dot, { backgroundColor: theme.colors.success }]} />
              <Text style={[styles.monitoringText, { color: theme.colors.success }]}>
                Live
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {transactions.length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Total
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.statValue, { color: theme.colors.warning }]}>
            {transactions.filter(tx => !tx.isStable).length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Pending
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.statValue, { color: theme.colors.success }]}>
            {transactions.filter(tx => tx.isStable).length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Confirmed
          </Text>
        </View>
      </View>

      {/* List */}
      <IncomingTransactionsList
        transactions={transactions}
        onTransactionPress={handleTransactionPress}
      />

      {/* Banner */}
      <IncomingTransactionBanner
        transaction={newTransaction}
        onDismiss={clearNewTransaction}
        onPress={() => {
          if (newTransaction) {
            handleTransactionPress(newTransaction);
          }
        }}
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusContainer: {
    width: 80,
    alignItems: 'flex-end',
  },
  monitoringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  monitoringText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
});
