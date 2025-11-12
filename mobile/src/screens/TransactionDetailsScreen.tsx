import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../navigation/MainNavigator';
import { Transaction } from '../services/blockchain/transactionHistoryService';
import * as Clipboard from 'expo-clipboard';

type Props = NativeStackScreenProps<MainStackParamList, 'TransactionDetails'>;

export default function TransactionDetailsScreen({ navigation, route }: Props) {
  const { transaction } = route.params;

  const formatValue = (value: string) => {
    const num = parseFloat(value);
    return num.toFixed(6);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      console.log(`${label} copied to clipboard`);
    } catch (error) {
      console.warn('Failed to copy:', error);
    }
  };

  const openInExplorer = () => {
    const explorerUrl = `https://sepolia.etherscan.io/tx/${transaction.hash}`;
    Linking.openURL(explorerUrl);
  };

  const isSent = transaction.type === 'sent';
  const isReceived = transaction.type === 'received';
  const isFailed = transaction.status === 'failed';
  const isPending = transaction.status === 'pending';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction Details</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusIcon}>
          {isPending ? '⏳' : isFailed ? '❌' : isSent ? '📤' : '📥'}
        </Text>
        <Text style={styles.statusLabel}>
          {isPending ? 'Pending' : isFailed ? 'Failed' : isSent ? 'Sent' : 'Received'}
        </Text>
        <Text style={[styles.amountText, isSent && styles.sentAmount, isReceived && styles.receivedAmount]}>
          {isSent ? '-' : '+'}{formatValue(transaction.value)} ETH
        </Text>
      </View>

      <View style={styles.detailsCard}>
        <DetailRow label="Status" value={transaction.status} />
        <DetailRow label="Date" value={formatDate(transaction.timestamp)} />
        <DetailRow label="Block" value={transaction.blockNumber.toString()} />

        <View style={styles.divider} />

        <DetailRow
          label="From"
          value={transaction.from}
          copyable
          onCopy={() => handleCopy(transaction.from, 'From address')}
        />

        <DetailRow
          label="To"
          value={transaction.to}
          copyable
          onCopy={() => handleCopy(transaction.to, 'To address')}
        />

        <View style={styles.divider} />

        <DetailRow label="Amount" value={`${formatValue(transaction.value)} ETH`} />

        {transaction.gasUsed && (
          <DetailRow label="Gas Used" value={transaction.gasUsed} />
        )}

        {transaction.gasPrice && (
          <DetailRow label="Gas Price" value={`${transaction.gasPrice} Gwei`} />
        )}

        {transaction.fee && (
          <DetailRow label="Transaction Fee" value={`${parseFloat(transaction.fee).toFixed(6)} ETH`} />
        )}

        <View style={styles.divider} />

        <DetailRow
          label="Transaction Hash"
          value={transaction.hash}
          copyable
          onCopy={() => handleCopy(transaction.hash, 'Transaction hash')}
        />
      </View>

      <TouchableOpacity style={styles.explorerButton} onPress={openInExplorer}>
        <Text style={styles.explorerButtonText}>View on Etherscan 🔗</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: () => void;
}

function DetailRow({ label, value, copyable, onCopy }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <View style={styles.detailValueContainer}>
        <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">
          {value}
        </Text>
        {copyable && onCopy && (
          <TouchableOpacity style={styles.copyButton} onPress={onCopy}>
            <Text style={styles.copyButtonText}>📋</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  amountText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  sentAmount: {
    color: '#FF3B30',
  },
  receivedAmount: {
    color: '#34C759',
  },
  detailsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailRow: {
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailValue: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
    flex: 1,
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: 8,
    marginLeft: 8,
  },
  copyButtonText: {
    fontSize: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 8,
  },
  explorerButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    marginBottom: 40,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  explorerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
