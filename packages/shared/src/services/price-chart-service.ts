/**
 * Price Chart Service
 * Fetches historical price data from CoinGecko.
 * Pure fetch — no caching, no platform dependencies.
 */

export const TOKEN_COIN_IDS: Record<string, string> = {
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
  MATIC: 'matic-network',
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

/**
 * Get CoinGecko coin ID for a token symbol
 */
export function getCoinGeckoId(symbol: string): string | null {
  return TOKEN_COIN_IDS[symbol.toUpperCase()] || null;
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
