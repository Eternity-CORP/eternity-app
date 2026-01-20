/**
 * Preferences Service
 * Handles local storage and backend sync for user preferences
 */

import storage from '@/src/utils/storage';
import { NetworkId } from '@/src/constants/networks';
import type { TokenNetworkPreferences } from '@/src/store/slices/network-preferences-slice';

const STORAGE_KEY = 'network_preferences';

/**
 * Load network preferences from local storage
 */
export async function loadNetworkPreferences(): Promise<TokenNetworkPreferences> {
  try {
    const data = await storage.getItem(STORAGE_KEY);
    if (!data) {
      return {};
    }
    return JSON.parse(data) as TokenNetworkPreferences;
  } catch (error) {
    console.error('Failed to load network preferences:', error);
    return {};
  }
}

/**
 * Save network preferences to local storage
 */
export async function saveNetworkPreferences(
  preferences: TokenNetworkPreferences
): Promise<void> {
  try {
    await storage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Failed to save network preferences:', error);
    throw error;
  }
}

/**
 * Clear all network preferences
 */
export async function clearNetworkPreferences(): Promise<void> {
  try {
    await storage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear network preferences:', error);
    throw error;
  }
}

/**
 * Get preference for a specific token
 */
export async function getTokenPreference(
  symbol: string
): Promise<NetworkId | null> {
  const preferences = await loadNetworkPreferences();
  return preferences[symbol] ?? null;
}

/**
 * Set preference for a specific token
 */
export async function setTokenPreference(
  symbol: string,
  networkId: NetworkId | null
): Promise<void> {
  const preferences = await loadNetworkPreferences();

  if (networkId === null) {
    delete preferences[symbol];
  } else {
    preferences[symbol] = networkId;
  }

  await saveNetworkPreferences(preferences);
}
