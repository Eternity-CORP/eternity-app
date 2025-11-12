/**
 * Unit Tests: Fee Caps
 * 
 * Tests for fee cap checking and warnings:
 * - Fee cap enforcement
 * - Warning thresholds
 * - Batch fee checking
 * - Localization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ethers, BigNumber } from 'ethers';
import {
  checkFeeCap,
  checkBatchFeeCap,
  generateFeeWarning,
  saveFeeCapSettings,
  loadFeeCapSettings,
  resetFeeCapSettings,
} from '../feeCaps';

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

describe('Fee Caps', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await resetFeeCapSettings();
  });

  afterEach(async () => {
    await resetFeeCapSettings();
  });

  describe('Settings Management', () => {
    it('should load default settings', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(null);
      
      const settings = await loadFeeCapSettings();
      
      expect(settings.enabled).toBe(true);
      expect(settings.maxFeePerTxETH).toBe('0.01');
      expect(settings.warnThresholdETH).toBe('0.005');
    });

    it('should save and load custom settings', async () => {
      const customSettings = {
        enabled: true,
        maxFeePerTxETH: '0.02',
        warnThresholdETH: '0.01',
      };
      
      await saveFeeCapSettings(customSettings);
      
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Fee Cap Checking', () => {
    it('should allow fee below cap', async () => {
      const feeWei = ethers.utils.parseEther('0.005'); // 0.005 ETH
      
      const check = await checkFeeCap(feeWei);
      
      expect(check.allowed).toBe(true);
      expect(check.reason).toBe('approved');
      expect(check.feeETH).toBe('0.005');
    });

    it('should block fee above cap', async () => {
      const feeWei = ethers.utils.parseEther('0.02'); // 0.02 ETH (above 0.01 cap)
      
      const check = await checkFeeCap(feeWei);
      
      expect(check.allowed).toBe(false);
      expect(check.reason).toBe('cap_exceeded');
      expect(check.exceedsBy).toBeDefined();
    });

    it('should warn at threshold', async () => {
      const feeWei = ethers.utils.parseEther('0.006'); // Above 0.005 warning
      
      const check = await checkFeeCap(feeWei);
      
      expect(check.allowed).toBe(true);
      expect(check.reason).toBe('warning_threshold');
    });

    it('should calculate USD amounts', async () => {
      const feeWei = ethers.utils.parseEther('0.005');
      const ethPriceUSD = 2000;
      
      const check = await checkFeeCap(feeWei, ethPriceUSD);
      
      expect(check.feeUSD).toBe('10.00'); // 0.005 * 2000
    });

    it('should respect disabled cap', async () => {
      await saveFeeCapSettings({ enabled: false });
      
      const feeWei = ethers.utils.parseEther('1.0'); // Way above cap
      const check = await checkFeeCap(feeWei);
      
      expect(check.allowed).toBe(true);
      expect(check.reason).toBe('approved');
    });
  });

  describe('Batch Fee Checking', () => {
    it('should check batch fees', async () => {
      const perTxFeeWei = ethers.utils.parseEther('0.003');
      const txCount = 3;
      
      const check = await checkBatchFeeCap(perTxFeeWei, txCount);
      
      expect(check.txCount).toBe(3);
      expect(check.perTxFeeETH).toBe('0.003');
      expect(check.totalFeeETH).toBe('0.009'); // 0.003 * 3
      expect(check.allowed).toBe(true);
    });

    it('should block if per-tx fee exceeds cap', async () => {
      const perTxFeeWei = ethers.utils.parseEther('0.02'); // Above cap
      const txCount = 2;
      
      const check = await checkBatchFeeCap(perTxFeeWei, txCount);
      
      expect(check.allowed).toBe(false);
      expect(check.reason).toBe('cap_exceeded');
    });

    it('should warn on high batch total', async () => {
      const perTxFeeWei = ethers.utils.parseEther('0.008'); // Below cap individually
      const txCount = 5; // But total is high
      
      const check = await checkBatchFeeCap(perTxFeeWei, txCount);
      
      expect(check.allowed).toBe(true);
      expect(check.totalFeeETH).toBe('0.04'); // 0.008 * 5
    });

    it('should calculate batch USD amounts', async () => {
      const perTxFeeWei = ethers.utils.parseEther('0.005');
      const txCount = 2;
      const ethPriceUSD = 2000;
      
      const check = await checkBatchFeeCap(perTxFeeWei, txCount, ethPriceUSD);
      
      expect(check.perTxFeeUSD).toBe('10.00');
      expect(check.totalFeeUSD).toBe('20.00');
    });
  });

  describe('Warning Generation', () => {
    it('should generate cap exceeded warning', async () => {
      const feeWei = ethers.utils.parseEther('0.02');
      const check = await checkFeeCap(feeWei);
      
      const warning = generateFeeWarning(check, 'en');
      
      expect(warning.level).toBe('error');
      expect(warning.title).toContain('Cap Exceeded');
      expect(warning.message).toContain('0.02');
    });

    it('should generate high fee warning', async () => {
      const feeWei = ethers.utils.parseEther('0.006');
      const check = await checkFeeCap(feeWei);
      
      const warning = generateFeeWarning(check, 'en');
      
      expect(warning.level).toBe('warning');
      expect(warning.title).toContain('High');
    });

    it('should generate normal fee info', async () => {
      const feeWei = ethers.utils.parseEther('0.003');
      const check = await checkFeeCap(feeWei);
      
      const warning = generateFeeWarning(check, 'en');
      
      expect(warning.level).toBe('info');
      expect(warning.title).toContain('Normal');
    });

    it('should support Russian localization', async () => {
      const feeWei = ethers.utils.parseEther('0.02');
      const check = await checkFeeCap(feeWei);
      
      const warning = generateFeeWarning(check, 'ru');
      
      expect(warning.title).toContain('лимит');
      expect(warning.message).toContain('комиссия');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero fee', async () => {
      const feeWei = BigNumber.from(0);
      
      const check = await checkFeeCap(feeWei);
      
      expect(check.allowed).toBe(true);
      expect(check.feeETH).toBe('0.0');
    });

    it('should handle very small fee', async () => {
      const feeWei = BigNumber.from(1); // 1 wei
      
      const check = await checkFeeCap(feeWei);
      
      expect(check.allowed).toBe(true);
    });

    it('should handle very large fee', async () => {
      const feeWei = ethers.utils.parseEther('100'); // 100 ETH
      
      const check = await checkFeeCap(feeWei);
      
      expect(check.allowed).toBe(false);
      expect(check.reason).toBe('cap_exceeded');
    });

    it('should handle exact cap amount', async () => {
      const feeWei = ethers.utils.parseEther('0.01'); // Exactly at cap
      
      const check = await checkFeeCap(feeWei);
      
      expect(check.allowed).toBe(true);
    });

    it('should handle 1 wei above cap', async () => {
      const capWei = ethers.utils.parseEther('0.01');
      const feeWei = capWei.add(1); // 1 wei above cap
      
      const check = await checkFeeCap(feeWei);
      
      expect(check.allowed).toBe(false);
    });
  });

  describe('Approval Requirements', () => {
    it('should require approval when enabled', async () => {
      await saveFeeCapSettings({ requireApprovalAtRun: true });
      
      const feeWei = ethers.utils.parseEther('0.003');
      const check = await checkFeeCap(feeWei);
      
      expect(check.requiresApproval).toBe(true);
    });

    it('should not require approval when disabled', async () => {
      await saveFeeCapSettings({ requireApprovalAtRun: false });
      
      const feeWei = ethers.utils.parseEther('0.003');
      const check = await checkFeeCap(feeWei);
      
      expect(check.requiresApproval).toBe(false);
    });

    it('should always require approval when cap exceeded', async () => {
      await saveFeeCapSettings({ requireApprovalAtRun: false });
      
      const feeWei = ethers.utils.parseEther('0.02'); // Above cap
      const check = await checkFeeCap(feeWei);
      
      expect(check.requiresApproval).toBe(true);
    });
  });
});
