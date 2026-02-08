/**
 * Price Chart Service (Mobile)
 * Delegates fetch logic to @e-y/shared, adds SecureStore caching layer.
 */

import * as SecureStore from 'expo-secure-store';
import {
  type PricePoint,
  type PriceChartData,
  getCoinGeckoId,
  fetchPriceChartData as sharedFetchPriceChartData,
  fetchPriceChartByContract as sharedFetchPriceChartByContract,
} from '@e-y/shared';

export type { PricePoint, PriceChartData };
export { getCoinGeckoId };

const CHART_CACHE_KEY = 'price_chart_cache';
const CHART_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedChartData {
  [key: string]: {
    data: PriceChartData;
    timestamp: number;
  };
}

async function getCachedChartData(cacheKey: string): Promise<PriceChartData | null> {
  try {
    const cached = await SecureStore.getItemAsync(CHART_CACHE_KEY);
    if (!cached) return null;

    const cacheData: CachedChartData = JSON.parse(cached);
    const entry = cacheData[cacheKey];

    if (entry && Date.now() - entry.timestamp < CHART_CACHE_DURATION) {
      return entry.data;
    }
    return null;
  } catch (error) {
    console.warn('Error reading chart cache:', error);
    return null;
  }
}

async function setCachedChartData(cacheKey: string, data: PriceChartData): Promise<void> {
  try {
    const cached = await SecureStore.getItemAsync(CHART_CACHE_KEY);
    const cacheData: CachedChartData = cached ? JSON.parse(cached) : {};

    cacheData[cacheKey] = {
      data,
      timestamp: Date.now(),
    };

    await SecureStore.setItemAsync(CHART_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Error saving chart cache:', error);
  }
}

/**
 * Fetch historical price data for a token (with local cache)
 */
export async function fetchPriceChartData(
  symbol: string,
  days: 1 | 7 | 30 = 1
): Promise<PriceChartData | null> {
  const coinId = getCoinGeckoId(symbol);
  if (!coinId) return null;

  const cacheKey = `${coinId}_${days}`;
  const cached = await getCachedChartData(cacheKey);
  if (cached) return cached;

  const result = await sharedFetchPriceChartData(symbol, days);
  if (result) {
    await setCachedChartData(cacheKey, result);
  }
  return result;
}

/**
 * Fetch historical price data for a token by contract address (with local cache)
 */
export async function fetchPriceChartByContract(
  contractAddress: string,
  days: 1 | 7 | 30 = 1
): Promise<PriceChartData | null> {
  const cacheKey = `${contractAddress.toLowerCase()}_${days}`;
  const cached = await getCachedChartData(cacheKey);
  if (cached) return cached;

  const result = await sharedFetchPriceChartByContract(contractAddress, days);
  if (result) {
    await setCachedChartData(cacheKey, result);
  }
  return result;
}
