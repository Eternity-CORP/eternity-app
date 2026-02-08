/**
 * Username utilities
 * Unified validation, normalization, and signature message creation.
 */

/**
 * Unified username regex: starts with lowercase letter, 3-20 chars, only lowercase alphanumeric + underscore.
 * Matches NestJS DTO validation.
 */
export const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,19}$/;

/**
 * Validate username format (strict — assumes already normalized)
 */
export function isValidUsernameFormat(username: string): boolean {
  return USERNAME_REGEX.test(username);
}

/**
 * Normalize username: strip @, lowercase
 */
export function normalizeUsername(username: string): string {
  const stripped = username.startsWith('@') ? username.slice(1) : username;
  return stripped.toLowerCase();
}

/**
 * Create signature message for username operations.
 * Format: E-Y:{action}:@{username}:{address}:{timestamp}
 */
export function createUsernameSignatureMessage(
  username: string,
  address: string,
  timestamp: number,
  action: 'claim' | 'update' | 'delete',
): string {
  const normalized = normalizeUsername(username);
  return `E-Y:${action}:@${normalized}:${address}:${timestamp}`;
}
