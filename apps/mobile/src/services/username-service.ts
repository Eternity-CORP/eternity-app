/**
 * Username Service
 * Handles @username registration, lookup, and management
 */

import type { HDNodeWallet } from 'ethers';
import { apiClient, ApiError } from './api-client';
import { createLogger } from '@/src/utils/logger';

const log = createLogger('UsernameService');

interface UsernameData {
  username: string;
  address: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Lookup username -> address
 */
export async function lookupUsername(username: string): Promise<string | null> {
  const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;

  try {
    const data = await apiClient.get<ApiResponse<UsernameData>>(
      `/api/username/${encodeURIComponent(normalizedUsername)}`
    );
    return data.data?.address || null;
  } catch (error) {
    if (ApiError.isApiError(error) && error.statusCode === 404) {
      return null;
    }
    log.warn('Username lookup failed', error);
    return null;
  }
}

/**
 * Reverse lookup: address -> username
 */
export async function getUsernameByAddress(address: string): Promise<string | null> {
  try {
    const data = await apiClient.get<ApiResponse<UsernameData>>(
      `/api/username/address/${encodeURIComponent(address)}`
    );
    return data.data?.username || null;
  } catch (error) {
    if (ApiError.isApiError(error) && error.statusCode === 404) {
      return null;
    }
    log.warn('Username reverse lookup failed', error);
    return null;
  }
}

/**
 * Check if username is available
 */
export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;

  try {
    const data = await apiClient.get<ApiResponse<{ username: string; available: boolean }>>(
      `/api/username/check/${encodeURIComponent(normalizedUsername)}`
    );
    return data.data?.available || false;
  } catch (error) {
    log.warn('Username availability check failed', error);
    throw error;
  }
}

/**
 * Create signature message for username operations
 */
function createSignatureMessage(
  username: string,
  address: string,
  timestamp: number,
  action: 'claim' | 'update' | 'delete'
): string {
  return `E-Y:${action}:@${username}:${address}:${timestamp}`;
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

  const message = createSignatureMessage(normalizedUsername, address, timestamp, 'claim');
  const signature = await wallet.signMessage(message);

  try {
    await apiClient.post('/api/username', {
      username: normalizedUsername,
      address,
      signature,
      timestamp,
    });
    log.info('Username registered', { username: normalizedUsername });
  } catch (error) {
    if (ApiError.isApiError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Failed to register username');
  }
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

  const message = createSignatureMessage(normalizedUsername, address, timestamp, 'update');
  const signature = await wallet.signMessage(message);

  try {
    await apiClient.put('/api/username', {
      newUsername: normalizedUsername,
      address,
      signature,
      timestamp,
    });
    log.info('Username updated', { username: normalizedUsername });
  } catch (error) {
    if (ApiError.isApiError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Failed to update username');
  }
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

  const message = createSignatureMessage(normalizedUsername, address, timestamp, 'delete');
  const signature = await wallet.signMessage(message);

  try {
    await apiClient.delete('/api/username');
    log.info('Username deleted', { username: normalizedUsername });
  } catch (error) {
    if (ApiError.isApiError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Failed to delete username');
  }
}

/**
 * Validate username format locally
 */
export function isValidUsernameFormat(username: string): boolean {
  const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;
  const regex = /^[a-z][a-z0-9_]{2,19}$/;
  return regex.test(normalizedUsername.toLowerCase());
}
