/**
 * Format blockchain address for display
 * @example formatAddress('0x1234...5678') => '0x1234...5678'
 */
export const formatAddress = (address: string, chars = 4): string => {
  if (!address) return '';
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
};

/**
 * Format token amount for display
 */
export const formatAmount = (
  amount: string | number,
  decimals = 18,
  displayDecimals = 4
): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const value = num / Math.pow(10, decimals);
  return value.toFixed(displayDecimals);
};

/**
 * Format USD value
 */
export const formatUsd = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};
