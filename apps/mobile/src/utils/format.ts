/**
 * Formatting utilities
 */

/**
 * Truncate an Ethereum address for display
 * @param address - The full address to truncate
 * @param startChars - Number of characters to show at start (default: 6)
 * @param endChars - Number of characters to show at end (default: 4)
 */
export function truncateAddress(
  address: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Truncate a transaction hash for display
 * @param hash - The full tx hash to truncate
 * @param startChars - Number of characters to show at start (default: 10)
 * @param endChars - Number of characters to show at end (default: 8)
 */
export function truncateTxHash(
  hash: string,
  startChars: number = 10,
  endChars: number = 8
): string {
  if (!hash) return '';
  if (hash.length <= startChars + endChars) return hash;
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

/**
 * Sanitize amount input to prevent invalid numbers like "00000.1" or "0....1"
 * Returns sanitized string or null if input is completely invalid
 * @param input - The raw input string
 * @param currentValue - The current value (to determine if we should allow the change)
 */
export function sanitizeAmountInput(input: string, currentValue: string = ''): string | null {
  // Allow empty string
  if (input === '') return '';
  
  // Remove any non-numeric characters except decimal point
  let sanitized = input.replace(/[^0-9.]/g, '');
  
  // Handle multiple decimal points - keep only the first one
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    sanitized = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Handle leading zeros
  // Allow "0" and "0." but not "00", "000", etc.
  if (sanitized.length > 1 && sanitized[0] === '0' && sanitized[1] !== '.') {
    // Remove leading zeros except for "0."
    sanitized = sanitized.replace(/^0+/, '0');
    if (sanitized.length > 1 && sanitized[1] !== '.') {
      sanitized = sanitized.slice(1);
    }
  }
  
  // If starts with ".", prepend "0"
  if (sanitized.startsWith('.')) {
    sanitized = '0' + sanitized;
  }
  
  // Validate the result is a valid number format
  if (sanitized !== '' && sanitized !== '0.' && !/^\d+\.?\d*$/.test(sanitized)) {
    return currentValue; // Return previous value if invalid
  }
  
  return sanitized;
}

/**
 * Format amount for display with proper decimal handling
 * @param amount - The amount string or number
 * @param maxDecimals - Maximum decimal places to show
 */
export function formatAmount(amount: string | number, maxDecimals: number = 8): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  
  // Use toFixed then remove trailing zeros
  const fixed = num.toFixed(maxDecimals);
  return fixed.replace(/\.?0+$/, '');
}
