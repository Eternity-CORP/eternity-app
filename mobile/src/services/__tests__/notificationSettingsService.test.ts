/**
 * Notification Settings Service Tests
 * [EYP-M1-NOT-001] Privacy-first notification settings
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getNotificationSettings,
  saveNotificationSettings,
  areNotificationsEnabled,
  setNotificationsEnabled,
  isEventTypeEnabled,
  setEventTypeEnabled,
  shouldShowAmounts,
  setShowAmounts,
  shouldShowAddresses,
  setShowAddresses,
  isInSilentMode,
  updateSilentMode,
  getDeliveryFrequency,
  setDeliveryFrequency,
  shouldSendNotification,
} from '../notificationSettingsService';
import { NotificationEventType, DEFAULT_NOTIFICATION_SETTINGS } from '../../types/notifications';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

describe('NotificationSettingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('getNotificationSettings', () => {
    it('returns default settings when no settings exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const settings = await getNotificationSettings();

      expect(settings).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
    });

    it('returns saved settings when they exist', async () => {
      const savedSettings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        enabled: false,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(savedSettings));

      const settings = await getNotificationSettings();

      expect(settings.enabled).toBe(false);
    });

    it('merges saved settings with defaults for new fields', async () => {
      const partialSettings = {
        enabled: false,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(partialSettings));

      const settings = await getNotificationSettings();

      expect(settings.enabled).toBe(false);
      expect(settings.eventTypes).toBeDefined();
      expect(settings.showAmounts).toBeDefined();
    });
  });

  describe('saveNotificationSettings', () => {
    it('saves settings to AsyncStorage', async () => {
      const settings = DEFAULT_NOTIFICATION_SETTINGS;

      await saveNotificationSettings(settings);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'notificationSettings',
        JSON.stringify(settings)
      );
    });
  });

  describe('areNotificationsEnabled', () => {
    it('returns true when notifications are enabled', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ ...DEFAULT_NOTIFICATION_SETTINGS, enabled: true })
      );

      const enabled = await areNotificationsEnabled();

      expect(enabled).toBe(true);
    });

    it('returns false when notifications are disabled', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ ...DEFAULT_NOTIFICATION_SETTINGS, enabled: false })
      );

      const enabled = await areNotificationsEnabled();

      expect(enabled).toBe(false);
    });
  });

  describe('setNotificationsEnabled', () => {
    it('updates master notification switch', async () => {
      await setNotificationsEnabled(false);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData.enabled).toBe(false);
    });
  });

  describe('isEventTypeEnabled', () => {
    it('returns false when master switch is off', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ ...DEFAULT_NOTIFICATION_SETTINGS, enabled: false })
      );

      const enabled = await isEventTypeEnabled(NotificationEventType.TRANSACTION_SENT);

      expect(enabled).toBe(false);
    });

    it('returns true when event type is enabled', async () => {
      const settings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        enabled: true,
        eventTypes: {
          ...DEFAULT_NOTIFICATION_SETTINGS.eventTypes,
          [NotificationEventType.TRANSACTION_SENT]: true,
        },
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(settings));

      const enabled = await isEventTypeEnabled(NotificationEventType.TRANSACTION_SENT);

      expect(enabled).toBe(true);
    });

    it('returns false when event type is disabled', async () => {
      const settings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        enabled: true,
        eventTypes: {
          ...DEFAULT_NOTIFICATION_SETTINGS.eventTypes,
          [NotificationEventType.TRANSACTION_SENT]: false,
        },
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(settings));

      const enabled = await isEventTypeEnabled(NotificationEventType.TRANSACTION_SENT);

      expect(enabled).toBe(false);
    });
  });

  describe('Privacy Settings (PII)', () => {
    it('shouldShowAmounts returns false by default', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(DEFAULT_NOTIFICATION_SETTINGS)
      );

      const show = await shouldShowAmounts();

      expect(show).toBe(false);
    });

    it('shouldShowAddresses returns false by default', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(DEFAULT_NOTIFICATION_SETTINGS)
      );

      const show = await shouldShowAddresses();

      expect(show).toBe(false);
    });

    it('setShowAmounts updates setting', async () => {
      await setShowAmounts(true);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData.showAmounts).toBe(true);
    });

    it('setShowAddresses updates setting', async () => {
      await setShowAddresses(true);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData.showAddresses).toBe(true);
    });
  });

  describe('Silent Mode (Do Not Disturb)', () => {
    beforeEach(() => {
      // Mock current time to be 11 PM (23:00)
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(23);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('returns false when silent mode is disabled', async () => {
      const settings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        silentMode: {
          enabled: false,
          startHour: 22,
          endHour: 8,
        },
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(settings));

      const silent = await isInSilentMode();

      expect(silent).toBe(false);
    });

    it('returns true when current time is within silent hours', async () => {
      const settings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        silentMode: {
          enabled: true,
          startHour: 22, // 10 PM
          endHour: 8,    // 8 AM
        },
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(settings));
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(23); // 11 PM

      const silent = await isInSilentMode();

      expect(silent).toBe(true);
    });

    it('returns false when current time is outside silent hours', async () => {
      const settings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        silentMode: {
          enabled: true,
          startHour: 22,
          endHour: 8,
        },
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(settings));
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14); // 2 PM

      const silent = await isInSilentMode();

      expect(silent).toBe(false);
    });

    it('handles silent hours that cross midnight', async () => {
      const settings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        silentMode: {
          enabled: true,
          startHour: 22, // 10 PM
          endHour: 8,    // 8 AM
        },
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(settings));

      // Test at 2 AM (should be silent)
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(2);
      const silent1 = await isInSilentMode();
      expect(silent1).toBe(true);

      // Test at 9 AM (should not be silent)
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
      const silent2 = await isInSilentMode();
      expect(silent2).toBe(false);
    });

    it('updateSilentMode updates settings', async () => {
      await updateSilentMode(true, 20, 6);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData.silentMode.enabled).toBe(true);
      expect(savedData.silentMode.startHour).toBe(20);
      expect(savedData.silentMode.endHour).toBe(6);
    });
  });

  describe('Delivery Frequency', () => {
    it('returns instant by default', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(DEFAULT_NOTIFICATION_SETTINGS)
      );

      const freq = await getDeliveryFrequency();

      expect(freq).toBe('instant');
    });

    it('setDeliveryFrequency updates setting', async () => {
      await setDeliveryFrequency('batched');

      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
      expect(savedData.frequency).toBe('batched');
    });
  });

  describe('shouldSendNotification', () => {
    it('returns false when notifications are disabled', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ ...DEFAULT_NOTIFICATION_SETTINGS, enabled: false })
      );

      const should = await shouldSendNotification(NotificationEventType.TRANSACTION_SENT);

      expect(should).toBe(false);
    });

    it('returns false when event type is disabled', async () => {
      const settings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        enabled: true,
        eventTypes: {
          ...DEFAULT_NOTIFICATION_SETTINGS.eventTypes,
          [NotificationEventType.TRANSACTION_SENT]: false,
        },
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(settings));

      const should = await shouldSendNotification(NotificationEventType.TRANSACTION_SENT);

      expect(should).toBe(false);
    });

    it('returns false when in silent mode for non-security events', async () => {
      const settings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        enabled: true,
        silentMode: {
          enabled: true,
          startHour: 22,
          endHour: 8,
        },
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(settings));
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(23); // 11 PM

      const should = await shouldSendNotification(NotificationEventType.TRANSACTION_SENT);

      expect(should).toBe(false);
    });

    it('returns true for security alerts even in silent mode', async () => {
      const settings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        enabled: true,
        eventTypes: {
          ...DEFAULT_NOTIFICATION_SETTINGS.eventTypes,
          [NotificationEventType.SECURITY_ALERT]: true,
        },
        silentMode: {
          enabled: true,
          startHour: 22,
          endHour: 8,
        },
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(settings));
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(23); // 11 PM

      const should = await shouldSendNotification(NotificationEventType.SECURITY_ALERT);

      expect(should).toBe(true);
    });

    it('returns true when all conditions are met', async () => {
      const settings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        enabled: true,
      };
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(settings));
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14); // 2 PM

      const should = await shouldSendNotification(NotificationEventType.TRANSACTION_SENT);

      expect(should).toBe(true);
    });
  });
});
