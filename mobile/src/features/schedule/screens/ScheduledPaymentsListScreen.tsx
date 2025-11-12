/**
 * Scheduled Payments List Screen
 * 
 * View and manage scheduled payments
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useScheduledPayments } from '../store/scheduledSlice';
import { getSchedulerManager } from '../SchedulerManager';
import type { ScheduledPayment, PaymentStatus } from '../types';

interface PaymentCardProps {
  payment: ScheduledPayment;
  onPress: () => void;
  onPause: () => void;
  onResume: () => void;
  onDelete: () => void;
}

function PaymentCard({
  payment,
  onPress,
  onPause,
  onResume,
  onDelete,
}: PaymentCardProps) {
  const getStatusColor = (status: PaymentStatus): string => {
    switch (status) {
      case 'scheduled':
        return '#4CAF50';
      case 'running':
        return '#2196F3';
      case 'paused':
        return '#FF9800';
      case 'failed':
        return '#F44336';
      case 'completed':
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = (status: PaymentStatus): string => {
    switch (status) {
      case 'scheduled':
        return '⏰';
      case 'running':
        return '▶️';
      case 'paused':
        return '⏸️';
      case 'failed':
        return '❌';
      case 'completed':
        return '✅';
      default:
        return '❓';
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitle}>
          <Text style={styles.cardIcon}>
            {payment.asset.type === 'ETH' ? '💎' : '🪙'}
          </Text>
          <View>
            <Text style={styles.cardAmount}>
              {payment.amountHuman} {payment.asset.type}
            </Text>
            <Text style={styles.cardRecipient}>
              To: {payment.to.slice(0, 10)}...
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(payment.status) },
          ]}
        >
          <Text style={styles.statusIcon}>{getStatusIcon(payment.status)}</Text>
          <Text style={styles.statusText}>{payment.status}</Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Type:</Text>
          <Text style={styles.detailValue}>
            {payment.kind === 'one_time' ? 'One-Time' : 'Recurring'}
          </Text>
        </View>

        {payment.nextRunAt && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Next Run:</Text>
            <Text style={styles.detailValue}>
              {new Date(payment.nextRunAt).toLocaleString()}
            </Text>
          </View>
        )}

        {payment.lastRunAt && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Last Run:</Text>
            <Text style={styles.detailValue}>
              {new Date(payment.lastRunAt).toLocaleString()}
            </Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Executions:</Text>
          <Text style={styles.detailValue}>
            {payment.runCount} / Failures: {payment.failCount}
          </Text>
        </View>

        {payment.lastError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              Last Error: {payment.lastError}
            </Text>
          </View>
        )}

        {payment.autoPausedAt && (
          <View style={styles.warningBox}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Auto-Paused</Text>
              <Text style={styles.warningText}>
                Payment paused due to {payment.consecutiveInsufficientFunds}{' '}
                consecutive insufficient funds errors.
              </Text>
              <Text style={styles.warningCta}>
                Please add funds and resume manually.
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.cardActions}>
        {payment.status === 'scheduled' && (
          <TouchableOpacity style={styles.actionButton} onPress={onPause}>
            <Text style={styles.actionButtonText}>⏸️ Pause</Text>
          </TouchableOpacity>
        )}

        {payment.status === 'paused' && (
          <TouchableOpacity style={styles.actionButton} onPress={onResume}>
            <Text style={styles.actionButtonText}>▶️ Resume</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonDanger]}
          onPress={onDelete}
        >
          <Text style={styles.actionButtonDangerText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export function ScheduledPaymentsListScreen({ navigation }: any) {
  const payments = useScheduledPayments((state) => state.getAllPayments());
  const pausePayment = useScheduledPayments((state) => state.pausePayment);
  const resumePayment = useScheduledPayments((state) => state.resumePayment);
  const removePayment = useScheduledPayments((state) => state.removePayment);

  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<PaymentStatus | 'all'>('all');

  // Filter payments
  const filteredPayments =
    filter === 'all'
      ? payments
      : payments.filter((p) => p.status === filter);

  // Sort by nextRunAt
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    if (!a.nextRunAt) return 1;
    if (!b.nextRunAt) return -1;
    return a.nextRunAt - b.nextRunAt;
  });

  // Refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Trigger a tick to update statuses
      await getSchedulerManager().tick();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Pause
  const handlePause = (payment: ScheduledPayment) => {
    Alert.alert(
      'Pause Payment',
      `Pause "${payment.amountHuman} ${payment.asset.type}" to ${payment.to.slice(
        0,
        10
      )}...?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pause',
          onPress: () => {
            try {
              pausePayment(payment.id);
              Alert.alert('Success', 'Payment paused');
            } catch (error) {
              Alert.alert('Error', (error as Error).message);
            }
          },
        },
      ]
    );
  };

  // Resume
  const handleResume = (payment: ScheduledPayment) => {
    Alert.alert(
      'Resume Payment',
      `Resume "${payment.amountHuman} ${payment.asset.type}" to ${payment.to.slice(
        0,
        10
      )}...?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resume',
          onPress: () => {
            try {
              resumePayment(payment.id);
              Alert.alert('Success', 'Payment resumed');
            } catch (error) {
              Alert.alert('Error', (error as Error).message);
            }
          },
        },
      ]
    );
  };

  // Delete
  const handleDelete = (payment: ScheduledPayment) => {
    Alert.alert(
      'Delete Payment',
      `Delete "${payment.amountHuman} ${payment.asset.type}" to ${payment.to.slice(
        0,
        10
      )}...?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            try {
              removePayment(payment.id);
              Alert.alert('Success', 'Payment deleted');
            } catch (error) {
              Alert.alert('Error', (error as Error).message);
            }
          },
        },
      ]
    );
  };

  // View details
  const handlePress = (payment: ScheduledPayment) => {
    navigation.navigate('CreateScheduledPayment', {
      paymentId: payment.id,
    });
  };

  return (
    <View style={styles.container}>
      {/* Filter */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'scheduled', 'running', 'paused', 'failed', 'completed'].map(
            (status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  filter === status && styles.filterChipActive,
                ]}
                onPress={() => setFilter(status as any)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filter === status && styles.filterChipTextActive,
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={sortedPayments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PaymentCard
            payment={item}
            onPress={() => handlePress(item)}
            onPause={() => handlePause(item)}
            onResume={() => handleResume(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>No Scheduled Payments</Text>
            <Text style={styles.emptyText}>
              Create your first scheduled payment to get started
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('CreateScheduledPayment')}
            >
              <Text style={styles.emptyButtonText}>Create Payment</Text>
            </TouchableOpacity>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContent}
      />

      {/* FAB */}
      {sortedPayments.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreateScheduledPayment')}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filterBar: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#2196F3',
  },
  filterChipText: {
    fontSize: 13,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  cardAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cardRecipient: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  errorBox: {
    backgroundColor: '#ffebee',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#c62828',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    borderRadius: 6,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    marginBottom: 6,
  },
  warningCta: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  actionButtonDanger: {
    backgroundColor: '#ffebee',
  },
  actionButtonText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  actionButtonDangerText: {
    fontSize: 13,
    color: '#c62828',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },
});
