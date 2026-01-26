/**
 * Bridge Service Unit Tests
 * Tests bridge utility functions without API calls
 */

// Pure functions copied from bridge-service.ts to test in isolation

type BridgeCostLevel = 'none' | 'warning' | 'expensive';

/**
 * Check the cost level of a bridge operation
 */
function checkBridgeCostLevel(amountUsd: number, bridgeFeeUsd: number): BridgeCostLevel {
  if (amountUsd <= 0) {
    return 'none';
  }

  const feePercentage = (bridgeFeeUsd / amountUsd) * 100;

  if (feePercentage > 10) {
    return 'expensive';
  }

  if (feePercentage >= 5) {
    return 'warning';
  }

  return 'none';
}

/**
 * Format bridge time for display
 */
function formatBridgeTime(seconds: number): string {
  if (seconds <= 0) {
    return '~instant';
  }

  if (seconds < 60) {
    return `~${seconds} sec`;
  }

  if (seconds < 3600) {
    const minutes = Math.round(seconds / 60);
    return `~${minutes} min`;
  }

  const hours = Math.round(seconds / 3600);
  return hours === 1 ? '~1 hr' : `~${hours} hrs`;
}

describe('BridgeService', () => {
  describe('checkBridgeCostLevel', () => {
    describe('returns "none"', () => {
      it('should return "none" for zero amount', () => {
        expect(checkBridgeCostLevel(0, 1)).toBe('none');
      });

      it('should return "none" for negative amount', () => {
        expect(checkBridgeCostLevel(-100, 5)).toBe('none');
      });

      it('should return "none" for fee < 5%', () => {
        expect(checkBridgeCostLevel(100, 4)).toBe('none'); // 4%
        expect(checkBridgeCostLevel(100, 0.5)).toBe('none'); // 0.5%
        expect(checkBridgeCostLevel(1000, 10)).toBe('none'); // 1%
      });
    });

    describe('returns "warning"', () => {
      it('should return "warning" for fee 5-10%', () => {
        expect(checkBridgeCostLevel(100, 5)).toBe('warning'); // 5%
        expect(checkBridgeCostLevel(100, 7)).toBe('warning'); // 7%
        expect(checkBridgeCostLevel(100, 10)).toBe('warning'); // 10%
      });
    });

    describe('returns "expensive"', () => {
      it('should return "expensive" for fee > 10%', () => {
        expect(checkBridgeCostLevel(100, 11)).toBe('expensive'); // 11%
        expect(checkBridgeCostLevel(100, 20)).toBe('expensive'); // 20%
        expect(checkBridgeCostLevel(10, 2)).toBe('expensive'); // 20%
      });
    });

    describe('edge cases', () => {
      it('should handle small amounts correctly', () => {
        // $1 transfer with $0.05 fee = 5%
        expect(checkBridgeCostLevel(1, 0.05)).toBe('warning');
        // $1 transfer with $0.04 fee = 4%
        expect(checkBridgeCostLevel(1, 0.04)).toBe('none');
      });

      it('should handle large amounts correctly', () => {
        // $10000 transfer with $400 fee = 4%
        expect(checkBridgeCostLevel(10000, 400)).toBe('none');
        // $10000 transfer with $600 fee = 6%
        expect(checkBridgeCostLevel(10000, 600)).toBe('warning');
      });
    });
  });

  describe('formatBridgeTime', () => {
    describe('instant', () => {
      it('should return "~instant" for 0 seconds', () => {
        expect(formatBridgeTime(0)).toBe('~instant');
      });

      it('should return "~instant" for negative seconds', () => {
        expect(formatBridgeTime(-10)).toBe('~instant');
      });
    });

    describe('seconds', () => {
      it('should format seconds correctly', () => {
        expect(formatBridgeTime(1)).toBe('~1 sec');
        expect(formatBridgeTime(30)).toBe('~30 sec');
        expect(formatBridgeTime(59)).toBe('~59 sec');
      });
    });

    describe('minutes', () => {
      it('should format minutes correctly', () => {
        expect(formatBridgeTime(60)).toBe('~1 min');
        expect(formatBridgeTime(90)).toBe('~2 min');
        expect(formatBridgeTime(120)).toBe('~2 min');
        expect(formatBridgeTime(300)).toBe('~5 min');
        expect(formatBridgeTime(1800)).toBe('~30 min');
      });

      it('should round to nearest minute', () => {
        expect(formatBridgeTime(89)).toBe('~1 min'); // 1.48 min -> 1
        expect(formatBridgeTime(150)).toBe('~3 min'); // 2.5 min -> 3
      });
    });

    describe('hours', () => {
      it('should format 1 hour correctly', () => {
        expect(formatBridgeTime(3600)).toBe('~1 hr');
      });

      it('should format multiple hours correctly', () => {
        expect(formatBridgeTime(7200)).toBe('~2 hrs');
        expect(formatBridgeTime(10800)).toBe('~3 hrs');
      });

      it('should round to nearest hour', () => {
        expect(formatBridgeTime(5400)).toBe('~2 hrs'); // 1.5 hrs -> 2
        expect(formatBridgeTime(9000)).toBe('~3 hrs'); // 2.5 hrs -> 3
      });
    });
  });
});
