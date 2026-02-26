/**
 * WebSocket Authentication Constants
 * Shared between client and server for consistent auth behavior.
 */

/** Prefix used for the signed message: "E-Y-AUTH:{timestamp}" */
export const WS_AUTH_MESSAGE_PREFIX = 'E-Y-AUTH:';

/** Maximum age of an auth timestamp in milliseconds (5 minutes) */
export const WS_AUTH_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Build the message string that must be signed by the wallet.
 * Both client and server use this to ensure consistency.
 */
export function buildWsAuthMessage(timestamp: number): string {
  return `${WS_AUTH_MESSAGE_PREFIX}${timestamp}`;
}
