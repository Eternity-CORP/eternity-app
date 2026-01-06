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
import { useFocusEffect } from '@react-navigation/native';

import { useTheme } from '../context/ThemeContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import {
  getScheduledPayments,
  cancelScheduledPayment,
  deleteScheduledPayment,
  executeScheduledPayment,
} from '../services/scheduledPaymentService';
import { ScheduledPayment } from '../types/scheduledPayment.types';

type Props = NativeStackScreenProps<any, 'ScheduledPaymentsList'>;

export default function ScheduledPaymentsListScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const [payments, setPayments] = useState<ScheduledPayment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending'>('pending');

  useFocusEffect(
    React.useCallback(() => {
      loadPayments();
    }, [filter])
  );

  const loadPayments = async () => {
    try {
      const allPayments = await getScheduledPayments();
      const filtered =
        filter === 'pending'
          ? allPayments.filter((p) => p.status === 'pending')
          : allPayments;
      setPayments(filtered);
    } catch (error) {
      console.error('Error loading scheduled payments:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  };

  const handleCancel = (payment: ScheduledPayment) => {
    Alert.alert('Отменить платёж?', 'Платёж не будет отправлен', [
      { text: 'Назад', style: 'cancel' },
      {
        text: 'Отменить',
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelScheduledPayment(payment.id);
            await loadPayments();
          } catch (error) {
            Alert.alert('Ошибка', 'Не удалось отменить платёж');
          }
        },
      },
    ]);
  };

  const handleDelete = (payment: ScheduledPayment) => {
    Alert.alert('Удалить платёж?', 'Это действие нельзя отменить', [
      { text: 'Назад', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteScheduledPayment(payment.id);
            await loadPayments();
          } catch (error) {
            Alert.alert('Ошибка', 'Не удалось удалить платёж');
          }
        },
      },
    ]);
  };

  const handleExecuteNow = (payment: ScheduledPayment) => {
    Alert.alert(
      'Отправить сейчас?',
      `Вы уверены, что хотите отправить ${payment.amount} ETH прямо сейчас?`,
      [
        { text: 'Нет', style: 'cancel' },
        {
          text: 'Да, отправить',
          onPress: async () => {
            try {
              await executeScheduledPayment(payment.id);
              await loadPayments();
              Alert.alert('Успех', 'Платёж отправлен!');
            } catch (error: any) {
              Alert.alert('Ошибка', error.message || 'Не удалось отправить платёж');
            }
          },
        },
      ]
    );
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return theme.colors.warning || '#FFA500';
      case 'completed':
        return theme.colors.success;
      case 'failed':
        return theme.colors.error;
      case 'cancelled':
        return theme.colors.textSecondary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Ожидает';
      case 'completed':
        return 'Выполнен';
      case 'failed':
        return 'Ошибка';
      case 'cancelled':
        return 'Отменён';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return 'time';
      case 'completed':
        return 'checkmark-circle';
      case 'failed':
        return 'close-circle';
      case 'cancelled':
        return 'ban';
      default:
        return 'help-circle';
    }
  };

  const renderPaymentItem = ({ item }: { item: ScheduledPayment }) => {
    const isPending = item.status === 'pending';
    const isPast = item.scheduledFor < Date.now();

    return (
      <Card style={styles.paymentCard}>
        <View style={styles.paymentHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(item.status) + '20' },
                ]}
              >
                <Ionicons
                  name={getStatusIcon(item.status)}
                  size={14}
                  color={getStatusColor(item.status)}
                />
                <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                  {getStatusText(item.status)}
                </Text>
              </View>
            </View>

            <Text style={[styles.paymentAmount, { color: theme.colors.text }]}>
              {item.amount} ETH
            </Text>

            {(item.message || item.emoji) && (
              <Text style={[styles.paymentMessage, { color: theme.colors.textSecondary }]}>
                {item.emoji} {item.message}
              </Text>
            )}

            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={14} color={theme.colors.textSecondary} />
              <Text
                style={[styles.detailText, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                {item.recipientAddress.slice(0, 10)}...{item.recipientAddress.slice(-8)}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                {formatDateTime(item.scheduledFor)}
              </Text>
            </View>

            {isPast && isPending && (
              <View style={[styles.warningBox, { backgroundColor: theme.colors.error + '10' }]}>
                <Ionicons name="alert-circle" size={14} color={theme.colors.error} />
                <Text style={[styles.warningText, { color: theme.colors.error }]}>
                  Время истекло - отправьте вручную
                </Text>
              </View>
            )}

            {item.txHash && (
              <View style={styles.detailRow}>
                <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
                <Text
                  style={[styles.detailText, { color: theme.colors.success }]}
                  numberOfLines={1}
                >
                  Tx: {item.txHash.slice(0, 10)}...
                </Text>
              </View>
            )}

            {item.errorMessage && (
              <Text style={[styles.errorMessage, { color: theme.colors.error }]}>
                {item.errorMessage}
              </Text>
            )}
          </View>
        </View>

        {isPending && (
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.success, flex: 1 },
              ]}
              onPress={() => handleExecuteNow(item)}
            >
              <Ionicons name="send" size={16} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Отправить сейчас</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: theme.colors.background,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  flex: 1,
                },
              ]}
              onPress={() => handleCancel(item)}
            >
              <Ionicons name="close" size={16} color={theme.colors.text} />
              <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
                Отменить
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!isPending && (
          <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
            <Text style={[styles.deleteText, { color: theme.colors.error }]}>Удалить</Text>
          </TouchableOpacity>
        )}
      </Card>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="time-outline" size={64} color={theme.colors.textSecondary} />
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        {filter === 'pending' ? 'Нет запланированных платежей' : 'История пуста'}
      </Text>
      <Button
        variant="primary"
        onPress={() => navigation.navigate('SchedulePayment')}
        style={styles.createButton}
      >
        ⏰ Запланировать платёж
      </Button>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.text }]}>Запланированные</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SchedulePayment')}>
          <Ionicons name="add-circle" size={28} color={theme.colors.accent} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'pending' && { backgroundColor: theme.colors.accent },
          ]}
          onPress={() => setFilter('pending')}
        >
          <Text
            style={[
              styles.filterText,
              { color: filter === 'pending' ? '#FFFFFF' : theme.colors.textSecondary },
            ]}
          >
            Ожидают
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'all' && { backgroundColor: theme.colors.accent },
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
    flexDirection: 'row',
    marginBottom: 12,
  },
  statusRow: {
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
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
    marginBottom: 6,
  },
  paymentMessage: {
    fontSize: 15,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorMessage: {
    fontSize: 12,
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
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
    marginBottom: 24,
    textAlign: 'center',
  },
  createButton: {
    paddingHorizontal: 32,
  },
});
