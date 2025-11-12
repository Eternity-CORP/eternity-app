/**
 * Notification Types and Settings
 * [EYP-M1-NOT-001] Privacy-first notifications
 */

export enum NotificationEventType {
  TRANSACTION_RECEIVED = 'TRANSACTION_RECEIVED',
  TRANSACTION_SENT = 'TRANSACTION_SENT',
  TRANSACTION_CONFIRMED = 'TRANSACTION_CONFIRMED',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  SCHEDULED_PAYMENT_DUE = 'SCHEDULED_PAYMENT_DUE',
  SECURITY_ALERT = 'SECURITY_ALERT',
}

export interface NotificationSettings {
  // Master switch
  enabled: boolean;

  // Event type toggles
  eventTypes: {
    [NotificationEventType.TRANSACTION_RECEIVED]: boolean;
    [NotificationEventType.TRANSACTION_SENT]: boolean;
    [NotificationEventType.TRANSACTION_CONFIRMED]: boolean;
    [NotificationEventType.PENDING_PAYMENT]: boolean;
    [NotificationEventType.SCHEDULED_PAYMENT_DUE]: boolean;
    [NotificationEventType.SECURITY_ALERT]: boolean;
  };

  // Privacy settings (PII)
  showAmounts: boolean; // Show transaction amounts
  showAddresses: boolean; // Show wallet addresses

  // Silent mode / Do Not Disturb
  silentMode: {
    enabled: boolean;
    startHour: number; // 0-23
    endHour: number; // 0-23
  };

  // Delivery frequency
  frequency: 'instant' | 'batched'; // Instant or batched (every hour)
}

export interface NotificationPayload {
  type: NotificationEventType;
  title: string;
  body: string;
  data?: {
    screen?: string; // Navigation target
    params?: Record<string, any>;
    amount?: string; // Only if user enabled showAmounts
    address?: string; // Only if user enabled showAddresses
    hash?: string;
  };
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  eventTypes: {
    [NotificationEventType.TRANSACTION_RECEIVED]: true,
    [NotificationEventType.TRANSACTION_SENT]: true,
    [NotificationEventType.TRANSACTION_CONFIRMED]: false, // Off by default
    [NotificationEventType.PENDING_PAYMENT]: true,
    [NotificationEventType.SCHEDULED_PAYMENT_DUE]: true,
    [NotificationEventType.SECURITY_ALERT]: true,
  },
  showAmounts: false, // Privacy-first: no PII by default
  showAddresses: false, // Privacy-first: no PII by default
  silentMode: {
    enabled: false,
    startHour: 22, // 10 PM
    endHour: 8, // 8 AM
  },
  frequency: 'instant',
};

export const NOTIFICATION_EVENT_LABELS: Record<NotificationEventType, { title: string; description: string }> = {
  [NotificationEventType.TRANSACTION_RECEIVED]: {
    title: 'Incoming Transactions',
    description: 'When you receive crypto',
  },
  [NotificationEventType.TRANSACTION_SENT]: {
    title: 'Outgoing Transactions',
    description: 'When you send crypto',
  },
  [NotificationEventType.TRANSACTION_CONFIRMED]: {
    title: 'Transaction Confirmations',
    description: 'When transactions are confirmed on-chain',
  },
  [NotificationEventType.PENDING_PAYMENT]: {
    title: 'Pending Payments',
    description: 'Reminders for unpaid bills',
  },
  [NotificationEventType.SCHEDULED_PAYMENT_DUE]: {
    title: 'Scheduled Payments',
    description: 'When scheduled payments are due',
  },
  [NotificationEventType.SECURITY_ALERT]: {
    title: 'Security Alerts',
    description: 'Important security notifications',
  },
};
