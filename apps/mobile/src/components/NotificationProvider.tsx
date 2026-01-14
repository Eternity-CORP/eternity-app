/**
 * Notification Provider
 * Sets up notification listeners and handles notification responses
 * Note: Push notifications only work in development builds, not in Expo Go
 */

import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import {
  isNotificationsAvailable,
  requestNotificationPermissions,
  getLastNotificationResponse,
  NotificationData,
} from '../services/notification-service';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const listenerSetup = useRef(false);

  useEffect(() => {
    if (listenerSetup.current) return;
    listenerSetup.current = true;

    // Setup notifications asynchronously
    setupNotifications();
  }, []);

  return <>{children}</>;
}

/**
 * Setup notifications and listeners
 */
async function setupNotifications() {
  const available = await isNotificationsAvailable();
  if (!available) {
    console.log('Push notifications not available in this environment');
    return;
  }

  // Request permissions
  await requestNotificationPermissions();

  // Check if app was launched from a notification
  try {
    const response = await getLastNotificationResponse();
    if (response) {
      handleNotificationResponse(response);
    }
  } catch (error) {
    console.warn('Error checking launch notification:', error);
  }

  // Setup notification listeners dynamically
  try {
    const Notifications = await import('expo-notifications');

    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification.request.content.title);
    });

    // Handle notification response (user tapped notification)
    Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response);
    });
  } catch (error) {
    console.warn('Could not setup notification listeners:', error);
  }
}

/**
 * Handle notification tap response
 */
function handleNotificationResponse(response: unknown) {
  if (!response || typeof response !== 'object') return;

  const typedResponse = response as {
    notification?: {
      request?: {
        content?: {
          data?: Record<string, unknown>;
        };
      };
    };
  };

  const data = typedResponse.notification?.request?.content?.data as NotificationData | undefined;

  if (!data?.type) {
    console.log('Notification without data type');
    return;
  }

  // Use setTimeout to ensure navigation happens after app is ready
  setTimeout(() => {
    switch (data.type) {
      case 'split_request':
      case 'split_paid':
        if (data.splitId) {
          router.push(`/split/${data.splitId}`);
        }
        break;

      case 'payment_reminder':
        if (data.paymentId) {
          router.push(`/scheduled/${data.paymentId}`);
        }
        break;

      case 'transaction_received':
        if (data.transactionHash) {
          router.push(`/transaction/${data.transactionHash}`);
        }
        break;

      default:
        console.log('Unknown notification type:', data.type);
    }
  }, 100);
}
