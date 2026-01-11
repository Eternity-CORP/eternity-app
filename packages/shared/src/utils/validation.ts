import { Limits } from '../constants';

/**
 * Validate Ethereum address format (basic check)
 */
export const isValidAddressFormat = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Validate @username format
 */
export const isValidUsername = (username: string): boolean => {
  if (username.startsWith('@')) {
    username = username.slice(1);
  }

  if (username.length < Limits.USERNAME_MIN_LENGTH) return false;
  if (username.length > Limits.USERNAME_MAX_LENGTH) return false;

  // alphanumeric + underscore only
  return /^[a-zA-Z0-9_]+$/.test(username);
};

/**
 * Normalize @username (lowercase, remove @)
 */
export const normalizeUsername = (username: string): string => {
  if (username.startsWith('@')) {
    username = username.slice(1);
  }
  return username.toLowerCase();
};

/**
 * Validate BLIK code format (6 digits)
 */
export const isValidBlikCode = (code: string): boolean => {
  return /^\d{6}$/.test(code);
};

/**
 * Generate random BLIK code
 */
export const generateBlikCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Validate amount string (positive number)
 */
export const isValidAmount = (amount: string): boolean => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && isFinite(num);
};

/**
 * Parse amount to bigint with decimals
 */
export const parseAmount = (amount: string, decimals: number): bigint => {
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole + paddedFraction);
};

/**
 * Format bigint amount to string with decimals
 */
export const formatAmountFromBigInt = (
  amount: bigint,
  decimals: number
): string => {
  const str = amount.toString().padStart(decimals + 1, '0');
  const whole = str.slice(0, -decimals) || '0';
  const fraction = str.slice(-decimals);

  // Remove trailing zeros
  const trimmedFraction = fraction.replace(/0+$/, '');

  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
};

/**
 * Validate recipient (address or @username)
 */
export const validateRecipient = (
  recipient: string
): { type: 'address' | 'username'; value: string } | null => {
  if (recipient.startsWith('@')) {
    const username = recipient.slice(1);
    if (isValidUsername(username)) {
      return { type: 'username', value: normalizeUsername(username) };
    }
    return null;
  }

  if (isValidAddressFormat(recipient)) {
    return { type: 'address', value: recipient };
  }

  return null;
};

/**
 * Check if BLIK code is expired
 */
export const isBlikCodeExpired = (expiresAt: string | Date): boolean => {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  return expiry.getTime() < Date.now();
};

/**
 * Calculate BLIK code expiry time
 */
export const getBlikCodeExpiry = (): Date => {
  return new Date(Date.now() + Limits.BLIK_CODE_EXPIRATION_MS);
};
