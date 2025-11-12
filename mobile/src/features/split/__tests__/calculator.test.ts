/**
 * Unit Tests: Split Calculator
 * 
 * Tests for split calculations with:
 * - Equal and weighted modes
 * - Rounding strategies
 * - Remainder distribution
 * - Edge cases
 */

import { describe, it, expect } from 'vitest';
import { calculateSplit } from '../utils/calculator';
import type { CalculationConfig } from '../types';

describe('Split Calculator', () => {
  describe('Equal Split', () => {
    it('should split equally among 2 participants', () => {
      const config: CalculationConfig = {
        totalHuman: '100',
        tipPercent: 0,
        mode: 'equal',
        participants: [
          { id: 'p1' },
          { id: 'p2' },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        decimals: 18,
      };

      const result = calculateSplit(config);

      expect(result.participantAmounts).toHaveLength(2);
      expect(result.sumMatches).toBe(true);
      
      // Each should get 50 ETH
      result.participantAmounts.forEach((amount) => {
        expect(amount.amountHuman).toBe('50.0');
      });
    });

    it('should split equally among 3 participants with remainder', () => {
      const config: CalculationConfig = {
        totalHuman: '100',
        tipPercent: 0,
        mode: 'equal',
        participants: [
          { id: 'p1' },
          { id: 'p2' },
          { id: 'p3' },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        decimals: 18,
      };

      const result = calculateSplit(config);

      expect(result.participantAmounts).toHaveLength(3);
      expect(result.sumMatches).toBe(true);
      
      // 100 / 3 = 33.333...
      // Floor: 33.333... each, remainder goes to first
      const amounts = result.participantAmounts.map((a) => a.amountSmallestUnit);
      
      // Sum should equal total
      const sum = amounts.reduce((s, a) => s + BigInt(a), BigInt(0));
      expect(sum.toString()).toBe(result.totalWithTipSmallestUnit);
    });

    it('should handle 1 participant', () => {
      const config: CalculationConfig = {
        totalHuman: '100',
        tipPercent: 0,
        mode: 'equal',
        participants: [{ id: 'p1' }],
        rounding: 'floor',
        remainderStrategy: 'first',
        decimals: 18,
      };

      const result = calculateSplit(config);

      expect(result.participantAmounts).toHaveLength(1);
      expect(result.participantAmounts[0].amountHuman).toBe('100.0');
      expect(result.sumMatches).toBe(true);
    });
  });

  describe('Weighted Split', () => {
    it('should split by weights (2:1)', () => {
      const config: CalculationConfig = {
        totalHuman: '90',
        tipPercent: 0,
        mode: 'weighted',
        participants: [
          { id: 'p1', weight: 2 },
          { id: 'p2', weight: 1 },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        decimals: 18,
      };

      const result = calculateSplit(config);

      expect(result.participantAmounts).toHaveLength(2);
      expect(result.sumMatches).toBe(true);

      // p1: 90 * 2/3 = 60
      // p2: 90 * 1/3 = 30
      const p1Amount = result.participantAmounts.find((a) => a.participantId === 'p1');
      const p2Amount = result.participantAmounts.find((a) => a.participantId === 'p2');

      expect(p1Amount?.amountHuman).toBe('60.0');
      expect(p2Amount?.amountHuman).toBe('30.0');
    });

    it('should split by weights (1:2:3)', () => {
      const config: CalculationConfig = {
        totalHuman: '60',
        tipPercent: 0,
        mode: 'weighted',
        participants: [
          { id: 'p1', weight: 1 },
          { id: 'p2', weight: 2 },
          { id: 'p3', weight: 3 },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        decimals: 18,
      };

      const result = calculateSplit(config);

      expect(result.participantAmounts).toHaveLength(3);
      expect(result.sumMatches).toBe(true);

      // Total weight: 6
      // p1: 60 * 1/6 = 10
      // p2: 60 * 2/6 = 20
      // p3: 60 * 3/6 = 30
      const p1Amount = result.participantAmounts.find((a) => a.participantId === 'p1');
      const p2Amount = result.participantAmounts.find((a) => a.participantId === 'p2');
      const p3Amount = result.participantAmounts.find((a) => a.participantId === 'p3');

      expect(p1Amount?.amountHuman).toBe('10.0');
      expect(p2Amount?.amountHuman).toBe('20.0');
      expect(p3Amount?.amountHuman).toBe('30.0');
    });

    it('should handle default weight of 1', () => {
      const config: CalculationConfig = {
        totalHuman: '100',
        tipPercent: 0,
        mode: 'weighted',
        participants: [
          { id: 'p1' }, // weight defaults to 1
          { id: 'p2' }, // weight defaults to 1
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        decimals: 18,
      };

      const result = calculateSplit(config);

      expect(result.participantAmounts).toHaveLength(2);
      expect(result.sumMatches).toBe(true);

      // Should be equal split (50/50)
      result.participantAmounts.forEach((amount) => {
        expect(amount.amountHuman).toBe('50.0');
      });
    });
  });

  describe('Tip Calculation', () => {
    it('should apply 10% tip', () => {
      const config: CalculationConfig = {
        totalHuman: '100',
        tipPercent: 10,
        mode: 'equal',
        participants: [
          { id: 'p1' },
          { id: 'p2' },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        decimals: 18,
      };

      const result = calculateSplit(config);

      expect(result.sumMatches).toBe(true);
      
      // Total with tip: 100 * 1.1 = 110
      expect(result.totalWithTipHuman).toBe('110.0');

      // Each pays 55
      result.participantAmounts.forEach((amount) => {
        expect(amount.amountHuman).toBe('55.0');
      });
    });

    it('should apply 20% tip', () => {
      const config: CalculationConfig = {
        totalHuman: '50',
        tipPercent: 20,
        mode: 'equal',
        participants: [
          { id: 'p1' },
          { id: 'p2' },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        decimals: 18,
      };

      const result = calculateSplit(config);

      expect(result.sumMatches).toBe(true);
      
      // Total with tip: 50 * 1.2 = 60
      expect(result.totalWithTipHuman).toBe('60.0');

      // Each pays 30
      result.participantAmounts.forEach((amount) => {
        expect(amount.amountHuman).toBe('30.0');
      });
    });

    it('should handle 0% tip', () => {
      const config: CalculationConfig = {
        totalHuman: '100',
        tipPercent: 0,
        mode: 'equal',
        participants: [{ id: 'p1' }],
        rounding: 'floor',
        remainderStrategy: 'first',
        decimals: 18,
      };

      const result = calculateSplit(config);

      expect(result.totalWithTipHuman).toBe('100.0');
      expect(result.participantAmounts[0].amountHuman).toBe('100.0');
    });
  });

  describe('Remainder Distribution', () => {
    it('should give remainder to first participant', () => {
      const config: CalculationConfig = {
        totalHuman: '10',
        tipPercent: 0,
        mode: 'equal',
        participants: [
          { id: 'p1' },
          { id: 'p2' },
          { id: 'p3' },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        decimals: 0, // Use 0 decimals for easy testing
      };

      const result = calculateSplit(config);

      expect(result.sumMatches).toBe(true);
      
      // 10 / 3 = 3 each, remainder 1 goes to first
      const amounts = result.participantAmounts.map((a) => parseInt(a.amountSmallestUnit));
      expect(amounts[0]).toBe(4); // 3 + 1 remainder
      expect(amounts[1]).toBe(3);
      expect(amounts[2]).toBe(3);
      
      expect(result.remainderRecipients).toEqual(['p1']);
    });

    it('should distribute remainder to top N', () => {
      const config: CalculationConfig = {
        totalHuman: '10',
        tipPercent: 0,
        mode: 'equal',
        participants: [
          { id: 'p1' },
          { id: 'p2' },
          { id: 'p3' },
        ],
        rounding: 'floor',
        remainderStrategy: 'topN',
        remainderTopN: 2,
        decimals: 0,
      };

      const result = calculateSplit(config);

      expect(result.sumMatches).toBe(true);
      
      // 10 / 3 = 3 each, remainder 1 distributed to top 2
      const amounts = result.participantAmounts.map((a) => parseInt(a.amountSmallestUnit));
      
      // First participant gets 1 wei
      expect(amounts[0]).toBe(4); // 3 + 1
      expect(amounts[1]).toBe(3);
      expect(amounts[2]).toBe(3);
    });

    it('should handle no remainder distribution', () => {
      const config: CalculationConfig = {
        totalHuman: '10',
        tipPercent: 0,
        mode: 'equal',
        participants: [
          { id: 'p1' },
          { id: 'p2' },
          { id: 'p3' },
        ],
        rounding: 'floor',
        remainderStrategy: 'none',
        decimals: 0,
      };

      const result = calculateSplit(config);

      // Sum won't match because remainder is not distributed
      expect(result.sumMatches).toBe(false);
      
      // 10 / 3 = 3 each, remainder 1 is lost
      const amounts = result.participantAmounts.map((a) => parseInt(a.amountSmallestUnit));
      expect(amounts).toEqual([3, 3, 3]);
      
      expect(result.remainderSmallestUnit).toBe('1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small amounts', () => {
      const config: CalculationConfig = {
        totalHuman: '0.000001',
        tipPercent: 0,
        mode: 'equal',
        participants: [
          { id: 'p1' },
          { id: 'p2' },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        decimals: 18,
      };

      const result = calculateSplit(config);

      expect(result.sumMatches).toBe(true);
      
      // Should handle wei-level precision
      const sum = result.participantAmounts.reduce(
        (s, a) => s + BigInt(a.amountSmallestUnit),
        BigInt(0)
      );
      expect(sum.toString()).toBe(result.totalWithTipSmallestUnit);
    });

    it('should handle large amounts', () => {
      const config: CalculationConfig = {
        totalHuman: '1000000',
        tipPercent: 15,
        mode: 'weighted',
        participants: [
          { id: 'p1', weight: 5 },
          { id: 'p2', weight: 3 },
          { id: 'p3', weight: 2 },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        decimals: 18,
      };

      const result = calculateSplit(config);

      expect(result.sumMatches).toBe(true);
      
      // Total with tip: 1,000,000 * 1.15 = 1,150,000
      expect(result.totalWithTipHuman).toBe('1150000.0');
    });

    it('should throw on zero weight', () => {
      const config: CalculationConfig = {
        totalHuman: '100',
        tipPercent: 0,
        mode: 'weighted',
        participants: [
          { id: 'p1', weight: 0 },
          { id: 'p2', weight: 1 },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        decimals: 18,
      };

      expect(() => calculateSplit(config)).toThrow('weight');
    });

    it('should throw on invalid amount', () => {
      const config: CalculationConfig = {
        totalHuman: 'invalid',
        tipPercent: 0,
        mode: 'equal',
        participants: [{ id: 'p1' }],
        rounding: 'floor',
        remainderStrategy: 'first',
        decimals: 18,
      };

      expect(() => calculateSplit(config)).toThrow();
    });

    it('should throw on no participants', () => {
      const config: CalculationConfig = {
        totalHuman: '100',
        tipPercent: 0,
        mode: 'equal',
        participants: [],
        rounding: 'floor',
        remainderStrategy: 'first',
        decimals: 18,
      };

      expect(() => calculateSplit(config)).toThrow('participant');
    });

    it('should throw on negative tip', () => {
      const config: CalculationConfig = {
        totalHuman: '100',
        tipPercent: -10,
        mode: 'equal',
        participants: [{ id: 'p1' }],
        rounding: 'floor',
        remainderStrategy: 'first',
        decimals: 18,
      };

      expect(() => calculateSplit(config)).toThrow('tip');
    });
  });

  describe('Decimal Precision', () => {
    it('should handle 6 decimals (USDC)', () => {
      const config: CalculationConfig = {
        totalHuman: '100.50',
        tipPercent: 10,
        mode: 'equal',
        participants: [
          { id: 'p1' },
          { id: 'p2' },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        decimals: 6, // USDC has 6 decimals
      };

      const result = calculateSplit(config);

      expect(result.sumMatches).toBe(true);
      
      // Total with tip: 100.50 * 1.1 = 110.55
      // Each pays: 55.275
      const sum = result.participantAmounts.reduce(
        (s, a) => s + BigInt(a.amountSmallestUnit),
        BigInt(0)
      );
      expect(sum.toString()).toBe(result.totalWithTipSmallestUnit);
    });

    it('should handle 18 decimals (ETH)', () => {
      const config: CalculationConfig = {
        totalHuman: '1.234567890123456789',
        tipPercent: 0,
        mode: 'equal',
        participants: [
          { id: 'p1' },
          { id: 'p2' },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        decimals: 18,
      };

      const result = calculateSplit(config);

      expect(result.sumMatches).toBe(true);
    });
  });
});
