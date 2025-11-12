/**
 * Unit Tests: Time Helpers
 * 
 * Tests for timezone-aware scheduling and RRULE parsing
 */

import { describe, it, expect } from 'vitest';
import {
  computeNextRunAt,
  isValidTimezone,
  getCurrentTimezone,
  validateSchedule,
  createDailyRRule,
  createWeeklyRRule,
  createMonthlyRRule,
} from '../utils/time-helpers';
import type { ScheduledPayment } from '../types';

describe('Time Helpers', () => {
  describe('isValidTimezone', () => {
    it('should validate valid IANA timezones', () => {
      expect(isValidTimezone('America/New_York')).toBe(true);
      expect(isValidTimezone('Europe/London')).toBe(true);
      expect(isValidTimezone('Europe/Moscow')).toBe(true);
      expect(isValidTimezone('Asia/Tokyo')).toBe(true);
      expect(isValidTimezone('UTC')).toBe(true);
    });

    it('should reject invalid timezones', () => {
      expect(isValidTimezone('Invalid/Timezone')).toBe(false);
      expect(isValidTimezone('EST')).toBe(false); // Abbreviations not supported
      expect(isValidTimezone('')).toBe(false);
    });
  });

  describe('getCurrentTimezone', () => {
    it('should return current timezone', () => {
      const tz = getCurrentTimezone();
      expect(typeof tz).toBe('string');
      expect(tz.length).toBeGreaterThan(0);
      expect(isValidTimezone(tz)).toBe(true);
    });
  });

  describe('validateSchedule', () => {
    it('should validate one-time schedule', () => {
      const future = Date.now() + 60 * 60 * 1000; // 1 hour from now
      const errors = validateSchedule('one_time', future, undefined, 'UTC');
      expect(errors).toEqual([]);
    });

    it('should require scheduleAt for one-time', () => {
      const errors = validateSchedule('one_time', undefined, undefined, 'UTC');
      expect(errors).toContain('scheduleAt is required for one-time payments');
    });

    it('should reject past scheduleAt', () => {
      const past = Date.now() - 60 * 60 * 1000; // 1 hour ago
      const errors = validateSchedule('one_time', past, undefined, 'UTC');
      expect(errors).toContain('scheduleAt must be in the future');
    });

    it('should reject rrule for one-time', () => {
      const future = Date.now() + 60 * 60 * 1000;
      const errors = validateSchedule('one_time', future, 'FREQ=DAILY', 'UTC');
      expect(errors).toContain('rrule should not be set for one-time payments');
    });

    it('should validate recurring schedule', () => {
      const rrule = createDailyRRule(new Date());
      const errors = validateSchedule('recurring', undefined, rrule, 'UTC');
      expect(errors).toEqual([]);
    });

    it('should require rrule for recurring', () => {
      const errors = validateSchedule('recurring', undefined, undefined, 'UTC');
      expect(errors).toContain('rrule is required for recurring payments');
    });

    it('should reject scheduleAt for recurring', () => {
      const future = Date.now() + 60 * 60 * 1000;
      const rrule = createDailyRRule(new Date());
      const errors = validateSchedule('recurring', future, rrule, 'UTC');
      expect(errors).toContain('scheduleAt should not be set for recurring payments');
    });

    it('should reject invalid timezone', () => {
      const future = Date.now() + 60 * 60 * 1000;
      const errors = validateSchedule('one_time', future, undefined, 'Invalid/TZ');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('Invalid timezone');
    });
  });

  describe('computeNextRunAt - one_time', () => {
    it('should return scheduleAt for future one-time payment', () => {
      const future = Date.now() + 60 * 60 * 1000;
      const payment: ScheduledPayment = {
        id: 'test',
        kind: 'one_time',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: 'account1',
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amountHuman: '0.1',
        createdAt: Date.now(),
        scheduleAt: future,
        tz: 'UTC',
        status: 'scheduled',
        runCount: 0,
        failCount: 0,
      };

      const nextRun = computeNextRunAt(payment);
      expect(nextRun).toBe(future);
    });

    it('should return undefined for completed one-time payment', () => {
      const payment: ScheduledPayment = {
        id: 'test',
        kind: 'one_time',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: 'account1',
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amountHuman: '0.1',
        createdAt: Date.now(),
        scheduleAt: Date.now() - 60 * 60 * 1000,
        tz: 'UTC',
        status: 'completed',
        runCount: 1,
        failCount: 0,
      };

      const nextRun = computeNextRunAt(payment);
      expect(nextRun).toBeUndefined();
    });

    it('should return scheduleAt for past unrun payment', () => {
      const past = Date.now() - 60 * 1000; // 1 minute ago
      const payment: ScheduledPayment = {
        id: 'test',
        kind: 'one_time',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: 'account1',
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amountHuman: '0.1',
        createdAt: Date.now(),
        scheduleAt: past,
        tz: 'UTC',
        status: 'scheduled',
        runCount: 0,
        failCount: 0,
      };

      const nextRun = computeNextRunAt(payment);
      expect(nextRun).toBe(past);
    });
  });

  describe('computeNextRunAt - recurring', () => {
    it('should compute next run for daily recurring', () => {
      const startDate = new Date();
      startDate.setHours(9, 0, 0, 0);
      const rrule = createDailyRRule(startDate);

      const payment: ScheduledPayment = {
        id: 'test',
        kind: 'recurring',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: 'account1',
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amountHuman: '0.1',
        createdAt: Date.now(),
        rrule,
        tz: 'UTC',
        status: 'scheduled',
        runCount: 0,
        failCount: 0,
      };

      const nextRun = computeNextRunAt(payment);
      expect(nextRun).toBeDefined();
      expect(nextRun!).toBeGreaterThan(Date.now());
    });

    it('should return undefined for paused recurring', () => {
      const rrule = createDailyRRule(new Date());
      const payment: ScheduledPayment = {
        id: 'test',
        kind: 'recurring',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: 'account1',
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amountHuman: '0.1',
        createdAt: Date.now(),
        rrule,
        tz: 'UTC',
        status: 'paused',
        runCount: 0,
        failCount: 0,
      };

      const nextRun = computeNextRunAt(payment);
      expect(nextRun).toBeUndefined();
    });
  });

  describe('RRULE creation', () => {
    it('should create daily RRULE', () => {
      const startDate = new Date('2025-01-01T00:00:00Z');
      const rrule = createDailyRRule(startDate, 9, 0);

      expect(rrule).toContain('FREQ=DAILY');
      expect(rrule).toContain('DTSTART');
    });

    it('should create weekly RRULE', () => {
      const startDate = new Date('2025-01-01T00:00:00Z');
      const weekdays = [0, 2, 4]; // Mon, Wed, Fri
      const rrule = createWeeklyRRule(startDate, weekdays, 9, 0);

      expect(rrule).toContain('FREQ=WEEKLY');
      expect(rrule).toContain('BYDAY');
    });

    it('should create monthly RRULE', () => {
      const startDate = new Date('2025-01-01T00:00:00Z');
      const rrule = createMonthlyRRule(startDate, 15, 9, 0);

      expect(rrule).toContain('FREQ=MONTHLY');
      expect(rrule).toContain('BYMONTHDAY');
    });
  });

  describe('Timezone handling', () => {
    it('should handle different timezones', () => {
      const timezones = [
        'America/New_York',
        'Europe/London',
        'Europe/Moscow',
        'Asia/Tokyo',
        'Australia/Sydney',
      ];

      for (const tz of timezones) {
        const startDate = new Date();
        const rrule = createDailyRRule(startDate, 9, 0);

        const payment: ScheduledPayment = {
          id: 'test',
          kind: 'recurring',
          chainId: 11155111,
          asset: { type: 'ETH' },
          fromAccountId: 'account1',
          to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          amountHuman: '0.1',
          createdAt: Date.now(),
          rrule,
          tz,
          status: 'scheduled',
          runCount: 0,
          failCount: 0,
        };

        const nextRun = computeNextRunAt(payment);
        expect(nextRun).toBeDefined();
        console.log(`${tz}: ${new Date(nextRun!).toISOString()}`);
      }
    });
  });
});
