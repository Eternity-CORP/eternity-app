/**
 * Scheduled Payment Service
 * Manages scheduled payments with local storage and notifications
 */

import Storage from '@/src/utils/storage';

const SCHEDULED_PAYMENTS_KEY = 'scheduled_payments';

// Lazy-loaded notifications module (not available in Expo Go)
let Notifications: typeof import('expo-notifications') | null = null;
let notificationsInitialized = false;

/**
 * Try to load notifications module
 */
async function getNotifications(): Promise<typeof import('expo-notifications') | null> {
  if (notificationsInitialized) return Notifications;

  try {
    Notifications = await import('expo-notifications');
    notificationsInitialized = true;
    return Notifications;
  } catch (error) {
    console.warn('expo-notifications not available (Expo Go?):', error);
    notificationsInitialized = true;
    return null;
  }
}

export type RecurringInterval = 'daily' | 'weekly' | 'monthly';
export type ScheduledPaymentStatus = 'pending' | 'executed' | 'cancelled' | 'failed';

export interface ScheduledPayment {
  id: string;
  creatorAddress: string;
  recipient: string;
  recipientUsername?: string;
  recipientName?: string;
  amount: string;
  tokenSymbol: string;
  scheduledAt: number;
  recurring?: {
    interval: RecurringInterval;
    endDate?: number;
  };
  description?: string;
  status: ScheduledPaymentStatus;
  executedTxHash?: string;
  executedAt?: number;
  createdAt: number;
  updatedAt: number;
  notificationId?: string;
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `sp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Configure notifications
 */
export async function configureNotifications(): Promise<void> {
  const notifs = await getNotifications();
  if (!notifs) return;

  await notifs.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const notifs = await getNotifications();
  if (!notifs) return false;

  try {
    const { status: existingStatus } = await notifs.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await notifs.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Schedule a local notification for a payment
 */
async function scheduleNotification(payment: ScheduledPayment): Promise<string | null> {
  const notifs = await getNotifications();
  if (!notifs) return null;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn('Notification permissions not granted');
      return null;
    }

    // Cancel existing notification if any
    if (payment.notificationId) {
      await notifs.cancelScheduledNotificationAsync(payment.notificationId);
    }

    const triggerDate = new Date(payment.scheduledAt);

    // Don't schedule if the time has passed
    if (triggerDate.getTime() <= Date.now()) {
      return null;
    }

    const recipientDisplay = payment.recipientUsername
      ? `@${payment.recipientUsername}`
      : payment.recipientName
        ? payment.recipientName
        : `${payment.recipient.slice(0, 6)}...${payment.recipient.slice(-4)}`;

    const notificationId = await notifs.scheduleNotificationAsync({
      content: {
        title: 'Scheduled Payment Due',
        body: `Time to send ${payment.amount} ${payment.tokenSymbol} to ${recipientDisplay}`,
        data: {
          type: 'scheduled_payment',
          paymentId: payment.id,
        },
      },
      trigger: {
        type: notifs.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

/**
 * Cancel a scheduled notification
 */
async function cancelNotification(notificationId: string): Promise<void> {
  const notifs = await getNotifications();
  if (!notifs) return;

  try {
    await notifs.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
}

/**
 * Load all scheduled payments from storage
 */
export async function loadScheduledPayments(): Promise<ScheduledPayment[]> {
  try {
    const data = await Storage.getItem(SCHEDULED_PAYMENTS_KEY);
    if (!data) return [];

    const payments: ScheduledPayment[] = JSON.parse(data);
    // Sort by scheduledAt (soonest first)
    return payments.sort((a, b) => a.scheduledAt - b.scheduledAt);
  } catch (error) {
    console.error('Error loading scheduled payments:', error);
    return [];
  }
}

/**
 * Save scheduled payments to storage
 */
async function saveScheduledPayments(payments: ScheduledPayment[]): Promise<void> {
  try {
    await Storage.setItem(SCHEDULED_PAYMENTS_KEY, JSON.stringify(payments));
  } catch (error) {
    console.error('Error saving scheduled payments:', error);
    throw error;
  }
}

/**
 * Create a new scheduled payment
 */
export async function createScheduledPayment(
  payment: Omit<ScheduledPayment, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'notificationId'>
): Promise<ScheduledPayment> {
  const payments = await loadScheduledPayments();

  const newPayment: ScheduledPayment = {
    ...payment,
    id: generateId(),
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Schedule notification
  const notificationId = await scheduleNotification(newPayment);
  if (notificationId) {
    newPayment.notificationId = notificationId;
  }

  payments.push(newPayment);
  await saveScheduledPayments(payments);

  return newPayment;
}

/**
 * Update a scheduled payment
 */
export async function updateScheduledPayment(
  id: string,
  updates: Partial<Omit<ScheduledPayment, 'id' | 'createdAt'>>
): Promise<ScheduledPayment | null> {
  const payments = await loadScheduledPayments();
  const index = payments.findIndex((p) => p.id === id);

  if (index === -1) {
    return null;
  }

  const updatedPayment: ScheduledPayment = {
    ...payments[index],
    ...updates,
    updatedAt: Date.now(),
  };

  // Reschedule notification if scheduledAt changed
  if (updates.scheduledAt && updates.scheduledAt !== payments[index].scheduledAt) {
    if (payments[index].notificationId) {
      await cancelNotification(payments[index].notificationId);
    }
    const notificationId = await scheduleNotification(updatedPayment);
    if (notificationId) {
      updatedPayment.notificationId = notificationId;
    }
  }

  payments[index] = updatedPayment;
  await saveScheduledPayments(payments);

  return updatedPayment;
}

/**
 * Cancel a scheduled payment
 */
export async function cancelScheduledPayment(id: string): Promise<boolean> {
  const payments = await loadScheduledPayments();
  const index = payments.findIndex((p) => p.id === id);

  if (index === -1) {
    return false;
  }

  // Cancel notification
  if (payments[index].notificationId) {
    await cancelNotification(payments[index].notificationId);
  }

  payments[index] = {
    ...payments[index],
    status: 'cancelled',
    updatedAt: Date.now(),
  };

  await saveScheduledPayments(payments);
  return true;
}

/**
 * Delete a scheduled payment permanently
 */
export async function deleteScheduledPayment(id: string): Promise<boolean> {
  const payments = await loadScheduledPayments();
  const payment = payments.find((p) => p.id === id);

  if (!payment) {
    return false;
  }

  // Cancel notification
  if (payment.notificationId) {
    await cancelNotification(payment.notificationId);
  }

  const filtered = payments.filter((p) => p.id !== id);
  await saveScheduledPayments(filtered);
  return true;
}

/**
 * Mark a payment as executed
 */
export async function markPaymentExecuted(
  id: string,
  txHash: string
): Promise<ScheduledPayment | null> {
  const payments = await loadScheduledPayments();
  const index = payments.findIndex((p) => p.id === id);

  if (index === -1) {
    return null;
  }

  const payment = payments[index];

  // Cancel notification
  if (payment.notificationId) {
    await cancelNotification(payment.notificationId);
  }

  // Update payment
  const updatedPayment: ScheduledPayment = {
    ...payment,
    status: 'executed',
    executedTxHash: txHash,
    executedAt: Date.now(),
    updatedAt: Date.now(),
    notificationId: undefined,
  };

  // If recurring, schedule next occurrence
  if (payment.recurring) {
    const nextDate = calculateNextOccurrence(
      payment.scheduledAt,
      payment.recurring.interval
    );

    // Check if next occurrence is before end date
    if (!payment.recurring.endDate || nextDate <= payment.recurring.endDate) {
      const nextPayment: ScheduledPayment = {
        ...payment,
        id: generateId(),
        scheduledAt: nextDate,
        status: 'pending',
        executedTxHash: undefined,
        executedAt: undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Schedule notification for next occurrence
      const notificationId = await scheduleNotification(nextPayment);
      if (notificationId) {
        nextPayment.notificationId = notificationId;
      }

      payments.push(nextPayment);
    }
  }

  payments[index] = updatedPayment;
  await saveScheduledPayments(payments);

  return updatedPayment;
}

/**
 * Calculate next occurrence for recurring payments
 */
function calculateNextOccurrence(
  currentDate: number,
  interval: RecurringInterval
): number {
  const date = new Date(currentDate);

  switch (interval) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
  }

  return date.getTime();
}

/**
 * Get pending payments for an address
 */
export async function getPendingPayments(
  creatorAddress: string
): Promise<ScheduledPayment[]> {
  const payments = await loadScheduledPayments();
  return payments
    .filter(
      (p) =>
        p.creatorAddress.toLowerCase() === creatorAddress.toLowerCase() &&
        p.status === 'pending'
    )
    .sort((a, b) => a.scheduledAt - b.scheduledAt);
}

/**
 * Get upcoming payments (next 7 days)
 */
export async function getUpcomingPayments(
  creatorAddress: string
): Promise<ScheduledPayment[]> {
  const payments = await getPendingPayments(creatorAddress);
  const weekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;

  return payments.filter((p) => p.scheduledAt <= weekFromNow);
}

/**
 * Get a single payment by ID
 */
export async function getScheduledPayment(
  id: string
): Promise<ScheduledPayment | null> {
  const payments = await loadScheduledPayments();
  return payments.find((p) => p.id === id) || null;
}

/**
 * Get overdue payments that haven't been executed
 */
export async function getOverduePayments(
  creatorAddress: string
): Promise<ScheduledPayment[]> {
  const payments = await loadScheduledPayments();
  const now = Date.now();

  return payments.filter(
    (p) =>
      p.creatorAddress.toLowerCase() === creatorAddress.toLowerCase() &&
      p.status === 'pending' &&
      p.scheduledAt < now
  );
}
