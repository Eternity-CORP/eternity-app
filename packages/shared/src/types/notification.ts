/**
 * Shared Notification Types
 * Used across API, mobile, and web for push notification payloads.
 */

// ---- Notification Type Enum ----

export type NotificationType =
  | 'blik_matched'
  | 'blik_confirmed'
  | 'split_created'
  | 'split_paid'
  | 'split_complete'
  | 'payment_received'
  | 'scheduled_executed'
  | 'scheduled_reminder'
  | 'scheduled_failed'
  | 'general';

// ---- Notification Payload ----

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string | undefined>;
  channelId?: string;
}

// ---- Push Device Platform ----

export type PushDevicePlatform = 'ios' | 'android' | 'web';

// ---- API Request/Response Types ----

export interface RegisterDeviceRequest {
  walletAddress: string;
  pushToken: string;
  platform: PushDevicePlatform;
  deviceName?: string;
}

export interface UnregisterDeviceRequest {
  walletAddress: string;
  pushToken: string;
}

export interface RegisterDeviceResponse {
  success: boolean;
  message: string;
  deviceId: string;
}

export interface UnregisterDeviceResponse {
  success: boolean;
  message: string;
}

// ---- Notification Channel IDs ----

export const NOTIFICATION_CHANNELS = {
  DEFAULT: 'default',
  BLIK: 'blik',
  PAYMENTS: 'payments',
  SCHEDULED: 'scheduled',
} as const;

// ---- WebSocket Notification Events (for web in-app toasts) ----

export const NOTIFICATION_WS_EVENTS = {
  /** Server -> Client: push notification payload to display as in-app toast */
  NOTIFICATION: 'notification',
  /** Client -> Server: subscribe to notifications for a wallet address */
  SUBSCRIBE: 'subscribe',
  /** Client -> Server: unsubscribe from notifications */
  UNSUBSCRIBE: 'unsubscribe',
} as const;
