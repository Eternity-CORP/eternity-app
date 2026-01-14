/**
 * Price Chart Service
 * Fetches historical price data for tokens from CoinGecko
 */

import * as SecureStore from 'expo-secure-store';

// CoinGecko coin IDs for common tokens
const TOKEN_COIN_IDS: Record<string, string> = {
  ETH: 'ethereum',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
  WETH: 'weth',
  WBTC: 'wrapped-bitcoin',
  UNI: 'uniswap',
  LINK: 'chainlink',
  AAVE: 'aave',
  MKR: 'maker',
};

export interface PricePoint {
  timestamp: number;
  price: number;
}

export interface PriceChartData {
  prices: PricePoint[];
  currentPrice: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  high24h: number;
  low24h: number;
}

const CHART_CACHE_KEY = 'price_chart_cache';
const CHART_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CachedChartData {
  [key: string]: {
    data: PriceChartData;
    timestamp: number;
  };
}

/**
 * Get cached chart data
 */
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

/**
 * Save chart data to cache
 */
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
 * Get CoinGecko coin ID for a token symbol
 */
export function getCoinGeckoId(symbol: string): string | null {
  return TOKEN_COIN_IDS[symbol.toUpperCase()] || null;
}

/**
 * Fetch historical price data for a token
 * @param symbol Token symbol (ETH, USDC, etc.)
 * @param days Number of days of history (1, 7, 30)
 */
export async function fetchPriceChartData(
  symbol: string,
  days: 1 | 7 | 30 = 1
): Promise<PriceChartData | null> {
  const coinId = getCoinGeckoId(symbol);
  if (!coinId) {
    console.warn(`No CoinGecko ID found for ${symbol}`);
    return null;
  }

  const cacheKey = `${coinId}_${days}`;

  // Check cache first
  const cached = await getCachedChartData(cacheKey);
  if (cached) {
    return cached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    // Fetch market chart data
    const chartResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`,
      {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      }
    );

    if (!chartResponse.ok) {
      console.warn('CoinGecko chart API error:', chartResponse.status);
      clearTimeout(timeoutId);
      return null;
    }

    const chartData = await chartResponse.json();

    // Fetch current price and 24h change
    const priceResponse = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_high_low=true`,
      {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    let currentPrice = 0;
    let priceChange24h = 0;
    let priceChangePercentage24h = 0;
    let high24h = 0;
    let low24h = 0;

    if (priceResponse.ok) {
      const priceData = await priceResponse.json();
      const tokenData = priceData[coinId];
      if (tokenData) {
        currentPrice = tokenData.usd || 0;
        priceChangePercentage24h = tokenData.usd_24h_change || 0;
        high24h = tokenData.usd_24h_high || 0;
        low24h = tokenData.usd_24h_low || 0;
        priceChange24h = (currentPrice * priceChangePercentage24h) / 100;
      }
    }

    // Parse price points
    const prices: PricePoint[] = (chartData.prices || []).map(
      ([timestamp, price]: [number, number]) => ({
        timestamp,
        price,
      })
    );

    const result: PriceChartData = {
      prices,
      currentPrice,
      priceChange24h,
      priceChangePercentage24h,
      high24h,
      low24h,
    };

    // Cache the result
    await setCachedChartData(cacheKey, result);

    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Price chart fetch timeout');
    } else {
      console.warn('Error fetching price chart:', error);
    }
    return null;
  }
}

/**
 * Fetch historical price data for a token by contract address (for ERC-20 tokens)
 * @param contractAddress Token contract address
 * @param days Number of days of history (1, 7, 30)
 */
export async function fetchPriceChartByContract(
  contractAddress: string,
  days: 1 | 7 | 30 = 1
): Promise<PriceChartData | null> {
  const cacheKey = `${contractAddress.toLowerCase()}_${days}`;

  // Check cache first
  const cached = await getCachedChartData(cacheKey);
  if (cached) {
    return cached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    // Fetch market chart data by contract
    const chartResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/ethereum/contract/${contractAddress}/market_chart/?vs_currency=usd&days=${days}`,
      {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      }
    );

    if (!chartResponse.ok) {
      console.warn('CoinGecko contract chart API error:', chartResponse.status);
      clearTimeout(timeoutId);
      return null;
    }

    const chartData = await chartResponse.json();
    clearTimeout(timeoutId);

    // Parse price points
    const prices: PricePoint[] = (chartData.prices || []).map(
      ([timestamp, price]: [number, number]) => ({
        timestamp,
        price,
      })
    );

    // Calculate current price and change from the data
    const currentPrice = prices.length > 0 ? prices[prices.length - 1].price : 0;
    const startPrice = prices.length > 0 ? prices[0].price : 0;
    const priceChange24h = currentPrice - startPrice;
    const priceChangePercentage24h = startPrice > 0 ? ((priceChange24h / startPrice) * 100) : 0;

    // Find high and low
    let high24h = 0;
    let low24h = Infinity;
    for (const point of prices) {
      if (point.price > high24h) high24h = point.price;
      if (point.price < low24h) low24h = point.price;
    }
    if (low24h === Infinity) low24h = 0;

    const result: PriceChartData = {
      prices,
      currentPrice,
      priceChange24h,
      priceChangePercentage24h,
      high24h,
      low24h,
    };

    // Cache the result
    await setCachedChartData(cacheKey, result);

    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Price chart fetch timeout');
    } else {
      console.warn('Error fetching price chart by contract:', error);
    }
    return null;
  }
}
