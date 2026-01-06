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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useScheduledPayments } from '../features/schedule/store/scheduledSlice';
import { useTheme } from '../context/ThemeContext';
import { MainStackParamList } from '../navigation/MainNavigator';
import Card from './common/Card';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

interface Props {
  showEmpty?: boolean; // Show even when no payments (with add button)
}

export default function ScheduledPaymentsList({ showEmpty = true }: Props) {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
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

  const handleEdit = (payment: any) => {
    // Show alert with options
    Alert.alert(
      'Scheduled Payment',
      `${payment.amountHuman} ${payment.asset.type} → ${payment.to.slice(0, 8)}...`,
      [
        { text: 'Close', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => handleCancel(payment.id)
        },
      ]
    );
  };

  const renderPayment = ({ item }: { item: any }) => {
    const timeLeft = item.scheduleAt - Date.now();
    const isOverdue = timeLeft < 0;

    return (
      <TouchableOpacity 
        onPress={() => handleEdit(item)}
        activeOpacity={0.7}
      >
        <Card style={styles.paymentCard}>
          <View style={styles.paymentHeader}>
            <View style={styles.paymentInfo}>
              <View style={[styles.iconContainer, { backgroundColor: (isOverdue ? theme.colors.error : theme.colors.accent) + '15' }]}>
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
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
      </TouchableOpacity>
    );
  };

  if (payments.length === 0 && !showEmpty) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Card blur style={styles.cardContainer}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.title, { color: theme.colors.text }]}>
              Scheduled Payments
            </Text>
          </View>
          <View style={styles.headerRight}>
            {payments.length > 0 && (
              <View style={[styles.countBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                <Text style={[styles.count, { color: theme.colors.primary }]}>
                  {payments.length}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => navigation.navigate('SchedulePayment')}
              style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            >
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {payments.length === 0 ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('SchedulePayment')}
            style={[styles.emptyState, { borderColor: theme.colors.border }]}
          >
            <Ionicons name="time-outline" size={32} color={theme.colors.muted} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No scheduled payments
            </Text>
            <Text style={[styles.emptyHint, { color: theme.colors.muted }]}>
              Tap to schedule your first payment
            </Text>
          </TouchableOpacity>
        ) : (
          <FlatList
            data={payments}
            renderItem={renderPayment}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    marginHorizontal: 16,
  },
  cardContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  count: {
    fontSize: 14,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyHint: {
    fontSize: 13,
  },
  paymentCard: {
    padding: 16,
    marginBottom: 8,
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
