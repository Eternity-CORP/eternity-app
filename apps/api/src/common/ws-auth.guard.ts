/**
 * WebSocket Authentication Guard
 * Verifies signature-based auth during socket handshake.
 *
 * Auth flow:
 * 1. Client signs message "E-Y-AUTH:{timestamp}" with their wallet
 * 2. Client passes { address, signature, timestamp } in socket handshake auth
 * 3. Server verifies signature using ethers.verifyMessage
 * 4. Stores verified address on client.data.address
 *
 * For backward compatibility: unauthenticated connections are allowed
 * but marked with client.data.authenticated = false.
 */

import { Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { verifyMessage } from 'ethers';
import {
  buildWsAuthMessage,
  WS_AUTH_MAX_AGE_MS,
} from '@e-y/shared';

const logger = new Logger('WsAuth');

export interface AuthenticatedSocketData {
  authenticated: boolean;
  address?: string;
}

/**
 * Verify WebSocket handshake auth credentials.
 * Call this in handleConnection of any gateway.
 *
 * @returns true if authenticated, false if unauthenticated (but allowed)
 */
export function verifySocketAuth(client: Socket): boolean {
  const auth = client.handshake.auth as {
    address?: string;
    signature?: string;
    timestamp?: number;
  } | undefined;

  // No auth provided — allow but mark as unauthenticated
  if (!auth?.address || !auth?.signature || !auth?.timestamp) {
    client.data = {
      ...client.data,
      authenticated: false,
    } as AuthenticatedSocketData;

    logger.warn(
      `Unauthenticated connection: ${client.id} (no auth credentials in handshake)`,
    );
    return false;
  }

  const { address, signature, timestamp } = auth;

  // Check timestamp freshness (reject if older than 5 minutes)
  const age = Date.now() - timestamp;
  if (age > WS_AUTH_MAX_AGE_MS || age < -30_000) {
    client.data = {
      ...client.data,
      authenticated: false,
    } as AuthenticatedSocketData;

    logger.warn(
      `Auth timestamp expired for ${address}: age=${Math.round(age / 1000)}s, client=${client.id}`,
    );
    // Don't disconnect — allow unauthenticated for backward compat
    return false;
  }

  // Verify signature
  try {
    const message = buildWsAuthMessage(timestamp);
    const recovered = verifyMessage(message, signature);

    if (recovered.toLowerCase() !== address.toLowerCase()) {
      client.data = {
        ...client.data,
        authenticated: false,
      } as AuthenticatedSocketData;

      logger.warn(
        `Auth signature mismatch: claimed=${address}, recovered=${recovered}, client=${client.id}`,
      );
      return false;
    }

    // Auth successful
    client.data = {
      ...client.data,
      authenticated: true,
      address: address.toLowerCase(),
    } as AuthenticatedSocketData;

    logger.log(
      `Authenticated connection: ${address.toLowerCase()}, client=${client.id}`,
    );
    return true;
  } catch (error) {
    client.data = {
      ...client.data,
      authenticated: false,
    } as AuthenticatedSocketData;

    logger.warn(
      `Auth verification failed for ${address}: ${(error as Error).message}, client=${client.id}`,
    );
    return false;
  }
}

/**
 * Check if a client is authenticated and optionally verify address ownership.
 * Returns true if the client is authenticated and the address matches (or no address check needed).
 */
export function isClientAuthenticated(client: Socket): boolean {
  return (client.data as AuthenticatedSocketData)?.authenticated === true;
}

/**
 * Get the authenticated address from a client.
 * Returns undefined if not authenticated.
 */
export function getClientAddress(client: Socket): string | undefined {
  const data = client.data as AuthenticatedSocketData;
  return data?.authenticated ? data.address : undefined;
}

/**
 * Verify that a claimed address matches the authenticated address.
 * Returns true if:
 * - Client is authenticated AND address matches, OR
 * - Client is NOT authenticated (backward compatibility — log warning)
 *
 * Returns false only if client IS authenticated but address doesn't match.
 */
export function verifyAddressOwnership(
  client: Socket,
  claimedAddress: string,
  action: string,
): boolean {
  const data = client.data as AuthenticatedSocketData;

  if (!data?.authenticated) {
    logger.warn(
      `Unauthenticated ${action} from client ${client.id} — allowing for backward compatibility`,
    );
    return true; // Allow for backward compat
  }

  if (data.address !== claimedAddress.toLowerCase()) {
    logger.warn(
      `Address mismatch in ${action}: authenticated=${data.address}, claimed=${claimedAddress.toLowerCase()}, client=${client.id}`,
    );
    return false;
  }

  return true;
}
