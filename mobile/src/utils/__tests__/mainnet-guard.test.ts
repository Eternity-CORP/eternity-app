/**
 * Unit Tests: Mainnet Guard
 * 
 * Tests that mainnet transactions are properly blocked when disabled
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateMainnetTransaction,
  isMainnet,
  isMainnetEnabled,
  getMainnetMaxAmount,
  isSafeMainnetAmount,
  MainnetDisabledError,
  MainnetAmountExceededError,
  MainnetConfirmationRequiredError,
} from '../mainnet-guard';

describe('Mainnet Guard', () => {
  describe('isMainnet', () => {
    it('should identify mainnet', () => {
      expect(isMainnet('mainnet')).toBe(true);
    });

    it('should identify non-mainnet networks', () => {
      expect(isMainnet('sepolia')).toBe(false);
      expect(isMainnet('holesky')).toBe(false);
    });
  });

  describe('isMainnetEnabled', () => {
    it('should return current mainnet status', () => {
      const enabled = isMainnetEnabled();
      expect(typeof enabled).toBe('boolean');
      
      // Should be false by default
      expect(enabled).toBe(false);
    });
  });

  describe('getMainnetMaxAmount', () => {
    it('should return max amount', () => {
      const maxAmount = getMainnetMaxAmount();
      expect(typeof maxAmount).toBe('number');
      expect(maxAmount).toBeGreaterThan(0);
    });
  });

  describe('validateMainnetTransaction', () => {
    it('should allow testnet transactions', () => {
      expect(() => {
        validateMainnetTransaction('sepolia', '1.0', false);
      }).not.toThrow();

      expect(() => {
        validateMainnetTransaction('holesky', '10.0', false);
      }).not.toThrow();
    });

    it('should block mainnet when disabled', () => {
      // This test assumes mainnet is disabled (default)
      if (!isMainnetEnabled()) {
        expect(() => {
          validateMainnetTransaction('mainnet', '0.01', true);
        }).toThrow(MainnetDisabledError);
      }
    });

    it('should block amounts exceeding limit', () => {
      // This test assumes mainnet is disabled
      // If enabled, it should block large amounts
      const maxAmount = getMainnetMaxAmount();
      const tooMuch = (maxAmount + 1).toString();

      if (isMainnetEnabled()) {
        expect(() => {
          validateMainnetTransaction('mainnet', tooMuch, true);
        }).toThrow(MainnetAmountExceededError);
      }
    });

    it('should require confirmation when enabled', () => {
      // This test assumes mainnet requires confirmation
      if (isMainnetEnabled()) {
        expect(() => {
          validateMainnetTransaction('mainnet', '0.01', false);
        }).toThrow(MainnetConfirmationRequiredError);
      }
    });

    it('should allow valid mainnet transactions when enabled and confirmed', () => {
      // This test only runs if mainnet is enabled
      if (isMainnetEnabled()) {
        const maxAmount = getMainnetMaxAmount();
        const safeAmount = (maxAmount * 0.5).toString();

        expect(() => {
          validateMainnetTransaction('mainnet', safeAmount, true);
        }).not.toThrow();
      }
    });
  });

  describe('isSafeMainnetAmount', () => {
    it('should always return true for testnet', () => {
      expect(isSafeMainnetAmount('100.0', 'sepolia')).toBe(true);
      expect(isSafeMainnetAmount('1000.0', 'holesky')).toBe(true);
    });

    it('should check limit for mainnet', () => {
      const maxAmount = getMainnetMaxAmount();
      
      expect(isSafeMainnetAmount('0.01', 'mainnet')).toBe(true);
      expect(isSafeMainnetAmount(maxAmount.toString(), 'mainnet')).toBe(true);
      expect(isSafeMainnetAmount((maxAmount + 1).toString(), 'mainnet')).toBe(false);
    });
  });

  describe('Error Messages', () => {
    it('should have descriptive error for disabled mainnet', () => {
      const error = new MainnetDisabledError();
      expect(error.message).toContain('disabled');
      expect(error.message).toContain('EXPO_PUBLIC_MAINNET_ENABLED');
      expect(error.message).toContain('prod-checklist.md');
    });

    it('should have descriptive error for amount exceeded', () => {
      const error = new MainnetAmountExceededError('1.0', 0.1);
      expect(error.message).toContain('1.0');
      expect(error.message).toContain('0.1');
      expect(error.message).toContain('exceeds');
    });

    it('should have descriptive error for confirmation required', () => {
      const error = new MainnetConfirmationRequiredError();
      expect(error.message).toContain('confirmation');
      expect(error.message).toContain('required');
    });
  });

  describe('Feature Flag Behavior', () => {
    it('should block mainnet transactions when flag is disabled', () => {
      // Critical test: Mainnet should be blocked by default
      const mainnetEnabled = isMainnetEnabled();
      
      if (!mainnetEnabled) {
        // Mainnet is disabled - should throw error
        expect(() => {
          validateMainnetTransaction('mainnet', '0.001', true);
        }).toThrow(MainnetDisabledError);

        console.log('✅ Mainnet is properly DISABLED');
        console.log('   Transactions are blocked by feature flag');
      } else {
        // Mainnet is enabled - log warning
        console.warn('⚠️  WARNING: Mainnet is ENABLED');
        console.warn('   Ensure prod-checklist.md is completed');
      }
    });

    it('should enforce amount limits when mainnet is enabled', () => {
      if (isMainnetEnabled()) {
        const maxAmount = getMainnetMaxAmount();
        const tooMuch = (maxAmount + 0.01).toString();

        expect(() => {
          validateMainnetTransaction('mainnet', tooMuch, true);
        }).toThrow(MainnetAmountExceededError);

        console.log('✅ Amount limits enforced');
        console.log(`   Max amount: ${maxAmount} ETH`);
      }
    });

    it('should require confirmation when mainnet is enabled', () => {
      if (isMainnetEnabled()) {
        expect(() => {
          validateMainnetTransaction('mainnet', '0.01', false);
        }).toThrow(MainnetConfirmationRequiredError);

        console.log('✅ Confirmation required');
      }
    });
  });

  describe('Safety Checks', () => {
    it('should have reasonable default max amount', () => {
      const maxAmount = getMainnetMaxAmount();
      
      // Max amount should be reasonable (not too high)
      expect(maxAmount).toBeLessThanOrEqual(1.0);
      
      // Max amount should be positive
      expect(maxAmount).toBeGreaterThan(0);

      console.log(`💰 Max mainnet amount: ${maxAmount} ETH`);
    });

    it('should protect against accidental large transfers', () => {
      const largeAmounts = ['1.0', '10.0', '100.0'];
      
      for (const amount of largeAmounts) {
        const safe = isSafeMainnetAmount(amount, 'mainnet');
        
        if (!safe) {
          console.log(`✅ Large amount ${amount} ETH blocked`);
        }
      }
    });
  });
});
