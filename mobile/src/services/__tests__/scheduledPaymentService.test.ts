import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock all external dependencies before importing the service
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-123'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

jest.mock('../blockchain/transactionService', () => ({
  sendETH: jest.fn().mockResolvedValue({ txHash: '0xabc123' }),
}));

jest.mock('../networkService', () => ({
  getSelectedNetwork: jest.fn().mockResolvedValue('sepolia'),
}));

import {
  generateScheduledPaymentId,
  getScheduledPayments,
  getPendingScheduledPayments,
  getScheduledPaymentById,
  getPendingScheduledPaymentsCount,
  createScheduledPayment,
} from '../scheduledPaymentService';
import { ScheduledPayment } from '../../types/scheduledPayment.types';

const STORAGE_KEY = '@scheduled_payments';

describe('scheduledPaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('generateScheduledPaymentId', () => {
    it('should generate unique IDs with scheduled prefix', () => {
      const id1 = generateScheduledPaymentId();
      const id2 = generateScheduledPaymentId();

      expect(id1).toMatch(/^scheduled_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^scheduled_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('createScheduledPayment', () => {
    it('should create a new scheduled payment with all fields', () => {
      const scheduledFor = new Date('2025-01-01T10:00:00Z');
      const payment = createScheduledPayment(
        '0x1234567890abcdef1234567890abcdef12345678',
        '0.5',
        scheduledFor,
        'Monthly rent',
        '🏠'
      );

      expect(payment.id).toMatch(/^scheduled_/);
      expect(payment.recipientAddress).toBe('0x1234567890abcdef1234567890abcdef12345678');
      expect(payment.amount).toBe('0.5');
      expect(payment.currency).toBe('ETH');
      expect(payment.message).toBe('Monthly rent');
      expect(payment.emoji).toBe('🏠');
      expect(payment.scheduledFor).toBe(scheduledFor.getTime());
      expect(payment.status).toBe('pending');
    });

    it('should create payment without optional fields', () => {
      const scheduledFor = new Date('2025-01-01T10:00:00Z');
      const payment = createScheduledPayment(
        '0x1234567890abcdef1234567890abcdef12345678',
        '1.0',
        scheduledFor
      );

      expect(payment.message).toBeUndefined();
      expect(payment.emoji).toBeUndefined();
      expect(payment.status).toBe('pending');
    });
  });

  describe('getScheduledPayments', () => {
    it('should return empty array when no payments exist', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const payments = await getScheduledPayments();
      expect(payments).toEqual([]);
    });

    it('should return parsed payments from storage', async () => {
      const mockPayments: ScheduledPayment[] = [
        {
          id: 'scheduled_1',
          recipientAddress: '0x123',
          amount: '1.0',
          currency: 'ETH',
          scheduledFor: Date.now() + 3600000,
          status: 'pending',
          createdAt: Date.now(),
        },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockPayments));
      const payments = await getScheduledPayments();
      expect(payments).toEqual(mockPayments);
    });

    it('should handle storage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));
      const payments = await getScheduledPayments();
      expect(payments).toEqual([]);
    });
  });

  describe('getPendingScheduledPayments', () => {
    it('should return only pending payments', async () => {
      const mockPayments: ScheduledPayment[] = [
        { id: '1', recipientAddress: '0x1', amount: '1', currency: 'ETH', scheduledFor: Date.now(), status: 'pending', createdAt: Date.now() },
        { id: '2', recipientAddress: '0x2', amount: '2', currency: 'ETH', scheduledFor: Date.now(), status: 'completed', createdAt: Date.now() },
        { id: '3', recipientAddress: '0x3', amount: '3', currency: 'ETH', scheduledFor: Date.now(), status: 'pending', createdAt: Date.now() },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockPayments));

      const pending = await getPendingScheduledPayments();

      expect(pending.length).toBe(2);
      expect(pending.every(p => p.status === 'pending')).toBe(true);
    });
  });

  describe('getScheduledPaymentById', () => {
    it('should return payment by ID', async () => {
      const mockPayments: ScheduledPayment[] = [
        { id: 'target', recipientAddress: '0x123', amount: '5.0', currency: 'ETH', scheduledFor: Date.now(), status: 'pending', createdAt: Date.now() },
        { id: 'other', recipientAddress: '0x456', amount: '3.0', currency: 'ETH', scheduledFor: Date.now(), status: 'pending', createdAt: Date.now() },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockPayments));

      const payment = await getScheduledPaymentById('target');
      expect(payment?.amount).toBe('5.0');
    });

    it('should return null for non-existent ID', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
      const payment = await getScheduledPaymentById('non-existent');
      expect(payment).toBeNull();
    });
  });

  describe('getPendingScheduledPaymentsCount', () => {
    it('should return count of pending payments', async () => {
      const mockPayments: ScheduledPayment[] = [
        { id: '1', recipientAddress: '0x1', amount: '1', currency: 'ETH', scheduledFor: Date.now(), status: 'pending', createdAt: Date.now() },
        { id: '2', recipientAddress: '0x2', amount: '2', currency: 'ETH', scheduledFor: Date.now(), status: 'completed', createdAt: Date.now() },
        { id: '3', recipientAddress: '0x3', amount: '3', currency: 'ETH', scheduledFor: Date.now(), status: 'pending', createdAt: Date.now() },
      ];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockPayments));

      const count = await getPendingScheduledPaymentsCount();
      expect(count).toBe(2);
    });

    it('should return 0 when no pending payments', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([]));
      const count = await getPendingScheduledPaymentsCount();
      expect(count).toBe(0);
    });
  });
});
