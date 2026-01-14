/**
 * Push Notification Service
 * Handles both local and remote push notifications
 * Note: Push notifications only work in development builds, not in Expo Go
 */

// Lazy-loaded notifications module (not available in Expo Go)
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;
let modulesInitialized = false;

/**
 * Try to load notifications modules
 */
async function loadModules(): Promise<boolean> {
  if (modulesInitialized) return Notifications !== null;

  try {
    const [notifs, device] = await Promise.all([
      import('expo-notifications'),
      import('expo-device'),
    ]);
    Notifications = notifs;
    Device = device;
    modulesInitialized = true;

    // Configure notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    return true;
  } catch (error) {
    console.warn('Push notifications not available (Expo Go?):', error);
    modulesInitialized = true;
    return false;
  }
}

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
 * Check if notifications are available
 */
export async function isNotificationsAvailable(): Promise<boolean> {
  return loadModules();
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const available = await loadModules();
  if (!available || !Notifications || !Device) return false;

  // Notifications are only available on devices
  if (!Device.isDevice) {
    console.log('Notifications only work on physical devices');
    return false;
  }

  try {
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
  } catch (error) {
    console.warn('Error requesting notification permissions:', error);
    return false;
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
}): Promise<string | null> {
  const available = await loadModules();
  if (!available || !Notifications) return null;

  const { title, body, data, triggerDate } = options;

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
      trigger: triggerDate
        ? {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          }
        : null, // null = immediate
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
  });
}

/**
 * Cancel a scheduled notification
 */
export async function cancelNotification(notificationId: string): Promise<void> {
  const available = await loadModules();
  if (!available || !Notifications) return;

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
  const available = await loadModules();
  if (!available || !Notifications) return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<unknown[]> {
  const available = await loadModules();
  if (!available || !Notifications) return [];

  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Get the last notification response (for handling launch from notification)
 */
export async function getLastNotificationResponse(): Promise<unknown | null> {
  const available = await loadModules();
  if (!available || !Notifications) return null;

  try {
    return await Notifications.getLastNotificationResponseAsync();
  } catch (error) {
    console.error('Error getting last notification response:', error);
    return null;
  }
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
