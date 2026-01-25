/**
 * Preferences Service
 * Handles network preferences for recipients
 * Allows addresses to specify their preferred network for receiving tokens
 */

import type { HDNodeWallet } from 'ethers';
import { apiClient, ApiError } from './api-client';
import { createLogger } from '@/src/utils/logger';
import { NetworkId } from '@/src/constants/networks';

const log = createLogger('PreferencesService');

/**
 * Network preferences for an address
 */
export interface NetworkPreferences {
  /** Default network for receiving all tokens (null means sender's choice) */
  defaultNetwork: NetworkId | null;
  /** Token-specific network overrides (e.g., receive USDC on Arbitrum) */
  tokenOverrides: Record<string, NetworkId>;
  /** Last update timestamp (ISO string) */
  updatedAt?: string;
}

/**
 * Popular tokens for preferences UI
 */
export const POPULAR_TOKENS: string[] = [
  'ETH',
  'USDC',
  'USDT',
  'DAI',
  'WETH',
  'WBTC',
  'MATIC',
  'ARB',
  'OP',
  'LINK',
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

      // Don't retry on 404 - it's a valid "not found" response
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
 * Returns null if no preferences are set or on error
 */
export async function getAddressPreferences(
  address: string
): Promise<NetworkPreferences | null> {
  const normalizedAddress = address.toLowerCase();

  try {
    const data = await apiClient.get<NetworkPreferences>(
      `/api/address/${encodeURIComponent(normalizedAddress)}/preferences`
    );
    log.debug('Fetched preferences', { address: normalizedAddress });
    return data;
  } catch (error) {
    if (ApiError.isApiError(error) && error.statusCode === 404) {
      log.debug('No preferences found', { address: normalizedAddress });
      return null;
    }
    log.warn('Failed to fetch preferences', { address: normalizedAddress, error });
    throw error;
  }
}

/**
 * Get network preferences with retry logic
 * Returns null on failure (does not throw)
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

  // Create signature message
  const message = `E-Y:preferences:${address}:${timestamp}`;
  const signature = await wallet.signMessage(message);

  try {
    await apiClient.put('/api/preferences', {
      preferences,
      address,
      signature,
      timestamp,
    });
    log.info('Preferences saved', { address });
  } catch (error) {
    if (ApiError.isApiError(error)) {
      throw new Error(error.message);
    }
    throw new Error('Failed to save preferences');
  }
}

/**
 * Resolve the preferred network for a token transfer
 * Priority: tokenOverrides[symbol] > defaultNetwork > null (sender's choice)
 */
export function resolvePreferredNetwork(
  preferences: NetworkPreferences | null,
  tokenSymbol: string
): NetworkId | null {
  if (!preferences) {
    return null;
  }

  // Check for token-specific override first
  const normalizedSymbol = tokenSymbol.toUpperCase();
  const tokenOverride = preferences.tokenOverrides[normalizedSymbol];
  if (tokenOverride) {
    return tokenOverride;
  }

  // Fall back to default network
  return preferences.defaultNetwork;
}
