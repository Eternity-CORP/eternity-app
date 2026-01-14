/**
 * Notification Provider (Stub for Expo Go)
 *
 * Push notifications require native code not available in Expo Go.
 * This is a passthrough component that does nothing.
 *
 * To enable real notifications, build a development client:
 * npx expo run:ios or npx expo run:android
 */

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  // Notifications are not available in Expo Go
  // Just render children without any notification setup
  return <>{children}</>;
}
