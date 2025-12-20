import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MainStackParamList } from '../navigation/MainNavigator';
import { Transaction } from '../services/blockchain/transactionHistoryService';
import { useTheme } from '../context/ThemeContext';
import * as Clipboard from 'expo-clipboard';

type Props = NativeStackScreenProps<MainStackParamList, 'TransactionDetails'>;

export default function TransactionDetailsScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
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
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Transaction Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.statusCard, { backgroundColor: theme.colors.card }]}>
        <View style={[
          styles.statusIconContainer,
          { backgroundColor: isPending ? `${theme.colors.warning}20` : isFailed ? `${theme.colors.error}20` : isSent ? `${theme.colors.error}20` : `${theme.colors.success}20` }
        ]}>
          <Ionicons
            name={isPending ? 'time' : isFailed ? 'close-circle' : isSent ? 'arrow-up' : 'arrow-down'}
            size={32}
            color={isPending ? theme.colors.warning : isFailed ? theme.colors.error : isSent ? theme.colors.error : theme.colors.success}
          />
        </View>
        <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>
          {isPending ? 'Pending' : isFailed ? 'Failed' : isSent ? 'Sent' : 'Received'}
        </Text>
        <Text style={[
          styles.amountText,
          { color: isSent ? theme.colors.error : theme.colors.success }
        ]}>
          {isSent ? '-' : '+'}{formatValue(transaction.value)} ETH
        </Text>
      </View>

      <View style={[styles.detailsCard, { backgroundColor: theme.colors.card }]}>
        <DetailRow label="Status" value={transaction.status} theme={theme} />
        <DetailRow label="Date" value={formatDate(transaction.timestamp)} theme={theme} />
        <DetailRow label="Block" value={transaction.blockNumber.toString()} theme={theme} />

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        <DetailRow
          label="From"
          value={transaction.from}
          copyable
          onCopy={() => handleCopy(transaction.from, 'From address')}
          theme={theme}
        />

        <DetailRow
          label="To"
          value={transaction.to}
          copyable
          onCopy={() => handleCopy(transaction.to, 'To address')}
          theme={theme}
        />

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        <DetailRow label="Amount" value={`${formatValue(transaction.value)} ETH`} theme={theme} />

        {transaction.gasUsed && (
          <DetailRow label="Gas Used" value={transaction.gasUsed} theme={theme} />
        )}

        {transaction.gasPrice && (
          <DetailRow label="Gas Price" value={`${transaction.gasPrice} Gwei`} theme={theme} />
        )}

        {transaction.fee && (
          <DetailRow label="Transaction Fee" value={`${parseFloat(transaction.fee).toFixed(6)} ETH`} theme={theme} />
        )}

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        <DetailRow
          label="Transaction Hash"
          value={transaction.hash}
          copyable
          onCopy={() => handleCopy(transaction.hash, 'Transaction hash')}
          theme={theme}
        />
      </View>

      <TouchableOpacity style={[styles.explorerButton, { backgroundColor: theme.colors.primary }]} onPress={openInExplorer}>
        <Text style={styles.explorerButtonText}>View on Etherscan</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: () => void;
  theme: any;
}

function DetailRow({ label, value, copyable, onCopy, theme }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <View style={styles.detailValueContainer}>
        <Text style={[styles.detailValue, { color: theme.colors.text }]} numberOfLines={1} ellipsizeMode="middle">
          {value}
        </Text>
        {copyable && onCopy && (
          <TouchableOpacity style={styles.copyButton} onPress={onCopy}>
            <Ionicons name="copy-outline" size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  statusIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  amountText: {
    fontSize: 28,
    fontWeight: '700',
  },
  detailsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
  },
  detailRow: {
    paddingVertical: 10,
  },
  detailLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  copyButton: {
    padding: 8,
    marginLeft: 8,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  explorerButton: {
    marginHorizontal: 16,
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
