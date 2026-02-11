/**
 * Split bill utilities
 */

/**
 * Calculate equal split amounts
 */
export function calculateEqualSplit(
  totalAmount: string,
  participantCount: number,
): string {
  const total = parseFloat(totalAmount);
  if (isNaN(total) || participantCount <= 0) return '0';
  return (total / participantCount).toFixed(6);
}

/**
 * Validate split amounts sum to total (within rounding tolerance)
 */
export function validateSplitAmounts(
  totalAmount: string,
  amounts: string[],
): boolean {
  const total = parseFloat(totalAmount);
  const sum = amounts.reduce((acc, amt) => acc + parseFloat(amt || '0'), 0);
  return Math.abs(total - sum) < 0.000001;
}

/**
 * Convert percentages to amounts, last person gets remainder to avoid rounding drift
 */
export function calculateCustomSplitFromPercentages(
  totalAmount: string,
  percentages: number[],
): string[] {
  const total = parseFloat(totalAmount);
  if (isNaN(total) || percentages.length === 0) return [];

  const amounts: string[] = [];
  let allocated = 0;

  for (let i = 0; i < percentages.length; i++) {
    if (i === percentages.length - 1) {
      // Last person gets remainder
      amounts.push((total - allocated).toFixed(6));
    } else {
      const amt = (total * percentages[i]) / 100;
      const rounded = parseFloat(amt.toFixed(6));
      amounts.push(rounded.toString());
      allocated += rounded;
    }
  }

  return amounts;
}

/**
 * Validate custom amounts: all positive, sum ≤ total (if total provided)
 */
export function validateCustomAmounts(
  totalAmount: string | null,
  amounts: string[],
): { valid: boolean; sum: string; error?: string } {
  const parsed = amounts.map((a) => parseFloat(a || '0'));

  if (parsed.some((a) => isNaN(a) || a < 0)) {
    return { valid: false, sum: '0', error: 'All amounts must be positive numbers' };
  }

  const sum = parsed.reduce((acc, a) => acc + a, 0);
  const sumStr = sum.toFixed(6);

  if (totalAmount) {
    const total = parseFloat(totalAmount);
    if (!isNaN(total) && sum > total + 0.000001) {
      return { valid: false, sum: sumStr, error: `Sum (${sumStr}) exceeds total (${totalAmount})` };
    }
  }

  if (sum <= 0) {
    return { valid: false, sum: sumStr, error: 'Total split amount must be greater than zero' };
  }

  return { valid: true, sum: sumStr };
}
