import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { ScheduledPayment } from '../types/scheduledPayment.types';
import { sendETH } from './blockchain/transactionService';
import { defaultNetwork } from '../constants/rpcUrls';

const SCHEDULED_PAYMENTS_KEY = '@scheduled_payments';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Generate unique ID for scheduled payment
 */
export function generateScheduledPaymentId(): string {
  return `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Save a new scheduled payment
 */
export async function saveScheduledPayment(payment: ScheduledPayment): Promise<void> {
  try {
    const payments = await getScheduledPayments();

    // Add or update
    const existingIndex = payments.findIndex(p => p.id === payment.id);
    if (existingIndex >= 0) {
      payments[existingIndex] = payment;
    } else {
      payments.unshift(payment);
    }

    await AsyncStorage.setItem(SCHEDULED_PAYMENTS_KEY, JSON.stringify(payments));

    // Schedule notification
    if (payment.status === 'pending') {
      await scheduleNotification(payment);
    }
  } catch (error) {
    console.error('Error saving scheduled payment:', error);
    throw error;
  }
}

/**
 * Get all scheduled payments
 */
export async function getScheduledPayments(): Promise<ScheduledPayment[]> {
  try {
    const data = await AsyncStorage.getItem(SCHEDULED_PAYMENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading scheduled payments:', error);
    return [];
  }
}

/**
 * Get pending scheduled payments
 */
export async function getPendingScheduledPayments(): Promise<ScheduledPayment[]> {
  const payments = await getScheduledPayments();
  return payments.filter(p => p.status === 'pending');
}

/**
 * Get a specific scheduled payment by ID
 */
export async function getScheduledPaymentById(id: string): Promise<ScheduledPayment | null> {
  try {
    const payments = await getScheduledPayments();
    return payments.find(p => p.id === id) || null;
  } catch (error) {
    console.error('Error loading scheduled payment:', error);
    return null;
  }
}

/**
 * Cancel a scheduled payment
 */
export async function cancelScheduledPayment(id: string): Promise<void> {
  try {
    const payments = await getScheduledPayments();
    const payment = payments.find(p => p.id === id);

    if (payment) {
      payment.status = 'cancelled';

      // Cancel notification
      if (payment.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(payment.notificationId);
      }

      await AsyncStorage.setItem(SCHEDULED_PAYMENTS_KEY, JSON.stringify(payments));
    }
  } catch (error) {
    console.error('Error cancelling scheduled payment:', error);
    throw error;
  }
}

/**
 * Delete a scheduled payment
 */
export async function deleteScheduledPayment(id: string): Promise<void> {
  try {
    const payments = await getScheduledPayments();
    const payment = payments.find(p => p.id === id);

    // Cancel notification if exists
    if (payment?.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(payment.notificationId);
    }

    const filtered = payments.filter(p => p.id !== id);
    await AsyncStorage.setItem(SCHEDULED_PAYMENTS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting scheduled payment:', error);
    throw error;
  }
}

/**
 * Execute a scheduled payment
 */
export async function executeScheduledPayment(paymentId: string): Promise<void> {
  try {
    const payment = await getScheduledPaymentById(paymentId);
    if (!payment || payment.status !== 'pending') {
      return;
    }

    // Update status to executing
    payment.status = 'pending'; // Keep pending during execution

    try {
      // Send the transaction
      const { txHash } = await sendETH(
        payment.recipientAddress,
        payment.amount,
        defaultNetwork
      );

      // Update payment as completed
      payment.status = 'completed';
      payment.executedAt = Date.now();
      payment.txHash = txHash;

      // Show success notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Payment Sent!',
          body: `${payment.emoji || '💸'} Sent ${payment.amount} ETH${
            payment.message ? ` - ${payment.message}` : ''
          }`,
          data: { paymentId: payment.id, txHash },
        },
        trigger: null, // Show immediately
      });
    } catch (error: any) {
      // Mark as failed
      payment.status = 'failed';
      payment.executedAt = Date.now();
      payment.errorMessage = error.message || 'Transaction failed';

      // Show error notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '❌ Payment Failed',
          body: `Failed to send ${payment.amount} ETH: ${error.message}`,
          data: { paymentId: payment.id },
        },
        trigger: null,
      });
    }

    // Save updated payment
    await saveScheduledPayment(payment);
  } catch (error) {
    console.error('Error executing scheduled payment:', error);
    throw error;
  }
}

/**
 * Schedule a notification for payment
 */
async function scheduleNotification(payment: ScheduledPayment): Promise<void> {
  try {
    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    // Calculate trigger time
    const triggerDate = new Date(payment.scheduledFor);

    // Schedule notification
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Scheduled Payment',
        body: `Time to send ${payment.amount} ETH${
          payment.message ? ` - ${payment.message}` : ''
        }`,
        data: { paymentId: payment.id, action: 'execute' },
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    });

    // Save notification ID
    payment.notificationId = notificationId;
    await saveScheduledPayment(payment);
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
}

/**
 * Check and execute any pending payments that are due
 */
export async function checkAndExecutePendingPayments(): Promise<void> {
  try {
    const pendingPayments = await getPendingScheduledPayments();
    const now = Date.now();

    for (const payment of pendingPayments) {
      // Check if payment is due (within 1 minute window)
      if (payment.scheduledFor <= now) {
        console.log('Executing scheduled payment:', payment.id);
        await executeScheduledPayment(payment.id);
      }
    }
  } catch (error) {
    console.error('Error checking pending payments:', error);
  }
}

/**
 * Get count of pending scheduled payments
 */
export async function getPendingScheduledPaymentsCount(): Promise<number> {
  const pending = await getPendingScheduledPayments();
  return pending.length;
}

/**
 * Create a new scheduled payment
 */
export function createScheduledPayment(
  recipientAddress: string,
  amount: string,
  scheduledFor: Date,
  message?: string,
  emoji?: string
): ScheduledPayment {
  return {
    id: generateScheduledPaymentId(),
    recipientAddress,
    amount,
    currency: 'ETH',
    message,
    emoji,
    scheduledFor: scheduledFor.getTime(),
    status: 'pending',
    createdAt: Date.now(),
  };
}
