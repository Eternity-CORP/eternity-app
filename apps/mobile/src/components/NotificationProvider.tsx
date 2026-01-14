/**
 * Notification Provider
 * Sets up notification listeners and handles notification responses
 */

import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import {
  requestNotificationPermissions,
  getLastNotificationResponse,
  NotificationData,
} from '../services/notification-service';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Request permissions on mount
    requestNotificationPermissions();

    // Handle notification received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      // Could update UI state here (e.g., show badge, refresh data)
    });

    // Handle notification response (user tapped notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response);
    });

    // Check if app was launched from a notification
    checkLaunchNotification();

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return <>{children}</>;
}

/**
 * Check if the app was launched from a notification
 */
async function checkLaunchNotification() {
  const response = await getLastNotificationResponse();
  if (response) {
    handleNotificationResponse(response);
  }
}

/**
 * Handle notification tap response
 */
function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as unknown as NotificationData;

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
