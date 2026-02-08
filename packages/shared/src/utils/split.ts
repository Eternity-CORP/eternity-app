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
