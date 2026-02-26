/**
 * Price Chart Service
 * Fetches historical price data from CoinGecko.
 * Pure fetch — no caching, no platform dependencies.
 */

import { COINGECKO_IDS } from '../constants/coingecko';

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

/**
 * Get CoinGecko coin ID for a token symbol
 */
export function getCoinGeckoId(symbol: string): string | null {
  return COINGECKO_IDS[symbol.toUpperCase()] || null;
}

/**
 * Fetch historical price data for a token
 */
export async function fetchPriceChartData(
  symbol: string,
  days: 1 | 7 | 30 = 1,
): Promise<PriceChartData | null> {
  const coinId = getCoinGeckoId(symbol);
  if (!coinId) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const [chartResponse, priceResponse] = await Promise.all([
      fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`,
        { headers: { Accept: 'application/json' }, signal: controller.signal },
      ),
      fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_high_low=true`,
        { headers: { Accept: 'application/json' }, signal: controller.signal },
      ),
    ]);

    clearTimeout(timeoutId);

    if (!chartResponse.ok) return null;

    const chartData = (await chartResponse.json()) as { prices?: [number, number][] };

    let currentPrice = 0;
    let priceChange24h = 0;
    let priceChangePercentage24h = 0;
    let high24h = 0;
    let low24h = 0;

    if (priceResponse.ok) {
      const priceData = (await priceResponse.json()) as Record<string, Record<string, number>>;
      const tokenData = priceData[coinId];
      if (tokenData) {
        currentPrice = tokenData.usd || 0;
        priceChangePercentage24h = tokenData.usd_24h_change || 0;
        high24h = tokenData.usd_24h_high || 0;
        low24h = tokenData.usd_24h_low || 0;
        priceChange24h = (currentPrice * priceChangePercentage24h) / 100;
      }
    }

    const prices: PricePoint[] = (chartData.prices || []).map(
      ([timestamp, price]: [number, number]) => ({ timestamp, price }),
    );

    return {
      prices,
      currentPrice,
      priceChange24h,
      priceChangePercentage24h,
      high24h,
      low24h,
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Fetch historical price data for a token by contract address (ERC-20 tokens).
 * Pure fetch — no caching, no platform dependencies.
 */
export async function fetchPriceChartByContract(
  contractAddress: string,
  days: 1 | 7 | 30 = 1,
): Promise<PriceChartData | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const chartResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/ethereum/contract/${contractAddress}/market_chart/?vs_currency=usd&days=${days}`,
      { headers: { Accept: 'application/json' }, signal: controller.signal },
    );

    if (!chartResponse.ok) {
      clearTimeout(timeoutId);
      return null;
    }

    const chartData = (await chartResponse.json()) as { prices?: [number, number][] };
    clearTimeout(timeoutId);

    const prices: PricePoint[] = (chartData.prices || []).map(
      ([timestamp, price]: [number, number]) => ({ timestamp, price }),
    );

    const currentPrice = prices.length > 0 ? prices[prices.length - 1].price : 0;
    const startPrice = prices.length > 0 ? prices[0].price : 0;
    const priceChange24h = currentPrice - startPrice;
    const priceChangePercentage24h =
      startPrice > 0 ? (priceChange24h / startPrice) * 100 : 0;

    let high24h = 0;
    let low24h = Infinity;
    for (const point of prices) {
      if (point.price > high24h) high24h = point.price;
      if (point.price < low24h) low24h = point.price;
    }
    if (low24h === Infinity) low24h = 0;

    return {
      prices,
      currentPrice,
      priceChange24h,
      priceChangePercentage24h,
      high24h,
      low24h,
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}
