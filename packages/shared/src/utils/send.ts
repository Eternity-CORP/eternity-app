/**
 * Send utilities
 */

import { isValidEthereumAddress } from './validation';

export interface RecipientParseResult {
  type: 'address' | 'username';
  value: string;
}

/**
 * Parse recipient input — returns type + normalized value
 */
export function parseRecipient(input: string): RecipientParseResult {
  const trimmed = input.trim();

  if (isValidEthereumAddress(trimmed)) {
    return { type: 'address', value: trimmed };
  }

  // Username: strip @ if present, lowercase
  const username = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  return { type: 'username', value: username.toLowerCase() };
}

/**
 * Check if address represents native token (ETH).
 * Only matches specific known native token address formats.
 * Returns false for empty/undefined to avoid masking bugs.
 */
export function isNativeToken(address?: string): boolean {
  if (!address) return false;

  const lower = address.toLowerCase();
  return (
    lower === 'eth' ||
    lower === '0x0000000000000000000000000000000000000000' ||
    lower === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
  );
}
