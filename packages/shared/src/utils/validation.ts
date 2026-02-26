/**
 * Validation utilities
 */

import { USERNAME_REGEX } from './username';
import { BLIK_MIN_AMOUNT, BLIK_MAX_AMOUNT } from '../constants/limits';

/**
 * Validate Ethereum address format
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate username format
 * USERNAME_REGEX already encodes length (3-20 chars), so no separate check needed.
 */
export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username);
}

/**
 * Validate BLIK code format (6 digits)
 */
export function isValidBlikCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}

/**
 * Truncate Ethereum address for display
 * @param address - Full Ethereum address
 * @param startLength - Number of characters to show at start (default: 6)
 * @param endLength - Number of characters to show at end (default: 4)
 */
export function truncateAddress(
  address: string,
  startLength: number = 6,
  endLength: number = 4,
): string {
  if (!isValidEthereumAddress(address)) {
    return address;
  }
  return `${address.slice(0, startLength + 2)}...${address.slice(-endLength)}`;
}

/**
 * Validate BLIK amount is within allowed range
 * Returns null if valid, or an error message string if invalid
 */
export function validateBlikAmount(amount: string): string | null {
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed <= 0) {
    return 'Amount must be greater than 0';
  }
  if (parsed < BLIK_MIN_AMOUNT) {
    return `Minimum amount is ${BLIK_MIN_AMOUNT}`;
  }
  if (parsed > BLIK_MAX_AMOUNT) {
    return `Maximum amount is ${BLIK_MAX_AMOUNT.toLocaleString()}`;
  }
  return null;
}

/**
 * Format amount with decimals
 */
export function formatAmount(amount: string, decimals: number = 18): string {
  const num = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const whole = num / divisor;
  const fraction = num % divisor;
  
  if (fraction === BigInt(0)) {
    return whole.toString();
  }
  
  const fractionStr = fraction.toString().padStart(decimals, '0');
  const trimmed = fractionStr.replace(/0+$/, '');
  
  return `${whole}.${trimmed}`;
}
