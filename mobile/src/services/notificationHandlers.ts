/**
 * Notification Click Handlers
 * [EYP-M1-NOT-001] Handle notification interactions and navigation
 */

import * as Notifications from 'expo-notifications';
import { NavigationContainerRef } from '@react-navigation/native';
import { MainStackParamList } from '../navigation/MainNavigator';

let navigationRef: NavigationContainerRef<MainStackParamList> | null = null;

/**
 * Set the navigation reference for notification handlers
 * Call this from your root App component
 */
export function setNotificationNavigationRef(ref: NavigationContainerRef<MainStackParamList> | null) {
  navigationRef = ref;
}

/**
 * Handle notification click/tap
 */
export function handleNotificationResponse(response: Notifications.NotificationResponse) {
  try {
    const data = response.notification.request.content.data;

    if (!data || !data.screen) {
      console.log('No navigation data in notification');
      return;
    }

    console.log(`📱 Notification clicked, navigating to: ${data.screen}`);

    if (!navigationRef) {
      console.warn('Navigation ref not set. Call setNotificationNavigationRef() first.');
      return;
    }

    // Navigate to the appropriate screen
    const screenName = data.screen as keyof MainStackParamList;
    const params = data.params || {};

    navigationRef.navigate(screenName, params as any);
  } catch (error) {
    console.error('Failed to handle notification response:', error);
  }
}

/**
 * Setup notification listeners
 * Call this once in your root App component
 */
export function setupNotificationListeners() {
  // Handle notification clicks when app is in foreground or background
  const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

  console.log('✅ Notification listeners setup complete');

  return () => {
    subscription.remove();
  };
}

/**
 * Handle notification received while app is in foreground
 */
export function setupForegroundNotificationListener(
  onNotificationReceived?: (notification: Notifications.Notification) => void
) {
  const subscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('📬 Notification received in foreground:', notification.request.content.title);

    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  return () => {
    subscription.remove();
  };
}
