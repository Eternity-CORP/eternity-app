/**
 * Preferences API Module
 * Pure functions that accept ApiClient as first argument.
 */

import type { ApiClient } from './client';
import { ApiError } from './client';

export interface NetworkPreferences {
  defaultNetwork: string | null;
  tokenOverrides: Record<string, string>;
  updatedAt?: string;
}

export interface SavePreferencesRequest {
  preferences: NetworkPreferences;
  address: string;
  signature: string;
  timestamp: number;
}

/**
 * Get network preferences for an address
 */
export async function getAddressPreferences(
  client: ApiClient,
  address: string,
): Promise<NetworkPreferences | null> {
  const normalized = address.toLowerCase();

  try {
    return await client.get<NetworkPreferences>(
      `/api/address/${encodeURIComponent(normalized)}/preferences`,
    );
  } catch (error) {
    if (ApiError.isApiError(error) && error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Save network preferences (requires wallet signature)
 */
export async function savePreferences(
  client: ApiClient,
  request: SavePreferencesRequest,
): Promise<void> {
  await client.put('/api/preferences', request);
}

/**
 * Resolve the preferred network for a token transfer
 * Priority: tokenOverrides[symbol] > defaultNetwork > null (sender's choice)
 */
export function resolvePreferredNetwork(
  preferences: NetworkPreferences | null,
  tokenSymbol: string,
): string | null {
  if (!preferences) return null;

  const normalized = tokenSymbol.toUpperCase();
  const override = preferences.tokenOverrides[normalized];
  if (override) return override;

  return preferences.defaultNetwork;
}
