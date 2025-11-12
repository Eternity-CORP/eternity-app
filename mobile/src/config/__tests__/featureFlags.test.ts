/**
 * Unit Tests: Feature Flags
 * 
 * Tests for mainnet feature flag system:
 * - Flag initialization
 * - Network detection
 * - Feature blocking
 * - Kill-switch functionality
 * - Environment variable overrides
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  featureFlags,
  getNetworkType,
  canUseScheduledPayments,
  canUseSplitBills,
  getScheduleDisabledReason,
  getSplitDisabledReason,
  assertScheduleEnabled,
  assertSplitEnabled,
  __testing__,
} from '../featureFlags';

describe('Feature Flags', () => {
  beforeEach(() => {
    // Reset flags before each test
    featureFlags.reset();
  });

  describe('Network Detection', () => {
    it('should detect Ethereum mainnet', () => {
      expect(getNetworkType(1)).toBe('mainnet');
    });

    it('should detect Polygon mainnet', () => {
      expect(getNetworkType(137)).toBe('mainnet');
    });

    it('should detect Sepolia testnet', () => {
      expect(getNetworkType(11155111)).toBe('testnet');
    });

    it('should detect Mumbai testnet', () => {
      expect(getNetworkType(80001)).toBe('testnet');
    });

    it('should detect Hardhat local', () => {
      expect(getNetworkType(31337)).toBe('local');
    });

    it('should default to testnet for unknown chains', () => {
      expect(getNetworkType(99999)).toBe('testnet');
    });
  });

  describe('Default Flags', () => {
    it('should have schedule enabled on testnet by default', () => {
      expect(featureFlags.isScheduleEnabled('testnet')).toBe(true);
    });

    it('should have schedule DISABLED on mainnet by default', () => {
      expect(featureFlags.isScheduleEnabled('mainnet')).toBe(false);
    });

    it('should have split enabled on testnet by default', () => {
      expect(featureFlags.isSplitEnabled('testnet')).toBe(true);
    });

    it('should have split DISABLED on mainnet by default', () => {
      expect(featureFlags.isSplitEnabled('mainnet')).toBe(false);
    });
  });

  describe('Scheduled Payments', () => {
    it('should allow scheduled payments on testnet', () => {
      expect(canUseScheduledPayments(11155111)).toBe(true); // Sepolia
    });

    it('should BLOCK scheduled payments on mainnet by default', () => {
      expect(canUseScheduledPayments(1)).toBe(false); // Ethereum mainnet
    });

    it('should allow scheduled payments on mainnet when flag enabled', () => {
      featureFlags.setFlag('scheduleMainnetEnabled', true);
      expect(canUseScheduledPayments(1)).toBe(true);
    });

    it('should provide disabled reason for mainnet', () => {
      const reason = getScheduleDisabledReason(1);
      expect(reason).toBeTruthy();
      expect(reason).toContain('mainnet');
    });

    it('should return null reason when enabled', () => {
      const reason = getScheduleDisabledReason(11155111); // Sepolia
      expect(reason).toBeNull();
    });

    it('should throw error when asserting disabled feature', () => {
      expect(() => assertScheduleEnabled(1)).toThrow('Scheduled payments disabled');
    });

    it('should not throw when asserting enabled feature', () => {
      expect(() => assertScheduleEnabled(11155111)).not.toThrow();
    });
  });

  describe('Split Bills', () => {
    it('should allow split bills on testnet', () => {
      expect(canUseSplitBills(11155111)).toBe(true); // Sepolia
    });

    it('should BLOCK split bills on mainnet by default', () => {
      expect(canUseSplitBills(1)).toBe(false); // Ethereum mainnet
    });

    it('should allow split bills on mainnet when flag enabled', () => {
      featureFlags.setFlag('splitMainnetEnabled', true);
      expect(canUseSplitBills(1)).toBe(true);
    });

    it('should provide disabled reason for mainnet', () => {
      const reason = getSplitDisabledReason(1);
      expect(reason).toBeTruthy();
      expect(reason).toContain('mainnet');
    });

    it('should return null reason when enabled', () => {
      const reason = getSplitDisabledReason(11155111); // Sepolia
      expect(reason).toBeNull();
    });

    it('should throw error when asserting disabled feature', () => {
      expect(() => assertSplitEnabled(1)).toThrow('Split bills disabled');
    });

    it('should not throw when asserting enabled feature', () => {
      expect(() => assertSplitEnabled(11155111)).not.toThrow();
    });
  });

  describe('Kill-Switch', () => {
    it('should disable schedule on testnet when flag set', () => {
      featureFlags.setFlag('scheduleTestnetEnabled', false);
      expect(canUseScheduledPayments(11155111)).toBe(false);
    });

    it('should disable split on testnet when flag set', () => {
      featureFlags.setFlag('splitTestnetEnabled', false);
      expect(canUseSplitBills(11155111)).toBe(false);
    });

    it('should enable schedule on mainnet when flag set', () => {
      featureFlags.setFlag('scheduleMainnetEnabled', true);
      expect(canUseScheduledPayments(1)).toBe(true);
    });

    it('should enable split on mainnet when flag set', () => {
      featureFlags.setFlag('splitMainnetEnabled', true);
      expect(canUseSplitBills(1)).toBe(true);
    });

    it('should allow re-disabling after enabling', () => {
      // Enable
      featureFlags.setFlag('scheduleMainnetEnabled', true);
      expect(canUseScheduledPayments(1)).toBe(true);

      // Disable (kill-switch)
      featureFlags.setFlag('scheduleMainnetEnabled', false);
      expect(canUseScheduledPayments(1)).toBe(false);
    });
  });

  describe('Multiple Networks', () => {
    it('should handle different mainnets independently', () => {
      expect(canUseScheduledPayments(1)).toBe(false); // Ethereum
      expect(canUseScheduledPayments(137)).toBe(false); // Polygon
      expect(canUseScheduledPayments(56)).toBe(false); // BSC
    });

    it('should handle different testnets independently', () => {
      expect(canUseScheduledPayments(11155111)).toBe(true); // Sepolia
      expect(canUseScheduledPayments(80001)).toBe(true); // Mumbai
      expect(canUseScheduledPayments(97)).toBe(true); // BSC Testnet
    });

    it('should treat local networks as testnet', () => {
      expect(canUseScheduledPayments(31337)).toBe(true); // Hardhat
      expect(canUseScheduledPayments(1337)).toBe(true); // Ganache
    });
  });

  describe('Flag Manager', () => {
    it('should get all flags', () => {
      const flags = featureFlags.getAll();
      expect(flags).toHaveProperty('scheduleMainnetEnabled');
      expect(flags).toHaveProperty('splitMainnetEnabled');
    });

    it('should check recurring payments flag', () => {
      expect(featureFlags.isRecurringEnabled()).toBe(true);
    });

    it('should check batch transactions flag', () => {
      expect(featureFlags.isBatchEnabled()).toBe(true);
    });

    it('should update individual flags', () => {
      featureFlags.setFlag('recurringPaymentsEnabled', false);
      expect(featureFlags.isRecurringEnabled()).toBe(false);
    });

    it('should reset to defaults', () => {
      featureFlags.setFlag('scheduleMainnetEnabled', true);
      featureFlags.reset();
      expect(featureFlags.isScheduleEnabled('mainnet')).toBe(false);
    });
  });

  describe('Environment Variables', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should load schedule mainnet flag from env', () => {
      process.env.SCHEDULE_MAINNET_ENABLED = 'true';
      const flags = __testing__.loadFlagsFromEnv();
      expect(flags.scheduleMainnetEnabled).toBe(true);
    });

    it('should load split mainnet flag from env', () => {
      process.env.SPLIT_MAINNET_ENABLED = 'true';
      const flags = __testing__.loadFlagsFromEnv();
      expect(flags.splitMainnetEnabled).toBe(true);
    });

    it('should handle false values from env', () => {
      process.env.SCHEDULE_MAINNET_ENABLED = 'false';
      const flags = __testing__.loadFlagsFromEnv();
      expect(flags.scheduleMainnetEnabled).toBe(false);
    });

    it('should ignore non-boolean env values', () => {
      process.env.SCHEDULE_MAINNET_ENABLED = 'maybe';
      const flags = __testing__.loadFlagsFromEnv();
      expect(flags.scheduleMainnetEnabled).toBe(false);
    });

    it('should not override if env var not set', () => {
      delete process.env.SCHEDULE_MAINNET_ENABLED;
      const flags = __testing__.loadFlagsFromEnv();
      expect(flags.scheduleMainnetEnabled).toBeUndefined();
    });
  });

  describe('Safety', () => {
    it('should default to BLOCKING on mainnet', () => {
      // Critical: mainnet should be blocked by default
      expect(canUseScheduledPayments(1)).toBe(false);
      expect(canUseSplitBills(1)).toBe(false);
    });

    it('should default to ALLOWING on testnet', () => {
      // Testnet should be open for testing
      expect(canUseScheduledPayments(11155111)).toBe(true);
      expect(canUseSplitBills(11155111)).toBe(true);
    });

    it('should treat unknown chains as testnet (safer)', () => {
      // Unknown chains default to testnet (safer than mainnet)
      expect(getNetworkType(99999)).toBe('testnet');
      expect(canUseScheduledPayments(99999)).toBe(true);
    });

    it('should provide clear error messages', () => {
      const scheduleReason = getScheduleDisabledReason(1);
      const splitReason = getSplitDisabledReason(1);

      expect(scheduleReason).toContain('not yet available');
      expect(scheduleReason).toContain('mainnet');
      expect(splitReason).toContain('not yet available');
      expect(splitReason).toContain('mainnet');
    });
  });

  describe('Edge Cases', () => {
    it('should handle chain ID 0', () => {
      expect(getNetworkType(0)).toBe('testnet');
    });

    it('should handle negative chain ID', () => {
      expect(getNetworkType(-1)).toBe('testnet');
    });

    it('should handle very large chain ID', () => {
      expect(getNetworkType(999999999)).toBe('testnet');
    });

    it('should handle multiple flag updates', () => {
      featureFlags.setFlag('scheduleMainnetEnabled', true);
      featureFlags.setFlag('scheduleMainnetEnabled', false);
      featureFlags.setFlag('scheduleMainnetEnabled', true);
      expect(canUseScheduledPayments(1)).toBe(true);
    });
  });
});
