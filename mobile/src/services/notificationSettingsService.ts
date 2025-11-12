/**
 * Notification Settings Service
 * [EYP-M1-NOT-001] Privacy-first notification settings management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS, NotificationEventType } from '../types/notifications';

const NOTIFICATION_SETTINGS_KEY = 'notificationSettings';

/**
 * Get notification settings
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const json = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!json) {
      return DEFAULT_NOTIFICATION_SETTINGS;
    }
    const settings = JSON.parse(json);
    // Merge with defaults to handle new settings
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...settings };
  } catch (error) {
    console.error('Failed to load notification settings:', error);
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

/**
 * Save notification settings
 */
export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save notification settings:', error);
    throw error;
  }
}

/**
 * Check if notifications are enabled globally
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  const settings = await getNotificationSettings();
  return settings.enabled;
}

/**
 * Toggle master notification switch
 */
export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  const settings = await getNotificationSettings();
  settings.enabled = enabled;
  await saveNotificationSettings(settings);
}

/**
 * Check if a specific event type is enabled
 */
export async function isEventTypeEnabled(eventType: NotificationEventType): Promise<boolean> {
  const settings = await getNotificationSettings();
  return settings.enabled && settings.eventTypes[eventType];
}

/**
 * Toggle a specific event type
 */
export async function setEventTypeEnabled(eventType: NotificationEventType, enabled: boolean): Promise<void> {
  const settings = await getNotificationSettings();
  settings.eventTypes[eventType] = enabled;
  await saveNotificationSettings(settings);
}

/**
 * Check if we should show amounts (PII)
 */
export async function shouldShowAmounts(): Promise<boolean> {
  const settings = await getNotificationSettings();
  return settings.showAmounts;
}

/**
 * Toggle showing amounts in notifications
 */
export async function setShowAmounts(show: boolean): Promise<void> {
  const settings = await getNotificationSettings();
  settings.showAmounts = show;
  await saveNotificationSettings(settings);
}

/**
 * Check if we should show addresses (PII)
 */
export async function shouldShowAddresses(): Promise<boolean> {
  const settings = await getNotificationSettings();
  return settings.showAddresses;
}

/**
 * Toggle showing addresses in notifications
 */
export async function setShowAddresses(show: boolean): Promise<void> {
  const settings = await getNotificationSettings();
  settings.showAddresses = show;
  await saveNotificationSettings(settings);
}

/**
 * Check if we're in silent mode (Do Not Disturb)
 */
export async function isInSilentMode(): Promise<boolean> {
  const settings = await getNotificationSettings();

  if (!settings.silentMode.enabled) {
    return false;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const { startHour, endHour } = settings.silentMode;

  // Handle cases like 22:00 - 08:00 (crosses midnight)
  if (startHour > endHour) {
    return currentHour >= startHour || currentHour < endHour;
  }

  // Normal case like 01:00 - 08:00
  return currentHour >= startHour && currentHour < endHour;
}

/**
 * Update silent mode settings
 */
export async function updateSilentMode(enabled: boolean, startHour?: number, endHour?: number): Promise<void> {
  const settings = await getNotificationSettings();
  settings.silentMode.enabled = enabled;

  if (startHour !== undefined) {
    settings.silentMode.startHour = startHour;
  }

  if (endHour !== undefined) {
    settings.silentMode.endHour = endHour;
  }

  await saveNotificationSettings(settings);
}

/**
 * Get delivery frequency
 */
export async function getDeliveryFrequency(): Promise<'instant' | 'batched'> {
  const settings = await getNotificationSettings();
  return settings.frequency;
}

/**
 * Set delivery frequency
 */
export async function setDeliveryFrequency(frequency: 'instant' | 'batched'): Promise<void> {
  const settings = await getNotificationSettings();
  settings.frequency = frequency;
  await saveNotificationSettings(settings);
}

/**
 * Check if a notification should be sent based on current settings
 */
export async function shouldSendNotification(eventType: NotificationEventType): Promise<boolean> {
  // Check if notifications are enabled
  const enabled = await areNotificationsEnabled();
  if (!enabled) {
    return false;
  }

  // Check if event type is enabled
  const eventEnabled = await isEventTypeEnabled(eventType);
  if (!eventEnabled) {
    return false;
  }

  // Check if we're in silent mode
  const silent = await isInSilentMode();
  if (silent) {
    // Allow security alerts even in silent mode
    return eventType === NotificationEventType.SECURITY_ALERT;
  }

  return true;
}
