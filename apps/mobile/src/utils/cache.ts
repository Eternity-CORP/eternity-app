/**
 * Cache Utilities
 * Provides generic caching helpers for address-based data storage
 */

import Storage from './storage';
import { createLogger } from './logger';

const log = createLogger('CacheUtils');

/**
 * Load cached data for a specific address
 * @param cacheKey Base cache key
 * @param address Wallet address
 * @returns Cached data array or empty array if not found
 */
export async function loadCached<T>(
  cacheKey: string,
  address: string
): Promise<T[]> {
  try {
    const fullKey = `${cacheKey}_${address.toLowerCase()}`;
    const data = await Storage.getItem(fullKey);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    log.warn(`Failed to load cached data for ${cacheKey}`, error);
    return [];
  }
}

/**
 * Cache data for a specific address
 * @param cacheKey Base cache key
 * @param address Wallet address
 * @param data Data to cache
 */
export async function cache<T>(
  cacheKey: string,
  address: string,
  data: T[]
): Promise<void> {
  try {
    const fullKey = `${cacheKey}_${address.toLowerCase()}`;
    await Storage.setItem(fullKey, JSON.stringify(data));
  } catch (error) {
    log.warn(`Failed to cache data for ${cacheKey}`, error);
  }
}

/**
 * Clear cached data for a specific address
 * @param cacheKey Base cache key
 * @param address Wallet address
 */
export async function clearCache(cacheKey: string, address: string): Promise<void> {
  try {
    const fullKey = `${cacheKey}_${address.toLowerCase()}`;
    await Storage.removeItem(fullKey);
  } catch (error) {
    log.warn(`Failed to clear cache for ${cacheKey}`, error);
  }
}
