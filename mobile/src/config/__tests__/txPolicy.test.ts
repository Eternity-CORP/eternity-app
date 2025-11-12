/**
 * Unit Tests: Transaction Policy
 * 
 * Tests for retry policies and backoff:
 * - Retry delay calculation
 * - Fee bump calculation
 * - Retry decision logic
 * - Retry history tracking
 */

import { describe, it, expect } from 'vitest';
import { ethers, BigNumber } from 'ethers';
import {
  calculateRetryDelay,
  calculateFeeBump,
  shouldRetry,
  isRetryableError,
  createRetryHistory,
  recordRetryAttempt,
  formatRetryDelay,
  SCHEDULED_PAYMENT_RETRY_POLICY,
  SPLIT_PAYMENT_RETRY_POLICY,
  REGULAR_TRANSACTION_RETRY_POLICY,
} from '../txPolicy';

describe('Transaction Policy', () => {
  describe('Retry Delay Calculation', () => {
    it('should calculate exponential backoff', () => {
      const policy = SCHEDULED_PAYMENT_RETRY_POLICY;
      
      const delay1 = calculateRetryDelay(1, policy);
      const delay2 = calculateRetryDelay(2, policy);
      const delay3 = calculateRetryDelay(3, policy);
      
      // 2^0 * 60000 = 60000
      expect(delay1).toBe(60000);
      // 2^1 * 60000 = 120000
      expect(delay2).toBe(120000);
      // 2^2 * 60000 = 240000
      expect(delay3).toBe(240000);
    });

    it('should cap at max delay', () => {
      const policy = SCHEDULED_PAYMENT_RETRY_POLICY;
      
      const delay10 = calculateRetryDelay(10, policy);
      
      // Should be capped at maxDelayMs (3600000)
      expect(delay10).toBe(3600000);
    });

    it('should calculate linear backoff', () => {
      const policy = REGULAR_TRANSACTION_RETRY_POLICY;
      
      const delay1 = calculateRetryDelay(1, policy);
      const delay2 = calculateRetryDelay(2, policy);
      const delay3 = calculateRetryDelay(3, policy);
      
      // 1 * 2000 = 2000
      expect(delay1).toBe(2000);
      // 2 * 2000 = 4000
      expect(delay2).toBe(4000);
      // 3 * 2000 = 6000
      expect(delay3).toBe(6000);
    });

    it('should calculate fixed delay', () => {
      const policy = SPLIT_PAYMENT_RETRY_POLICY;
      
      const delay1 = calculateRetryDelay(1, policy);
      const delay2 = calculateRetryDelay(2, policy);
      const delay3 = calculateRetryDelay(3, policy);
      
      // Always baseDelayMs
      expect(delay1).toBe(5000);
      expect(delay2).toBe(5000);
      expect(delay3).toBe(5000);
    });
  });

  describe('Fee Bump Calculation', () => {
    it('should calculate fee bump with default multiplier', () => {
      const originalFee = ethers.utils.parseUnits('10', 'gwei');
      
      const bump1 = calculateFeeBump(originalFee, 1);
      const bump2 = calculateFeeBump(originalFee, 2);
      
      // 10 * 1.125 = 11.25
      expect(ethers.utils.formatUnits(bump1, 'gwei')).toBe('11.25');
      // 10 * 1.125^2 = 12.656...
      expect(parseFloat(ethers.utils.formatUnits(bump2, 'gwei'))).toBeCloseTo(12.656, 2);
    });

    it('should calculate fee bump with custom multiplier', () => {
      const originalFee = ethers.utils.parseUnits('10', 'gwei');
      
      const bump1 = calculateFeeBump(originalFee, 1, 1.5);
      
      // 10 * 1.5 = 15
      expect(ethers.utils.formatUnits(bump1, 'gwei')).toBe('15.0');
    });

    it('should compound fee bumps', () => {
      const originalFee = ethers.utils.parseUnits('10', 'gwei');
      
      const bump1 = calculateFeeBump(originalFee, 1, 1.2);
      const bump2 = calculateFeeBump(originalFee, 2, 1.2);
      const bump3 = calculateFeeBump(originalFee, 3, 1.2);
      
      // 10 * 1.2 = 12
      expect(ethers.utils.formatUnits(bump1, 'gwei')).toBe('12.0');
      // 10 * 1.2^2 = 14.4
      expect(ethers.utils.formatUnits(bump2, 'gwei')).toBe('14.4');
      // 10 * 1.2^3 = 17.28
      expect(ethers.utils.formatUnits(bump3, 'gwei')).toBe('17.28');
    });

    it('should handle zero fee', () => {
      const originalFee = BigNumber.from(0);
      
      const bump = calculateFeeBump(originalFee, 1);
      
      expect(bump.toString()).toBe('0');
    });
  });

  describe('Retry Decision Logic', () => {
    it('should retry retryable errors', () => {
      const policy = SCHEDULED_PAYMENT_RETRY_POLICY;
      
      expect(shouldRetry(1, 'INSUFFICIENT_FUNDS', policy)).toBe(true);
      expect(shouldRetry(1, 'NONCE_TOO_LOW', policy)).toBe(true);
      expect(shouldRetry(1, 'TIMEOUT', policy)).toBe(true);
    });

    it('should not retry non-retryable errors', () => {
      const policy = SCHEDULED_PAYMENT_RETRY_POLICY;
      
      expect(shouldRetry(1, 'EXECUTION_REVERTED', policy)).toBe(false);
      expect(shouldRetry(1, 'USER_REJECTED', policy)).toBe(false);
    });

    it('should not retry after max attempts', () => {
      const policy = SCHEDULED_PAYMENT_RETRY_POLICY;
      
      expect(shouldRetry(5, 'INSUFFICIENT_FUNDS', policy)).toBe(false);
      expect(shouldRetry(6, 'TIMEOUT', policy)).toBe(false);
    });

    it('should check if error is retryable', () => {
      const policy = SCHEDULED_PAYMENT_RETRY_POLICY;
      
      expect(isRetryableError('INSUFFICIENT_FUNDS', policy)).toBe(true);
      expect(isRetryableError('NETWORK_ERROR', policy)).toBe(true);
      expect(isRetryableError('EXECUTION_REVERTED', policy)).toBe(false);
    });
  });

  describe('Retry History', () => {
    it('should create empty retry history', () => {
      const history = createRetryHistory();
      
      expect(history.totalAttempts).toBe(0);
      expect(history.attempts).toHaveLength(0);
      expect(history.lastAttempt).toBeUndefined();
    });

    it('should record retry attempt', () => {
      let history = createRetryHistory();
      
      const attempt = {
        attempt: 1,
        timestamp: Date.now(),
        errorCode: 'INSUFFICIENT_FUNDS',
        errorMessage: 'insufficient funds',
        delayMs: 60000,
      };
      
      history = recordRetryAttempt(history, attempt);
      
      expect(history.totalAttempts).toBe(1);
      expect(history.attempts).toHaveLength(1);
      expect(history.lastAttempt).toEqual(attempt);
      expect(history.nextRetryAt).toBeDefined();
    });

    it('should track multiple attempts', () => {
      let history = createRetryHistory();
      
      const attempt1 = {
        attempt: 1,
        timestamp: Date.now(),
        errorCode: 'TIMEOUT',
        errorMessage: 'timeout',
        delayMs: 60000,
      };
      
      const attempt2 = {
        attempt: 2,
        timestamp: Date.now() + 60000,
        errorCode: 'TIMEOUT',
        errorMessage: 'timeout',
        delayMs: 120000,
      };
      
      history = recordRetryAttempt(history, attempt1);
      history = recordRetryAttempt(history, attempt2);
      
      expect(history.totalAttempts).toBe(2);
      expect(history.attempts).toHaveLength(2);
      expect(history.lastAttempt).toEqual(attempt2);
    });

    it('should record fee bump in history', () => {
      let history = createRetryHistory();
      
      const attempt = {
        attempt: 1,
        timestamp: Date.now(),
        errorCode: 'REPLACEMENT_UNDERPRICED',
        errorMessage: 'replacement underpriced',
        delayMs: 5000,
        feeBump: '11.25 Gwei',
      };
      
      history = recordRetryAttempt(history, attempt);
      
      expect(history.lastAttempt?.feeBump).toBe('11.25 Gwei');
    });
  });

  describe('Delay Formatting', () => {
    it('should format seconds', () => {
      expect(formatRetryDelay(5000)).toBe('5s');
      expect(formatRetryDelay(30000)).toBe('30s');
    });

    it('should format minutes and seconds', () => {
      expect(formatRetryDelay(90000)).toBe('1m 30s');
      expect(formatRetryDelay(150000)).toBe('2m 30s');
    });

    it('should format hours and minutes', () => {
      expect(formatRetryDelay(3600000)).toBe('1h 0m');
      expect(formatRetryDelay(3900000)).toBe('1h 5m');
    });

    it('should handle zero delay', () => {
      expect(formatRetryDelay(0)).toBe('0s');
    });
  });

  describe('Policy Configuration', () => {
    it('should have scheduled payment policy', () => {
      expect(SCHEDULED_PAYMENT_RETRY_POLICY.maxAttempts).toBe(5);
      expect(SCHEDULED_PAYMENT_RETRY_POLICY.backoffStrategy).toBe('exponential');
      expect(SCHEDULED_PAYMENT_RETRY_POLICY.pauseAfterFailures).toBe(3);
    });

    it('should have split payment policy', () => {
      expect(SPLIT_PAYMENT_RETRY_POLICY.maxAttempts).toBe(3);
      expect(SPLIT_PAYMENT_RETRY_POLICY.backoffStrategy).toBe('fixed');
      expect(SPLIT_PAYMENT_RETRY_POLICY.feeBumpMultiplier).toBe(1.125);
      expect(SPLIT_PAYMENT_RETRY_POLICY.maxRetriesPerParticipant).toBe(2);
    });

    it('should have regular transaction policy', () => {
      expect(REGULAR_TRANSACTION_RETRY_POLICY.maxAttempts).toBe(3);
      expect(REGULAR_TRANSACTION_RETRY_POLICY.backoffStrategy).toBe('linear');
    });
  });

  describe('Edge Cases', () => {
    it('should handle attempt 0', () => {
      const policy = SCHEDULED_PAYMENT_RETRY_POLICY;
      const delay = calculateRetryDelay(0, policy);
      
      // 2^-1 * 60000 = 30000
      expect(delay).toBe(30000);
    });

    it('should handle very large attempt number', () => {
      const policy = SCHEDULED_PAYMENT_RETRY_POLICY;
      const delay = calculateRetryDelay(100, policy);
      
      // Should be capped at maxDelayMs
      expect(delay).toBe(3600000);
    });

    it('should handle very small fee', () => {
      const originalFee = BigNumber.from(1);
      const bump = calculateFeeBump(originalFee, 1);
      
      expect(bump.toNumber()).toBeGreaterThan(0);
    });
  });
});
