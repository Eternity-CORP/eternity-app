// Enhanced price service for USD conversion with fallbacks and error handling
// Uses multiple APIs for better reliability

import { networkLogger } from './networkLogger';

interface PriceCache {
  price: number;
  timestamp: number;
}

const priceCache = new Map<string, PriceCache>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Multiple API endpoints for price fetching
const priceApis = [
  {
    name: 'CoinGecko',
    url: 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
    parser: (data: any) => data?.ethereum?.usd,
  },
  {
    name: 'CoinGecko Alternative',
    url: 'https://api.coingecko.com/api/v3/coins/ethereum?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false',
    parser: (data: any) => data?.market_data?.current_price?.usd,
  },
];

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'EternityWallet/1.0',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function getEthUsdPrice(): Promise<number> {
  const cacheKey = 'ETH_USD';
  const cached = priceCache.get(cacheKey);
  
  // Return cached price if still valid
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Using cached ETH price: $${cached.price}`);
    return cached.price;
  }

  // Try each API endpoint
  for (const api of priceApis) {
    try {
      console.log(`Fetching ETH price from ${api.name}...`);
      const response = await networkLogger.loggedFetch(api.url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const price = api.parser(data);
      
      if (typeof price === 'number' && price > 0) {
        console.log(`✓ ETH price from ${api.name}: $${price}`);
        
        // Cache the successful result
        priceCache.set(cacheKey, { price, timestamp: Date.now() });
        return price;
      } else {
        throw new Error('Invalid price data received');
      }
    } catch (error: any) {
      console.warn(`✗ ${api.name} failed:`, error?.message || error);
      continue;
    }
  }

  // If all APIs fail, return cached price if available, otherwise 0
  if (cached) {
    console.warn('All price APIs failed, using stale cached price');
    return cached.price;
  }

  console.error('All price APIs failed and no cached price available');
  return 0;
}

export async function getTokenUsdPrice(symbol: string): Promise<number> {
  const s = (symbol || '').toUpperCase();
  
  // Stablecoins are pegged to $1
  if (s === 'USDC' || s === 'USDT' || s === 'DAI') {
    return 1;
  }
  
  // ETH price
  if (s === 'ETH') {
    return await getEthUsdPrice();
  }
  
  // For other tokens, implement lookup as needed; default 0 for now
  console.warn(`Price lookup not implemented for token: ${symbol}`);
  return 0;
}
