/**
 * Notification Service
 * [EYP-M1-NOT-001] Core notification handling with expo-notifications
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationEventType, NotificationPayload } from '../types/notifications';
import {
  shouldSendNotification,
  shouldShowAmounts,
  shouldShowAddresses,
} from './notificationSettingsService';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Notification permissions not granted');
      return false;
    }

    // Android 13+ requires explicit permission
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return true;
  } catch (error) {
    console.error('Failed to request notification permissions:', error);
    return false;
  }
}

/**
 * Check if notifications are permitted by the OS
 */
export async function hasNotificationPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Failed to check notification permissions:', error);
    return false;
  }
}

/**
 * Send a local notification
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  try {
    // Check if we should send this notification
    const shouldSend = await shouldSendNotification(payload.type);
    if (!shouldSend) {
      console.log(`Notification ${payload.type} skipped by settings`);
      return;
    }

    // Check OS permissions
    const hasPermission = await hasNotificationPermissions();
    if (!hasPermission) {
      console.warn('Cannot send notification: no OS permissions');
      return;
    }

    // Send the notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        sound: true,
      },
      trigger: null, // Send immediately
    });

    console.log(`✅ Notification sent: ${payload.type}`);
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

/**
 * Create a transaction received notification
 */
export async function notifyTransactionReceived(
  amount: string,
  from: string,
  hash: string
): Promise<void> {
  const showAmounts = await shouldShowAmounts();
  const showAddresses = await shouldShowAddresses();

  const amountText = showAmounts ? amount : '***';
  const addressText = showAddresses ? `${from.slice(0, 6)}...${from.slice(-4)}` : '***';

  await sendNotification({
    type: NotificationEventType.TRANSACTION_RECEIVED,
    title: 'Incoming Transaction',
    body: showAmounts
      ? `You received ${amountText}`
      : 'You received a transaction',
    data: {
      screen: 'Home',
      amount: showAmounts ? amount : undefined,
      address: showAddresses ? from : undefined,
      hash,
    },
  });
}

/**
 * Create a transaction sent notification
 */
export async function notifyTransactionSent(
  amount: string,
  to: string,
  hash: string
): Promise<void> {
  const showAmounts = await shouldShowAmounts();
  const showAddresses = await shouldShowAddresses();

  const amountText = showAmounts ? amount : '***';
  const addressText = showAddresses ? `${to.slice(0, 6)}...${to.slice(-4)}` : '***';

  await sendNotification({
    type: NotificationEventType.TRANSACTION_SENT,
    title: 'Transaction Sent',
    body: showAmounts
      ? `Sent ${amountText}`
      : 'Your transaction was sent',
    data: {
      screen: 'Home',
      amount: showAmounts ? amount : undefined,
      address: showAddresses ? to : undefined,
      hash,
    },
  });
}

/**
 * Create a transaction confirmed notification
 */
export async function notifyTransactionConfirmed(hash: string): Promise<void> {
  await sendNotification({
    type: NotificationEventType.TRANSACTION_CONFIRMED,
    title: 'Transaction Confirmed',
    body: 'Your transaction has been confirmed on-chain',
    data: {
      screen: 'Home',
      hash,
    },
  });
}

/**
 * Create a pending payment notification
 */
export async function notifyPendingPayment(count: number): Promise<void> {
  await sendNotification({
    type: NotificationEventType.PENDING_PAYMENT,
    title: 'Pending Payments',
    body: `You have ${count} unpaid bill${count === 1 ? '' : 's'}`,
    data: {
      screen: 'PendingPayments',
    },
  });
}

/**
 * Create a scheduled payment due notification
 */
export async function notifyScheduledPaymentDue(
  label: string,
  amount?: string
): Promise<void> {
  const showAmounts = await shouldShowAmounts();

  await sendNotification({
    type: NotificationEventType.SCHEDULED_PAYMENT_DUE,
    title: 'Payment Due',
    body: showAmounts && amount
      ? `"${label}" is due: ${amount}`
      : `"${label}" is due`,
    data: {
      screen: 'SchedulePayment',
      amount: showAmounts ? amount : undefined,
    },
  });
}

/**
 * Create a security alert notification
 */
export async function notifySecurityAlert(message: string): Promise<void> {
  await sendNotification({
    type: NotificationEventType.SECURITY_ALERT,
    title: '🔒 Security Alert',
    body: message,
    data: {
      screen: 'SecuritySettings',
    },
  });
}

/**
 * Cancel all notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All notifications cancelled');
  } catch (error) {
    console.error('Failed to cancel notifications:', error);
  }
}

/**
 * Get notification badge count
 */
export async function getBadgeCount(): Promise<number> {
  try {
    return await Notifications.getBadgeCountAsync();
  } catch (error) {
    console.error('Failed to get badge count:', error);
    return 0;
  }
}

/**
 * Set notification badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('Failed to set badge count:', error);
  }
}

/**
 * Clear badge count
 */
export async function clearBadgeCount(): Promise<void> {
  await setBadgeCount(0);
}
