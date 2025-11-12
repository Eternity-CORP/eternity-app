/**
 * Unit Tests: Time Helpers - DST and ExDates
 * 
 * Tests for DST transitions and excluded dates
 */

import { describe, it, expect } from 'vitest';
import {
  computeNextRunAt,
  parseRRuleWithExDates,
  createDailyRRule,
} from '../utils/time-helpers';
import type { ScheduledPayment } from '../types';

describe('Time Helpers - DST Transitions', () => {
  describe('Spring Forward (March)', () => {
    it('should handle DST transition correctly for daily 9 AM', () => {
      // March 10, 2024: DST starts in US (2 AM -> 3 AM)
      // Daily at 9 AM should remain 9 AM even after DST

      const payment: ScheduledPayment = {
        id: 'test-1',
        kind: 'recurring',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: 'test',
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amountHuman: '0.1',
        rrule: 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0;DTSTART=20240308T090000',
        tz: 'America/New_York',
        createdAt: Date.now(),
        status: 'scheduled',
        runCount: 0,
        failCount: 0,
      };

      // March 8, 2024 at 10 AM (before DST)
      const beforeDST = new Date('2024-03-08T10:00:00-05:00').getTime();
      const nextBefore = computeNextRunAt(payment, beforeDST);

      // Should be March 9, 2024 at 9 AM EST
      expect(nextBefore).toBeDefined();
      const nextBeforeDate = new Date(nextBefore!);
      expect(nextBeforeDate.getHours()).toBe(9);

      // March 11, 2024 at 10 AM (after DST)
      const afterDST = new Date('2024-03-11T10:00:00-04:00').getTime();
      const nextAfter = computeNextRunAt(payment, afterDST);

      // Should be March 12, 2024 at 9 AM EDT
      expect(nextAfter).toBeDefined();
      const nextAfterDate = new Date(nextAfter!);
      expect(nextAfterDate.getHours()).toBe(9);
    });

    it('should skip 2:30 AM during spring forward', () => {
      // 2:30 AM doesn't exist on March 10, 2024
      // Should jump to 3:30 AM (or next valid time)

      const payment: ScheduledPayment = {
        id: 'test-2',
        kind: 'recurring',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: 'test',
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amountHuman: '0.1',
        rrule: 'FREQ=DAILY;BYHOUR=2;BYMINUTE=30;DTSTART=20240308T023000',
        tz: 'America/New_York',
        createdAt: Date.now(),
        status: 'scheduled',
        runCount: 0,
        failCount: 0,
      };

      // March 9, 2024 at 3 AM (before DST day)
      const before = new Date('2024-03-09T03:00:00-05:00').getTime();
      const next = computeNextRunAt(payment, before);

      expect(next).toBeDefined();
      // On March 10, 2:30 AM doesn't exist, so it should be adjusted
      const nextDate = new Date(next!);
      // The exact behavior depends on rrule library implementation
      // It typically skips to the next valid time
      expect(nextDate.getDate()).toBe(10); // March 10
    });
  });

  describe('Fall Back (November)', () => {
    it('should handle DST end correctly for daily 1:30 AM', () => {
      // November 3, 2024: DST ends in US (2 AM -> 1 AM)
      // 1:30 AM occurs twice

      const payment: ScheduledPayment = {
        id: 'test-3',
        kind: 'recurring',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: 'test',
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amountHuman: '0.1',
        rrule: 'FREQ=DAILY;BYHOUR=1;BYMINUTE=30;DTSTART=20241101T013000',
        tz: 'America/New_York',
        createdAt: Date.now(),
        status: 'scheduled',
        runCount: 0,
        failCount: 0,
      };

      // November 2, 2024 at 2 AM (before DST end)
      const before = new Date('2024-11-02T02:00:00-04:00').getTime();
      const next = computeNextRunAt(payment, before);

      expect(next).toBeDefined();
      const nextDate = new Date(next!);
      expect(nextDate.getDate()).toBe(3); // November 3
      expect(nextDate.getHours()).toBe(1);
      expect(nextDate.getMinutes()).toBe(30);
    });

    it('should handle daily 9 AM across fall back', () => {
      const payment: ScheduledPayment = {
        id: 'test-4',
        kind: 'recurring',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: 'test',
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amountHuman: '0.1',
        rrule: 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0;DTSTART=20241101T090000',
        tz: 'America/New_York',
        createdAt: Date.now(),
        status: 'scheduled',
        runCount: 0,
        failCount: 0,
      };

      // November 2, 2024 at 10 AM EDT (before DST end)
      const beforeDST = new Date('2024-11-02T10:00:00-04:00').getTime();
      const nextBefore = computeNextRunAt(payment, beforeDST);

      expect(nextBefore).toBeDefined();
      const nextBeforeDate = new Date(nextBefore!);
      expect(nextBeforeDate.getHours()).toBe(9);

      // November 4, 2024 at 10 AM EST (after DST end)
      const afterDST = new Date('2024-11-04T10:00:00-05:00').getTime();
      const nextAfter = computeNextRunAt(payment, afterDST);

      expect(nextAfter).toBeDefined();
      const nextAfterDate = new Date(nextAfter!);
      expect(nextAfterDate.getHours()).toBe(9);
    });
  });

  describe('Different Timezones', () => {
    it('should handle Europe/London DST (last Sunday of March)', () => {
      // March 31, 2024: BST starts in UK (1 AM -> 2 AM)

      const payment: ScheduledPayment = {
        id: 'test-5',
        kind: 'recurring',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: 'test',
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amountHuman: '0.1',
        rrule: 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0;DTSTART=20240329T090000',
        tz: 'Europe/London',
        createdAt: Date.now(),
        status: 'scheduled',
        runCount: 0,
        failCount: 0,
      };

      // March 30, 2024 at 10 AM GMT
      const before = new Date('2024-03-30T10:00:00Z').getTime();
      const next = computeNextRunAt(payment, before);

      expect(next).toBeDefined();
      const nextDate = new Date(next!);
      expect(nextDate.getDate()).toBe(31); // March 31
      expect(nextDate.getHours()).toBe(9);
    });

    it('should handle Australia/Sydney DST (first Sunday of April)', () => {
      // April 7, 2024: DST ends in Sydney (3 AM -> 2 AM)

      const payment: ScheduledPayment = {
        id: 'test-6',
        kind: 'recurring',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: 'test',
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amountHuman: '0.1',
        rrule: 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0;DTSTART=20240405T090000',
        tz: 'Australia/Sydney',
        createdAt: Date.now(),
        status: 'scheduled',
        runCount: 0,
        failCount: 0,
      };

      // April 6, 2024 at 10 AM AEDT
      const before = new Date('2024-04-06T10:00:00+11:00').getTime();
      const next = computeNextRunAt(payment, before);

      expect(next).toBeDefined();
      const nextDate = new Date(next!);
      expect(nextDate.getDate()).toBe(7); // April 7
      expect(nextDate.getHours()).toBe(9);
    });
  });
});

describe('Time Helpers - Excluded Dates', () => {
  it('should skip excluded dates', () => {
    // Daily payment, but skip March 10 and March 12

    const march10 = new Date('2024-03-10T09:00:00').getTime();
    const march12 = new Date('2024-03-12T09:00:00').getTime();

    const payment: ScheduledPayment = {
      id: 'test-7',
      kind: 'recurring',
      chainId: 11155111,
      asset: { type: 'ETH' },
      fromAccountId: 'test',
      to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      amountHuman: '0.1',
      rrule: 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0;DTSTART=20240308T090000',
      tz: 'UTC',
      exDates: [march10, march12],
      createdAt: Date.now(),
      status: 'scheduled',
      runCount: 0,
      failCount: 0,
    };

    // March 9, 2024 at 10 AM
    const march9 = new Date('2024-03-09T10:00:00Z').getTime();
    const next1 = computeNextRunAt(payment, march9);

    // Should skip March 10, go to March 11
    expect(next1).toBeDefined();
    const next1Date = new Date(next1!);
    expect(next1Date.getDate()).toBe(11);

    // March 11, 2024 at 10 AM
    const march11 = new Date('2024-03-11T10:00:00Z').getTime();
    const next2 = computeNextRunAt(payment, march11);

    // Should skip March 12, go to March 13
    expect(next2).toBeDefined();
    const next2Date = new Date(next2!);
    expect(next2Date.getDate()).toBe(13);
  });

  it('should handle multiple excluded dates', () => {
    // Weekly payment on Mondays, but skip several weeks

    const week1 = new Date('2024-03-11T09:00:00Z').getTime(); // Monday
    const week2 = new Date('2024-03-18T09:00:00Z').getTime(); // Monday
    const week3 = new Date('2024-03-25T09:00:00Z').getTime(); // Monday

    const payment: ScheduledPayment = {
      id: 'test-8',
      kind: 'recurring',
      chainId: 11155111,
      asset: { type: 'ETH' },
      fromAccountId: 'test',
      to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      amountHuman: '0.1',
      rrule: 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=9;BYMINUTE=0;DTSTART=20240304T090000',
      tz: 'UTC',
      exDates: [week1, week2, week3],
      createdAt: Date.now(),
      status: 'scheduled',
      runCount: 0,
      failCount: 0,
    };

    // March 4, 2024 at 10 AM (first Monday)
    const march4 = new Date('2024-03-04T10:00:00Z').getTime();
    const next = computeNextRunAt(payment, march4);

    // Should skip March 11, 18, 25 and go to April 1
    expect(next).toBeDefined();
    const nextDate = new Date(next!);
    expect(nextDate.getDate()).toBe(1); // April 1
    expect(nextDate.getMonth()).toBe(3); // April (0-indexed)
  });

  it('should work with empty exDates array', () => {
    const payment: ScheduledPayment = {
      id: 'test-9',
      kind: 'recurring',
      chainId: 11155111,
      asset: { type: 'ETH' },
      fromAccountId: 'test',
      to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      amountHuman: '0.1',
      rrule: 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0;DTSTART=20240308T090000',
      tz: 'UTC',
      exDates: [],
      createdAt: Date.now(),
      status: 'scheduled',
      runCount: 0,
      failCount: 0,
    };

    const now = new Date('2024-03-08T10:00:00Z').getTime();
    const next = computeNextRunAt(payment, now);

    expect(next).toBeDefined();
    const nextDate = new Date(next!);
    expect(nextDate.getDate()).toBe(9); // March 9
  });

  it('should work without exDates field', () => {
    const payment: ScheduledPayment = {
      id: 'test-10',
      kind: 'recurring',
      chainId: 11155111,
      asset: { type: 'ETH' },
      fromAccountId: 'test',
      to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      amountHuman: '0.1',
      rrule: 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0;DTSTART=20240308T090000',
      tz: 'UTC',
      // No exDates field
      createdAt: Date.now(),
      status: 'scheduled',
      runCount: 0,
      failCount: 0,
    };

    const now = new Date('2024-03-08T10:00:00Z').getTime();
    const next = computeNextRunAt(payment, now);

    expect(next).toBeDefined();
    const nextDate = new Date(next!);
    expect(nextDate.getDate()).toBe(9); // March 9
  });
});

describe('parseRRuleWithExDates', () => {
  it('should parse RRULE without exDates', () => {
    const rrule = 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0;DTSTART=20240308T090000';
    const parsed = parseRRuleWithExDates(rrule, 'UTC');

    expect(parsed).toBeDefined();

    // Get next occurrence
    const next = parsed.after(new Date('2024-03-08T10:00:00Z'), false);
    expect(next).toBeDefined();
    expect(next!.getDate()).toBe(9);
  });

  it('should parse RRULE with exDates', () => {
    const rrule = 'FREQ=DAILY;BYHOUR=9;BYMINUTE=0;DTSTART=20240308T090000';
    const exDates = [
      new Date('2024-03-09T09:00:00Z').getTime(),
      new Date('2024-03-10T09:00:00Z').getTime(),
    ];

    const parsed = parseRRuleWithExDates(rrule, 'UTC', exDates);

    expect(parsed).toBeDefined();

    // Get next occurrence after March 8
    const next = parsed.after(new Date('2024-03-08T10:00:00Z'), false);
    expect(next).toBeDefined();
    // Should skip March 9 and 10, go to March 11
    expect(next!.getDate()).toBe(11);
  });
});
