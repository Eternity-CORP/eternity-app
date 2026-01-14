/**
 * Push Notification Service (Stub for Expo Go)
 *
 * Push notifications require native code that's not available in Expo Go.
 * This stub provides a no-op implementation that won't crash the app.
 *
 * To enable real notifications, build a development client:
 * npx expo run:ios or npx expo run:android
 */

export interface NotificationData {
  type: 'split_request' | 'split_paid' | 'payment_reminder' | 'transaction_received' | 'general';
  splitId?: string;
  paymentId?: string;
  transactionHash?: string;
  fromAddress?: string;
  amount?: string;
  token?: string;
  [key: string]: string | undefined;
}

// All functions are no-ops in Expo Go

export async function isNotificationsAvailable(): Promise<boolean> {
  // Notifications are not available in Expo Go
  return false;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  console.log('Push notifications require a development build');
  return false;
}

export async function scheduleLocalNotification(_options: {
  title: string;
  body: string;
  data?: NotificationData;
  triggerDate?: Date;
}): Promise<string | null> {
  console.log('Push notifications require a development build');
  return null;
}

export async function sendImmediateNotification(_options: {
  title: string;
  body: string;
  data?: NotificationData;
}): Promise<string | null> {
  return null;
}

export async function cancelNotification(_notificationId: string): Promise<void> {
  // no-op
}

export async function cancelAllNotifications(): Promise<void> {
  // no-op
}

export async function getScheduledNotifications(): Promise<unknown[]> {
  return [];
}

export async function getLastNotificationResponse(): Promise<unknown | null> {
  return null;
}

export async function sendSplitRequestNotification(_options: {
  splitId: string;
  creatorName: string;
  amount: string;
  token: string;
  description?: string;
}): Promise<string | null> {
  return null;
}

export async function sendSplitPaidNotification(_options: {
  splitId: string;
  payerName: string;
  amount: string;
  token: string;
}): Promise<string | null> {
  return null;
}

export async function sendTransactionReceivedNotification(_options: {
  transactionHash: string;
  fromAddress: string;
  fromName?: string;
  amount: string;
  token: string;
}): Promise<string | null> {
  return null;
}
