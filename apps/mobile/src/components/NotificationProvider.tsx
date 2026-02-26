/**
 * Notification Provider
 *
 * Handles push notification registration, token management, and incoming
 * notification routing. Wraps the app and registers the device push token
 * with the backend whenever a wallet is available.
 *
 * Push notifications require a development build (not Expo Go).
 * If running in Expo Go, this falls back to a passthrough component.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { useAppSelector } from '@/src/store/hooks';
import { getCurrentAccount } from '@/src/store/slices/wallet-slice';
import {
  requestNotificationPermissions,
  registerPushToken,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  type NotificationData,
} from '@/src/services/notification-service';
import { createLogger } from '@/src/utils/logger';

const log = createLogger('NotificationProvider');

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const router = useRouter();
  const wallet = useAppSelector((state) => state.wallet);
  const currentAccount = getCurrentAccount(wallet);
  const walletAddress = currentAccount?.address;
  const hasRegistered = useRef(false);

  // Register push token with backend when wallet is ready
  useEffect(() => {
    if (!wallet.isInitialized || !walletAddress || hasRegistered.current) {
      return;
    }

    // Push notifications are only available on physical devices (not Expo Go)
    if (!Device.isDevice) {
      log.info('Skipping push registration: not a physical device (Expo Go)');
      return;
    }

    async function setup() {
      try {
        const permissionGranted = await requestNotificationPermissions();
        if (!permissionGranted) {
          log.info('Push notification permission not granted');
          return;
        }

        const registered = await registerPushToken(walletAddress!);
        if (registered) {
          hasRegistered.current = true;
          log.info('Push token registered successfully');
        }
      } catch (error) {
        log.error('Failed to setup push notifications', error);
      }
    }

    setup();
  }, [wallet.isInitialized, walletAddress]);

  // Handle incoming notification routing
  const handleNotificationNavigation = useCallback(
    (data: NotificationData | undefined) => {
      if (!data) return;

      switch (data.type) {
        case 'blik_matched':
        case 'blik_confirmed':
          router.push('/blik');
          break;

        case 'split_request':
        case 'split_paid':
        case 'split_complete':
          if (data.splitId) {
            router.push(`/split/${data.splitId}`);
          } else {
            router.push('/split');
          }
          break;

        case 'payment_reminder':
          if (data.paymentId) {
            router.push(`/scheduled/${data.paymentId}`);
          } else {
            router.push('/scheduled');
          }
          break;

        case 'transaction_received':
          if (data.transactionHash) {
            router.push(`/transaction/${data.transactionHash}`);
          }
          break;

        default:
          // No specific navigation for unknown types
          break;
      }
    },
    [router],
  );

  // Listen for notifications while app is in foreground
  useEffect(() => {
    const receivedSubscription = addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as NotificationData | undefined;
      log.info(`Notification received in foreground: ${data?.type || 'unknown'}`);
      // In-app banner is handled automatically by expo-notifications handler
    });

    // Listen for notification taps (user tapped a notification)
    const responseSubscription = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as NotificationData | undefined;
      log.info(`Notification tapped: ${data?.type || 'unknown'}`);
      handleNotificationNavigation(data);
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [handleNotificationNavigation]);

  // Re-register when active account changes
  useEffect(() => {
    if (!wallet.isInitialized || !walletAddress || !Device.isDevice) {
      return;
    }

    // Only re-register if we already successfully registered once
    // (account switch scenario)
    if (hasRegistered.current) {
      registerPushToken(walletAddress).catch((error) => {
        log.error('Failed to re-register push token for new account', error);
      });
    }
  }, [walletAddress, wallet.isInitialized]);

  return <>{children}</>;
}
