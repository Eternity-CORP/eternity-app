/**
 * Push Notification Service
 * Handles both local and remote push notifications
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

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
  type: 'split_request' | 'split_paid' | 'payment_reminder' | 'transaction_received' | 'general';
  splitId?: string;
  paymentId?: string;
  transactionHash?: string;
  fromAddress?: string;
  amount?: string;
  token?: string;
  [key: string]: string | undefined; // Allow indexing by string
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  // Notifications are only available on devices
  if (!Device.isDevice) {
    console.log('Notifications only work on physical devices');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted');
    return false;
  }

  return true;
}

/**
 * Get the Expo Push Token for remote notifications
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    // Get project ID from constants
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    if (!projectId) {
      console.log('Missing EAS project ID for push notifications');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(options: {
  title: string;
  body: string;
  data?: NotificationData;
  trigger?: Notifications.NotificationTriggerInput;
}): Promise<string | null> {
  const { title, body, data, trigger } = options;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: trigger || null, // null = immediate
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

/**
 * Send an immediate local notification
 */
export async function sendImmediateNotification(options: {
  title: string;
  body: string;
  data?: NotificationData;
}): Promise<string | null> {
  return scheduleLocalNotification({
    title: options.title,
    body: options.body,
    data: options.data,
    trigger: null,
  });
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Set badge count (iOS only)
 */
export async function setBadgeCount(count: number): Promise<void> {
  if (Platform.OS === 'ios') {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }
}

/**
 * Clear badge count
 */
export async function clearBadge(): Promise<void> {
  await setBadgeCount(0);
}

/**
 * Add notification received listener (when app is in foreground)
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

/**
 * Get the last notification response (for handling launch from notification)
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return await Notifications.getLastNotificationResponseAsync();
}

// Pre-defined notification templates

/**
 * Send split bill request notification
 */
export async function sendSplitRequestNotification(options: {
  splitId: string;
  creatorName: string;
  amount: string;
  token: string;
  description?: string;
}): Promise<string | null> {
  const { splitId, creatorName, amount, token, description } = options;

  return sendImmediateNotification({
    title: 'Payment Request',
    body: description
      ? `${creatorName} requested ${amount} ${token} for "${description}"`
      : `${creatorName} requested ${amount} ${token}`,
    data: {
      type: 'split_request',
      splitId,
      amount,
      token,
    },
  });
}

/**
 * Send split paid notification
 */
export async function sendSplitPaidNotification(options: {
  splitId: string;
  payerName: string;
  amount: string;
  token: string;
}): Promise<string | null> {
  const { splitId, payerName, amount, token } = options;

  return sendImmediateNotification({
    title: 'Payment Received',
    body: `${payerName} paid their share of ${amount} ${token}`,
    data: {
      type: 'split_paid',
      splitId,
      amount,
      token,
    },
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
  const { transactionHash, fromAddress, fromName, amount, token } = options;

  const sender = fromName || `${fromAddress.slice(0, 6)}...${fromAddress.slice(-4)}`;

  return sendImmediateNotification({
    title: 'Payment Received',
    body: `Received ${amount} ${token} from ${sender}`,
    data: {
      type: 'transaction_received',
      transactionHash,
      fromAddress,
      amount,
      token,
    },
  });
}
