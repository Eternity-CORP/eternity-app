/**
 * Push Notification Service
 * Handles local and remote push notifications via expo-notifications
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiClient } from './api-client';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  type: 'blik_matched' | 'blik_confirmed' | 'split_request' | 'split_paid' | 'split_complete' | 'payment_reminder' | 'transaction_received' | 'general';
  splitId?: string;
  paymentId?: string;
  blikCode?: string;
  transactionHash?: string;
  fromAddress?: string;
  amount?: string;
  token?: string;
  [key: string]: string | undefined;
}

// Store for push token
let expoPushToken: string | null = null;

/**
 * Check if notifications are available on this device
 */
export async function isNotificationsAvailable(): Promise<boolean> {
  return Device.isDevice;
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission not granted');
    return false;
  }

  // Setup Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5E6AD2',
    });

    await Notifications.setNotificationChannelAsync('blik', {
      name: 'BLIK Transfers',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
      description: 'Notifications for BLIK code matches and transfers',
    });

    await Notifications.setNotificationChannelAsync('payments', {
      name: 'Payments',
      importance: Notifications.AndroidImportance.HIGH,
      description: 'Split bills, scheduled payments, and transaction notifications',
    });
  }

  return true;
}

/**
 * Get or register the Expo push token
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (expoPushToken) {
    return expoPushToken;
  }

  if (!Device.isDevice) {
    console.warn('Push tokens require a physical device');
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn('No EAS project ID found');
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    expoPushToken = token;
    return token;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

/**
 * Register push token with backend
 */
export async function registerPushToken(walletAddress: string): Promise<boolean> {
  try {
    const token = await getExpoPushToken();
    if (!token) {
      return false;
    }

    await apiClient.post('/notifications/register', {
      walletAddress,
      pushToken: token,
      platform: Platform.OS,
      deviceName: Device.deviceName || 'Unknown',
    });

    console.log('Push token registered with backend');
    return true;
  } catch (error) {
    console.error('Failed to register push token:', error);
    return false;
  }
}

/**
 * Unregister push token from backend
 */
export async function unregisterPushToken(walletAddress: string): Promise<void> {
  try {
    const token = await getExpoPushToken();
    if (token) {
      await apiClient.post('/notifications/unregister', { walletAddress, pushToken: token });
    }
  } catch (error) {
    console.error('Failed to unregister push token:', error);
  }
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(options: {
  title: string;
  body: string;
  data?: NotificationData;
  triggerDate?: Date;
  channelId?: string;
}): Promise<string | null> {
  try {
    // For scheduled notifications, use timestamp in seconds from now
    const trigger: Notifications.NotificationTriggerInput = options.triggerDate
      ? {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(1, Math.floor((options.triggerDate.getTime() - Date.now()) / 1000)),
          repeats: false,
        }
      : null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: options.title,
        body: options.body,
        data: options.data as Record<string, unknown>,
        sound: true,
        ...(Platform.OS === 'android' && options.channelId
          ? { channelId: options.channelId }
          : {}),
      },
      trigger,
    });

    return id;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
}

/**
 * Send immediate notification
 */
export async function sendImmediateNotification(options: {
  title: string;
  body: string;
  data?: NotificationData;
  channelId?: string;
}): Promise<string | null> {
  return scheduleLocalNotification({
    ...options,
    triggerDate: undefined,
  });
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Get the last notification response (when app opened via notification)
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return Notifications.getLastNotificationResponseAsync();
}

/**
 * Set badge count (iOS only)
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener (when user taps notification)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// ============================================
// Convenience functions for specific notifications
// ============================================

/**
 * Send BLIK matched notification
 */
export async function sendBlikMatchedNotification(options: {
  code: string;
  receiverAddress: string;
  amount: string;
  token: string;
}): Promise<string | null> {
  return sendImmediateNotification({
    title: 'BLIK Code Matched!',
    body: `Someone entered your code ${options.code}. Confirm to send ${options.amount} ${options.token}`,
    data: {
      type: 'blik_matched',
      blikCode: options.code,
      fromAddress: options.receiverAddress,
      amount: options.amount,
      token: options.token,
    },
    channelId: 'blik',
  });
}

/**
 * Send BLIK confirmed notification (for receiver)
 */
export async function sendBlikConfirmedNotification(options: {
  amount: string;
  token: string;
  fromAddress: string;
}): Promise<string | null> {
  return sendImmediateNotification({
    title: 'Payment Received!',
    body: `You received ${options.amount} ${options.token} via BLIK`,
    data: {
      type: 'blik_confirmed',
      fromAddress: options.fromAddress,
      amount: options.amount,
      token: options.token,
    },
    channelId: 'blik',
  });
}

/**
 * Send split request notification
 */
export async function sendSplitRequestNotification(options: {
  splitId: string;
  creatorName: string;
  amount: string;
  token: string;
  description?: string;
}): Promise<string | null> {
  const body = options.description
    ? `${options.creatorName} requested ${options.amount} ${options.token} for "${options.description}"`
    : `${options.creatorName} requested ${options.amount} ${options.token}`;

  return sendImmediateNotification({
    title: 'Payment Request',
    body,
    data: {
      type: 'split_request',
      splitId: options.splitId,
      amount: options.amount,
      token: options.token,
    },
    channelId: 'payments',
  });
}

/**
 * Send split paid notification (for creator)
 */
export async function sendSplitPaidNotification(options: {
  splitId: string;
  payerName: string;
  amount: string;
  token: string;
}): Promise<string | null> {
  return sendImmediateNotification({
    title: 'Payment Received',
    body: `${options.payerName} paid their share: ${options.amount} ${options.token}`,
    data: {
      type: 'split_paid',
      splitId: options.splitId,
      amount: options.amount,
      token: options.token,
    },
    channelId: 'payments',
  });
}

/**
 * Send split complete notification
 */
export async function sendSplitCompleteNotification(options: {
  splitId: string;
  totalAmount: string;
  token: string;
}): Promise<string | null> {
  return sendImmediateNotification({
    title: 'Split Bill Complete!',
    body: `Everyone has paid. Total: ${options.totalAmount} ${options.token}`,
    data: {
      type: 'split_complete',
      splitId: options.splitId,
      amount: options.totalAmount,
      token: options.token,
    },
    channelId: 'payments',
  });
}

/**
 * Send scheduled payment reminder
 */
export async function sendPaymentReminderNotification(options: {
  paymentId: string;
  recipient: string;
  amount: string;
  token: string;
  scheduledAt: Date;
}): Promise<string | null> {
  return scheduleLocalNotification({
    title: 'Scheduled Payment',
    body: `Payment of ${options.amount} ${options.token} to ${options.recipient} is due`,
    data: {
      type: 'payment_reminder',
      paymentId: options.paymentId,
      amount: options.amount,
      token: options.token,
    },
    triggerDate: options.scheduledAt,
    channelId: 'payments',
  });
}

/**
 * Send transaction received notification
 */
export async function sendTransactionReceivedNotification(options: {
  transactionHash: string;
  fromAddress: string;
  fromName?: string;
  amount: string;
  token: string;
}): Promise<string | null> {
  const sender = options.fromName || `${options.fromAddress.slice(0, 6)}...${options.fromAddress.slice(-4)}`;

  return sendImmediateNotification({
    title: 'Payment Received',
    body: `You received ${options.amount} ${options.token} from ${sender}`,
    data: {
      type: 'transaction_received',
      transactionHash: options.transactionHash,
      fromAddress: options.fromAddress,
      amount: options.amount,
      token: options.token,
    },
    channelId: 'payments',
  });
}
