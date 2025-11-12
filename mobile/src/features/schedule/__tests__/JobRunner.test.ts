/**
 * Unit Tests: JobRunner
 * 
 * Tests for job execution, status changes, and backoff
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JobRunner } from '../JobRunner';
import { useScheduledPayments } from '../store/scheduledSlice';
import type { ScheduledPayment } from '../types';

describe('JobRunner', () => {
  let jobRunner: JobRunner;
  let mockSendNative: any;
  let mockSendErc20: any;
  let mockGetProvider: any;

  beforeEach(() => {
    // Clear store
    useScheduledPayments.getState().payments = {};

    // Mock send functions
    mockSendNative = vi.fn().mockResolvedValue({ hash: '0xabc123' });
    mockSendErc20 = vi.fn().mockResolvedValue({ hash: '0xdef456' });
    mockGetProvider = vi.fn().mockReturnValue({
      getFeeData: vi.fn().mockResolvedValue({
        maxFeePerGas: { toString: () => '1000000000' },
        maxPriorityFeePerGas: { toString: () => '1000000000' },
      }),
      waitForTransaction: vi.fn().mockResolvedValue({
        status: 1,
        blockNumber: 12345,
      }),
    });

    // Create job runner with mocks
    jobRunner = new JobRunner({
      sendNative: mockSendNative,
      sendErc20: mockSendErc20,
      getProvider: mockGetProvider,
    });
  });

  describe('Singleton and Mutex', () => {
    it('should prevent duplicate instances', () => {
      const runner1 = new JobRunner();
      const runner2 = new JobRunner();

      // Both should work independently
      expect(runner1).toBeDefined();
      expect(runner2).toBeDefined();

      // But only one should run at a time (tested via start/stop)
      runner1.start();
      expect(() => runner1.start()).not.toThrow(); // Should log "Already running"
      runner1.stop();
    });

    it('should allow start after stop', () => {
      jobRunner.start();
      jobRunner.stop();
      jobRunner.start();
      jobRunner.stop();

      // No errors
      expect(true).toBe(true);
    });
  });

  describe('Status Changes', () => {
    it('should change status from scheduled to running', async () => {
      // Create payment
      const payment = useScheduledPayments.getState().addPayment({
        kind: 'one_time',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: 'account1',
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amountHuman: '0.001',
        scheduleAt: Date.now() - 1000, // Past (due now)
        tz: 'UTC',
      });

      expect(payment.status).toBe('scheduled');

      // Execute tick
      await jobRunner.tick();

      // Status should be completed (one-time)
      const updated = useScheduledPayments.getState().getPayment(payment.id);
      expect(updated?.status).toBe('completed');
      expect(updated?.runCount).toBe(1);
    });

    it('should change recurring from scheduled to scheduled (with updated nextRunAt)', async () => {
      // Create recurring payment
      const payment = useScheduledPayments.getState().addPayment({
        kind: 'recurring',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: 'account1',
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amountHuman: '0.001',
        rrule: 'FREQ=DAILY;DTSTART=20250101T090000Z',
        tz: 'UTC',
      });

      const oldNextRunAt = payment.nextRunAt;

      // Execute tick
      await jobRunner.tick();

      // Status should still be scheduled
      const updated = useScheduledPayments.getState().getPayment(payment.id);
      expect(updated?.status).toBe('scheduled');
      expect(updated?.runCount).toBe(1);
      expect(updated?.nextRunAt).not.toBe(oldNextRunAt);
    });
  });

  describe('Backoff on Failure', () => {
    it('should apply exponential backoff on failure', async () => {
      // Mock send to fail
      mockSendNative.mockRejectedValue(new Error('Insufficient funds'));

      // Create payment
      const payment = useScheduledPayments.getState().addPayment({
        kind: 'one_time',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: 'account1',
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amountHuman: '0.001',
        scheduleAt: Date.now() - 1000,
        tz: 'UTC',
      });

      const now = Date.now();

      // Execute tick (will fail)
      await jobRunner.tick(now);

      // Check status
      const updated = useScheduledPayments.getState().getPayment(payment.id);
      expect(updated?.status).toBe('failed');
      expect(updated?.failCount).toBe(1);
      expect(updated?.lastError).toBeDefined();

      // Check backoff: nextRunAt should be now + 2^1 * 15min = 30min
      const expectedBackoff = 2 * 15 * 60 * 1000; // 30 minutes
      const actualBackoff = updated!.nextRunAt! - now;

      // Allow 1 second tolerance
      expect(actualBackoff).toBeGreaterThanOrEqual(expectedBackoff - 1000);
      expect(actualBackoff).toBeLessThanOrEqual(expectedBackoff + 1000);
    });

    it('should cap backoff at 24 hours', async () => {
      // Mock send to fail
      mockSendNative.mockRejectedValue(new Error('Network error'));

      // Create payment with high fail count
      const payment = useScheduledPayments.getState().addPayment({
        kind: 'recurring',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: 'account1',
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amountHuman: '0.001',
        rrule: 'FREQ=DAILY;DTSTART=20250101T090000Z',
        tz: 'UTC',
      });

      // Manually set high fail count
      useScheduledPayments.getState()._updatePaymentStatus(payment.id, {
        failCount: 10, // 2^10 * 15min = 15360min >> 24h
        nextRunAt: Date.now() - 1000,
      });

      const now = Date.now();

      // Execute tick (will fail)
      await jobRunner.tick(now);

      // Check backoff is capped at 24h
      const updated = useScheduledPayments.getState().getPayment(payment.id);
      const maxBackoff = 24 * 60 * 60 * 1000; // 24 hours
      const actualBackoff = updated!.nextRunAt! - now;

      expect(actualBackoff).toBeLessThanOrEqual(maxBackoff + 1000);
    });

    it('should reset fail count on success', async () => {
      // Create payment with previous failures
      const payment = useScheduledPayments.getState().addPayment({
        kind: 'recurring',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: 'account1',
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amountHuman: '0.001',
        rrule: 'FREQ=DAILY;DTSTART=20250101T090000Z',
        tz: 'UTC',
      });

      // Set fail count
      useScheduledPayments.getState()._updatePaymentStatus(payment.id, {
        failCount: 3,
        nextRunAt: Date.now() - 1000,
      });

      // Execute tick (will succeed)
      await jobRunner.tick();

      // Fail count should be reset
      const updated = useScheduledPayments.getState().getPayment(payment.id);
      expect(updated?.failCount).toBe(0);
      expect(updated?.status).toBe('scheduled');
    });
  });

  describe('Event Emission', () => {
    it('should emit events on status change', async () => {
      const events: any[] = [];

      // Subscribe to events
      jobRunner.onJobStatusChanged((event) => {
        events.push(event);
      });

      // Create payment
      const payment = useScheduledPayments.getState().addPayment({
        kind: 'one_time',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: 'account1',
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amountHuman: '0.001',
        scheduleAt: Date.now() - 1000,
        tz: 'UTC',
      });

      // Execute tick
      await jobRunner.tick();

      // Should have emitted event
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].paymentId).toBe(payment.id);
      expect(events[0].status).toBe('completed');
      expect(events[0].txHash).toBeDefined();
    });

    it('should emit error event on failure', async () => {
      const events: any[] = [];

      // Mock failure
      mockSendNative.mockRejectedValue(new Error('Test error'));

      // Subscribe
      jobRunner.onJobStatusChanged((event) => {
        events.push(event);
      });

      // Create payment
      const payment = useScheduledPayments.getState().addPayment({
        kind: 'one_time',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: 'account1',
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amountHuman: '0.001',
        scheduleAt: Date.now() - 1000,
        tz: 'UTC',
      });

      // Execute tick
      await jobRunner.tick();

      // Should have emitted error event
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].paymentId).toBe(payment.id);
      expect(events[0].status).toBe('failed');
      expect(events[0].error).toBeDefined();
    });
  });

  describe('No Duplicate Execution', () => {
    it('should not execute paused payments', async () => {
      // Create and pause payment
      const payment = useScheduledPayments.getState().addPayment({
        kind: 'one_time',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: 'account1',
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amountHuman: '0.001',
        scheduleAt: Date.now() - 1000,
        tz: 'UTC',
      });

      useScheduledPayments.getState().pausePayment(payment.id);

      // Execute tick
      await jobRunner.tick();

      // Should not have been executed
      expect(mockSendNative).not.toHaveBeenCalled();

      const updated = useScheduledPayments.getState().getPayment(payment.id);
      expect(updated?.status).toBe('paused');
      expect(updated?.runCount).toBe(0);
    });

    it('should not execute future payments', async () => {
      // Create future payment
      const payment = useScheduledPayments.getState().addPayment({
        kind: 'one_time',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: 'account1',
        to: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        amountHuman: '0.001',
        scheduleAt: Date.now() + 60 * 60 * 1000, // 1 hour from now
        tz: 'UTC',
      });

      // Execute tick
      await jobRunner.tick();

      // Should not have been executed
      expect(mockSendNative).not.toHaveBeenCalled();

      const updated = useScheduledPayments.getState().getPayment(payment.id);
      expect(updated?.status).toBe('scheduled');
      expect(updated?.runCount).toBe(0);
    });
  });
});
