/**
 * TransactionDetailsScreen
 * 
 * Displays detailed information about a transaction
 * Supports ETH and token transfers
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ethers } from 'ethers';
import { MainStackParamList } from '../navigation/MainNavigator';
import { Transaction, TransactionType, TransactionStatus } from '../services/blockchain/etherscanService';
import { useTheme } from '../context/ThemeContext';
import { useNetwork } from '../hooks/useNetwork';
import { getExplorerUrl } from '../constants/etherscanApi';
import * as Clipboard from 'expo-clipboard';
import Card from '../components/common/Card';

type Props = NativeStackScreenProps<MainStackParamList, 'TransactionDetails'>;

export default function TransactionDetailsScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { transaction } = route.params;
  const { network: currentNetwork } = useNetwork();

  const isSent = transaction.type === TransactionType.SEND;
  const isReceived = transaction.type === TransactionType.RECEIVE;
  const isFailed = transaction.status === TransactionStatus.FAILED;
  const isPending = transaction.status === TransactionStatus.PENDING;
  const isConfirmed = transaction.status === TransactionStatus.CONFIRMED;

  // Format transaction value
  const formattedValue = useMemo(() => {
    if (!transaction.token) {
      // ETH transfer - value is in wei
      try {
        const wei = BigInt(transaction.value);
        const eth = Number(wei) / 1e18;
        return { amount: eth.toFixed(6), symbol: 'ETH', display: `${eth.toFixed(6)} ETH` };
      } catch {
        return { amount: '0', symbol: 'ETH', display: '0 ETH' };
      }
    } else {
      // Token transfer
      try {
        const base = BigInt(transaction.value || '0');
        const divisor = 10 ** transaction.token.decimals;
        const num = Number(base) / divisor;
        return {
          amount: num.toFixed(6),
          symbol: transaction.token.symbol,
          display: `${num.toFixed(6)} ${transaction.token.symbol}`,
        };
      } catch {
        return { amount: '0', symbol: transaction.token.symbol, display: `0 ${transaction.token.symbol}` };
      }
    }
  }, [transaction]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = Math.max(0, now - timestamp);
    const mins = Math.floor(diff / 60);
    const hours = Math.floor(diff / 3600);
    const days = Math.floor(diff / 86400);
    
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return formatDate(timestamp);
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', `${label} copied to clipboard`);
    } catch (error) {
      console.warn('Failed to copy:', error);
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const openInExplorer = () => {
    const explorerUrl = `${getExplorerUrl(currentNetwork)}/tx/${transaction.hash}`;
    Linking.openURL(explorerUrl);
  };

  const getStatusColor = () => {
    if (isPending) return theme.colors.warning;
    if (isFailed) return theme.colors.error;
    return theme.colors.success;
  };

  const getStatusIcon = () => {
    if (isPending) return 'time-outline';
    if (isFailed) return 'close-circle';
    if (isSent) return 'arrow-up-circle';
    return 'arrow-down-circle';
  };

  const getStatusLabel = () => {
    if (isPending) return 'Pending';
    if (isFailed) return 'Failed';
    if (isConfirmed) return 'Confirmed';
    return 'Unknown';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: theme.colors.background }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Transaction Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Status Card */}
        <Card style={styles.statusCard} blur>
          <View style={[
            styles.statusIconContainer,
            { 
              backgroundColor: getStatusColor() + '20',
              borderRadius: theme.radius.xl,
            }
          ]}>
            <Ionicons
              name={getStatusIcon() as any}
              size={52}
              color={getStatusColor()}
            />
          </View>
          <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>
            {getStatusLabel()}
          </Text>
          <Text style={[
            styles.amountText,
            { color: isSent ? theme.colors.error : theme.colors.success }
          ]}>
            {isSent ? '-' : '+'}{formattedValue.display}
          </Text>
          <Text style={[styles.relativeTime, { color: theme.colors.textSecondary }]}>
            {formatRelativeTime(transaction.timestamp)}
          </Text>
        </Card>

        {/* Details Card */}
        <Card style={styles.detailsCard} blur>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Transaction Information</Text>

          <DetailRow
            label="Type"
            value={isSent ? 'Sent' : 'Received'}
            theme={theme}
          />

          <DetailRow
            label="Status"
            value={getStatusLabel()}
            valueColor={getStatusColor()}
            theme={theme}
          />

          <DetailRow
            label="Date"
            value={formatDate(transaction.timestamp)}
            theme={theme}
          />

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

          <DetailRow
            label="Amount"
            value={formattedValue.display}
            theme={theme}
          />

          {transaction.token && (
            <DetailRow
              label="Token"
              value={`${transaction.token.symbol} (${transaction.token.decimals} decimals)`}
              theme={theme}
            />
          )}

          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

          <DetailRow
            label="Transaction Hash"
            value={transaction.hash}
            copyable
            onCopy={() => handleCopy(transaction.hash, 'Transaction hash')}
            theme={theme}
          />

          <DetailRow
            label="Network"
            value={currentNetwork.charAt(0).toUpperCase() + currentNetwork.slice(1)}
            theme={theme}
          />
        </Card>

        {/* Explorer Button */}
        <TouchableOpacity
          style={[
            styles.explorerButton,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.lg,
            }
          ]}
          onPress={openInExplorer}
          activeOpacity={0.8}
        >
          <Ionicons name="open-outline" size={20} color="#FFFFFF" />
          <Text style={styles.explorerButtonText}>View on Explorer</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: () => void;
  valueColor?: string;
  theme: any;
}

function DetailRow({ label, value, copyable, onCopy, valueColor, theme }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <View style={styles.detailValueContainer}>
        <Text
          style={[
            styles.detailValue,
            { color: valueColor || theme.colors.text }
          ]}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  statusCard: {
    margin: 16,
    padding: 28, // More padding for airy feel
    alignItems: 'center',
  },
  statusIconContainer: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  amountText: {
    fontSize: 28,
    fontWeight: '500',
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  relativeTime: {
    fontSize: 14,
  },
  detailsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 24, // More padding
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    fontFamily: 'monospace',
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
    marginBottom: 16,
    padding: 14,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  explorerButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  spacer: {
    height: 20,
  },
});
