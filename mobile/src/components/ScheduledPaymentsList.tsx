/**
 * Scheduled Payments List Component
 * 
 * Displays pending scheduled payments with ability to cancel
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useScheduledPayments } from '../features/schedule/store/scheduledSlice';
import { useTheme } from '../context/ThemeContext';
import Card from './common/Card';

export default function ScheduledPaymentsList() {
  const { theme } = useTheme();
  const getAllPayments = useScheduledPayments((state) => state.getAllPayments);
  const removePayment = useScheduledPayments((state) => state.removePayment);
  
  // Get all payments and filter scheduled ones
  const allPayments = getAllPayments();
  const payments = allPayments.filter(p => 
    p.status === 'scheduled'
  );

  const handleCancel = (paymentId: string) => {
    Alert.alert(
      'Отменить платёж?',
      'Вы уверены что хотите отменить этот отложенный платёж?',
      [
        { text: 'Нет', style: 'cancel' },
        {
          text: 'Да, отменить',
          style: 'destructive',
          onPress: () => {
            removePayment(paymentId);
            Alert.alert('Отменено', 'Платёж отменён');
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = timestamp - now.getTime();
    
    // Если меньше часа
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000));
      return `через ${minutes} мин`;
    }
    
    // Если меньше суток
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `через ${hours} ч`;
    }
    
    // Иначе полная дата
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderPayment = ({ item }: { item: any }) => {
    const timeLeft = item.scheduleAt - Date.now();
    const isOverdue = timeLeft < 0;

    return (
      <Card style={styles.paymentCard}>
        <View style={styles.paymentHeader}>
          <View style={styles.paymentInfo}>
            <View style={styles.iconContainer}>
              <Ionicons 
                name="time-outline" 
                size={20} 
                color={isOverdue ? theme.colors.error : theme.colors.accent} 
              />
            </View>
            <View style={styles.paymentDetails}>
              <Text style={[styles.amount, { color: theme.colors.text }]}>
                {item.amountHuman} {item.asset.type}
              </Text>
              <Text style={[styles.recipient, { color: theme.colors.textSecondary }]}>
                → {item.to.slice(0, 6)}...{item.to.slice(-4)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => handleCancel(item.id)}
            style={styles.cancelButton}
          >
            <Ionicons name="close-circle" size={24} color={theme.colors.error} />
          </TouchableOpacity>
        </View>

        <View style={styles.paymentFooter}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: isOverdue ? theme.colors.error + '20' : theme.colors.accent + '20' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: isOverdue ? theme.colors.error : theme.colors.accent }
            ]}>
              {isOverdue ? 'Выполняется...' : formatDate(item.scheduleAt)}
            </Text>
          </View>

          {item.note && (
            <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
              {item.note}
            </Text>
          )}
        </View>
      </Card>
    );
  };

  if (payments.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="time" size={20} color={theme.colors.accent} />
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Отложенные платежи ({payments.length})
        </Text>
      </View>

      <FlatList
        data={payments}
        renderItem={renderPayment}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  paymentCard: {
    marginHorizontal: 16,
    padding: 12,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(100, 100, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentDetails: {
    flex: 1,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  recipient: {
    fontSize: 13,
  },
  cancelButton: {
    padding: 4,
  },
  paymentFooter: {
    marginTop: 8,
    gap: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
