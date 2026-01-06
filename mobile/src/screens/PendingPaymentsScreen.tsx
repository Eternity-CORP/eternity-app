import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../context/ThemeContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import {
  getPendingPayments,
  getUnpaidPayments,
  markAsIgnored,
  deletePendingPayment,
  PendingPayment,
} from '../services/pendingPaymentsService';

type Props = NativeStackScreenProps<any, 'PendingPayments'>;

export default function PendingPaymentsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending'>('pending');

  useEffect(() => {
    loadPayments();
  }, [filter]);

  const loadPayments = async () => {
    try {
      const data = filter === 'pending' ? await getUnpaidPayments() : await getPendingPayments();
      setPayments(data);
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  };

  const handlePayNow = (payment: PendingPayment) => {
    navigation.navigate('PaySplitBill', {
      to: payment.fromAddress,
      amount: payment.amount,
      total: payment.totalAmount,
      participants: payment.participantsCount.toString(),
    });
  };

  const handleIgnore = (payment: PendingPayment) => {
    Alert.alert('Игнорировать платёж?', 'Вы больше не будете видеть это напоминание', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Игнорировать',
        onPress: async () => {
          try {
            await markAsIgnored(payment.id);
            await loadPayments();
          } catch (error) {
            Alert.alert('Ошибка', 'Не удалось обновить статус');
          }
        },
      },
    ]);
  };

  const handleDelete = (payment: PendingPayment) => {
    Alert.alert('Удалить напоминание?', 'Это действие нельзя отменить', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePendingPayment(payment.id);
            await loadPayments();
          } catch (error) {
            Alert.alert('Ошибка', 'Не удалось удалить');
          }
        },
      },
    ]);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return theme.colors.warning || '#FFA500';
      case 'paid':
        return theme.colors.success || '#4CAF50';
      case 'ignored':
        return theme.colors.textSecondary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Ожидает';
      case 'paid':
        return 'Оплачено';
      case 'ignored':
        return 'Игнорировано';
      default:
        return status;
    }
  };

  const renderPaymentItem = ({ item }: { item: PendingPayment }) => (
    <Card style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentInfo}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) + '20' },
              ]}
            >
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {getStatusText(item.status)}
              </Text>
            </View>
          </View>

          <Text style={[styles.paymentAmount, { color: theme.colors.text }]}>
            {item.amount} ETH
          </Text>

          <View style={styles.detailsRow}>
            <Ionicons name="person-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
              От: {truncateAddress(item.fromAddress)}
            </Text>
          </View>

          {item.participantsCount > 1 && (
            <View style={styles.detailsRow}>
              <Ionicons name="people-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                {item.participantsCount} участников • Общий счёт: {item.totalAmount} ETH
              </Text>
            </View>
          )}

          <Text style={[styles.paymentDate, { color: theme.colors.textSecondary }]}>
            {formatDate(item.receivedAt)}
          </Text>
        </View>
      </View>

      {item.status === 'pending' && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => handlePayNow(item)}
          >
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Оплатить</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border },
            ]}
            onPress={() => handleIgnore(item)}
          >
            <Ionicons name="eye-off-outline" size={18} color={theme.colors.text} />
            <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
              Игнорировать
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status !== 'pending' && (
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
          <Text style={[styles.deleteText, { color: theme.colors.error }]}>Удалить</Text>
        </TouchableOpacity>
      )}
    </Card>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="checkmark-done-circle" size={64} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {filter === 'pending' ? 'Нет ожидающих платежей' : 'История пуста'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Платежи</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'pending' && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => setFilter('pending')}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === 'pending' ? '#FFFFFF' : theme.colors.textSecondary },
            ]}
          >
            Ожидают оплаты
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'all' && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === 'all' ? '#FFFFFF' : theme.colors.textSecondary },
            ]}
          >
            Все
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={payments}
        renderItem={renderPaymentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  paymentCard: {
    marginBottom: 16,
    padding: 16,
  },
  paymentHeader: {
    marginBottom: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  statusRow: {
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: '500',
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  detailText: {
    fontSize: 13,
  },
  paymentDate: {
    fontSize: 12,
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  deleteText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 13,
    marginTop: 16,
    textAlign: 'center',
  },
});
