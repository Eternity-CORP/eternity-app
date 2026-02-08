/**
 * Username Service
 * Handles @username registration, lookup, and management
 *
 * Delegates API calls to @e-y/shared, keeps wallet signing (platform-specific).
 */

import type { HDNodeWallet } from 'ethers';
import {
  lookupUsername as sharedLookup,
  lookupAddressByUsername as sharedReverseLookup,
  checkUsernameAvailability as sharedCheck,
  registerUsername as sharedRegister,
  updateUsername as sharedUpdate,
  deleteUsername as sharedDelete,
  createApiClient,
  isValidUsernameFormat as sharedIsValid,
  createUsernameSignatureMessage,
  type UsernameLookupResult,
} from '@e-y/shared';
import { API_BASE_URL } from '@/src/config/api';
import { createLogger } from '@/src/utils/logger';

const log = createLogger('UsernameService');

const apiClient = createApiClient({ baseUrl: API_BASE_URL });

export type { UsernameLookupResult };

/**
 * Lookup username -> address with optional preferences
 */
export async function lookupUsername(username: string): Promise<UsernameLookupResult | null> {
  try {
    return await sharedLookup(apiClient, username);
  } catch (error) {
    log.warn('Username lookup failed', error);
    return null;
  }
}

/**
 * Reverse lookup: address -> username
 */
export async function getUsernameByAddress(address: string): Promise<string | null> {
  try {
    return await sharedReverseLookup(apiClient, address);
  } catch (error) {
    log.warn('Username reverse lookup failed', error);
    return null;
  }
}

/**
 * Check if username is available
 */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  try {
    return await sharedCheck(apiClient, username);
  } catch (error) {
    log.warn('Username availability check failed', error);
    throw error;
  }
}

/**
 * Register a new username
 */
export async function registerUsername(
  username: string,
  wallet: HDNodeWallet
): Promise<void> {
  const normalizedUsername = username.startsWith('@')
    ? username.slice(1).toLowerCase()
    : username.toLowerCase();

  const address = wallet.address.toLowerCase();
  const timestamp = Date.now();

  const message = createUsernameSignatureMessage(normalizedUsername, address, timestamp, 'claim');
  const signature = await wallet.signMessage(message);

  await sharedRegister(apiClient, {
    username: normalizedUsername,
    address,
    signature,
    timestamp,
  });
  log.info('Username registered', { username: normalizedUsername });
}

/**
 * Update username (change to a new one)
 */
export async function updateUsername(
  newUsername: string,
  wallet: HDNodeWallet
): Promise<void> {
  const normalizedUsername = newUsername.startsWith('@')
    ? newUsername.slice(1).toLowerCase()
    : newUsername.toLowerCase();

  const address = wallet.address.toLowerCase();
  const timestamp = Date.now();

  const message = createUsernameSignatureMessage(normalizedUsername, address, timestamp, 'update');
  const signature = await wallet.signMessage(message);

  await sharedUpdate(apiClient, {
    newUsername: normalizedUsername,
    address,
    signature,
    timestamp,
  });
  log.info('Username updated', { username: normalizedUsername });
}

/**
 * Delete username
 */
export async function deleteUsername(
  currentUsername: string,
  wallet: HDNodeWallet
): Promise<void> {
  const normalizedUsername = currentUsername.startsWith('@')
    ? currentUsername.slice(1).toLowerCase()
    : currentUsername.toLowerCase();

  const address = wallet.address.toLowerCase();
  const timestamp = Date.now();

  const message = createUsernameSignatureMessage(normalizedUsername, address, timestamp, 'delete');
  const signature = await wallet.signMessage(message);

  await sharedDelete(apiClient, {
    address,
    signature,
    timestamp,
  });
  log.info('Username deleted', { username: normalizedUsername });
}

/**
 * Validate username format locally
 */
export { sharedIsValid as isValidUsernameFormat };
