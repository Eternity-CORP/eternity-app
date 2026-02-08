/**
 * Preferences Service
 * Handles network preferences for recipients
 *
 * Delegates API calls to @e-y/shared, keeps wallet signing + retry (platform-specific).
 */

import type { HDNodeWallet } from 'ethers';
import {
  getAddressPreferences as sharedGet,
  savePreferences as sharedSave,
  resolvePreferredNetwork as sharedResolve,
  createApiClient,
  ApiError,
} from '@e-y/shared';
import { API_BASE_URL } from '@/src/config/api';
import { createLogger } from '@/src/utils/logger';
import { NetworkId } from '@/src/constants/networks';

const log = createLogger('PreferencesService');

const apiClient = createApiClient({ baseUrl: API_BASE_URL });

/**
 * Network preferences for an address
 */
export interface NetworkPreferences {
  defaultNetwork: NetworkId | null;
  tokenOverrides: Record<string, NetworkId>;
  updatedAt?: string;
}

/**
 * Popular tokens for preferences UI
 */
export const POPULAR_TOKENS: string[] = [
  'ETH', 'USDC', 'USDT', 'DAI', 'WETH',
  'WBTC', 'MATIC', 'ARB', 'OP', 'LINK',
];

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with exponential backoff retry
 * Returns null on failure instead of throwing
 */
export async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries: number = 2,
  delay: number = 500
): Promise<T | null> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (ApiError.isApiError(error) && error.statusCode === 404) {
        return null;
      }

      if (attempt < retries) {
        const waitTime = delay * Math.pow(2, attempt);
        log.debug(`Retry attempt ${attempt + 1}/${retries} after ${waitTime}ms`);
        await sleep(waitTime);
      }
    }
  }

  log.warn('All retry attempts failed', lastError);
  return null;
}

/**
 * Get network preferences for an address
 */
export async function getAddressPreferences(
  address: string
): Promise<NetworkPreferences | null> {
  const result = await sharedGet(apiClient, address);
  if (!result) return null;

  log.debug('Fetched preferences', { address: address.toLowerCase() });
  return result as NetworkPreferences;
}

/**
 * Get network preferences with retry logic
 */
export async function getAddressPreferencesWithRetry(
  address: string
): Promise<NetworkPreferences | null> {
  return fetchWithRetry(() => getAddressPreferences(address));
}

/**
 * Save network preferences for the current wallet
 * Requires wallet signature for authentication
 */
export async function savePreferences(
  preferences: NetworkPreferences,
  wallet: HDNodeWallet
): Promise<void> {
  const address = wallet.address.toLowerCase();
  const timestamp = Date.now();

  const message = `E-Y:preferences:${address}:${timestamp}`;
  const signature = await wallet.signMessage(message);

  await sharedSave(apiClient, {
    preferences,
    address,
    signature,
    timestamp,
  });
  log.info('Preferences saved', { address });
}

/**
 * Resolve the preferred network for a token transfer
 */
export function resolvePreferredNetwork(
  preferences: NetworkPreferences | null,
  tokenSymbol: string
): NetworkId | null {
  return sharedResolve(preferences, tokenSymbol) as NetworkId | null;
}
