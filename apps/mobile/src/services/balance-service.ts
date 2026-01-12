/**
 * Balance Service
 * Handles fetching token balances from blockchain via RPC
 */

import { JsonRpcProvider, formatEther } from 'ethers';
import * as SecureStore from 'expo-secure-store';

// RPC Configuration
// Load from environment variables (set in .env file)
// For Expo, variables must be prefixed with EXPO_PUBLIC_
// The .env file is gitignored, use .env.example as template
// Default values for development (Sepolia testnet)
const ALCHEMY_API_KEY = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY || 'UrBsk4l8uqp1oQid2tGGtrcKXybIZqbR';
const INFURA_API_KEY = process.env.EXPO_PUBLIC_INFURA_API_KEY || '78032b87897043d1a7c69d20fd9731dd';
const NETWORK = process.env.EXPO_PUBLIC_NETWORK || 'sepolia'; // 'sepolia' | 'mainnet'

// Cache configuration for ETH price
const ETH_PRICE_CACHE_KEY = 'eth_price_cache';
const ETH_PRICE_CACHE_DURATION = 60 * 1000; // 1 minute cache (to avoid rate limits)

interface CachedPrice {
  price: number;
  timestamp: number;
}

// RPC URLs
const getRpcUrl = (): string => {
  if (ALCHEMY_API_KEY) {
    return `https://eth-${NETWORK}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
  }
  if (INFURA_API_KEY) {
    return `https://${NETWORK}.infura.io/v3/${INFURA_API_KEY}`;
  }
  // Fallback to public RPC (rate limited)
  return NETWORK === 'mainnet' 
    ? 'https://eth.llamarpc.com'
    : 'https://rpc.sepolia.org';
};

// Create provider instance
let provider: JsonRpcProvider | null = null;

const getProvider = (): JsonRpcProvider => {
  if (!provider) {
    provider = new JsonRpcProvider(getRpcUrl());
  }
  return provider;
};

export interface TokenBalance {
  token: string; // 'ETH' or token contract address
  symbol: string;
  balance: string; // Human-readable balance (e.g., "1.5")
  balanceWei?: string; // Raw balance in Wei (for ETH)
  usdValue?: number;
  lastUpdated: number; // Timestamp
}

/**
 * Fetch ETH balance for an address
 */
export async function fetchEthBalance(address: string): Promise<TokenBalance> {
  try {
    const rpcProvider = getProvider();
    // Add timeout for RPC calls
    const balanceWei = await Promise.race([
      rpcProvider.getBalance(address),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('RPC timeout')), 15000)
      ),
    ]);
    const balance = formatEther(balanceWei);
    
    return {
      token: 'ETH',
      symbol: 'ETH',
      balance: parseFloat(balance).toFixed(6), // Format to 6 decimals
      balanceWei: balanceWei.toString(),
      lastUpdated: Date.now(),
    };
  } catch (error) {
    if (error instanceof Error) {
      console.warn('Error fetching ETH balance:', error.message);
      throw new Error(`Failed to fetch ETH balance: ${error.message}`);
    } else {
      console.warn('Unknown error fetching ETH balance:', error);
      throw new Error('Failed to fetch ETH balance');
    }
  }
}

/**
 * Get cached ETH price if still valid
 */
async function getCachedPrice(): Promise<number | null> {
  try {
    const cached = await SecureStore.getItemAsync(ETH_PRICE_CACHE_KEY);
    if (!cached) return null;
    
    const cachedData: CachedPrice = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid (within cache duration)
    if (now - cachedData.timestamp < ETH_PRICE_CACHE_DURATION) {
      return cachedData.price;
    }
    
    return null;
  } catch (error) {
    console.warn('Error reading cached ETH price:', error);
    return null;
  }
}

/**
 * Save ETH price to cache
 */
async function setCachedPrice(price: number): Promise<void> {
  try {
    const cachedData: CachedPrice = {
      price,
      timestamp: Date.now(),
    };
    await SecureStore.setItemAsync(ETH_PRICE_CACHE_KEY, JSON.stringify(cachedData));
  } catch (error) {
    console.warn('Error caching ETH price:', error);
    // Non-critical, continue without cache
  }
}

/**
 * Fetch USD price for ETH
 * Uses CoinGecko API (free tier) with caching to avoid rate limits
 */
export async function fetchEthUsdPrice(): Promise<number> {
  // Check cache first
  const cachedPrice = await getCachedPrice();
  if (cachedPrice !== null) {
    return cachedPrice;
  }

  // Create AbortController for timeout (AbortSignal.timeout may not be available in React Native)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    // CoinGecko API (free, no API key needed for basic usage)
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.warn(`CoinGecko API error: ${response.status} ${response.statusText}`, errorText);
      
      // If rate limited, try to use cached price even if expired
      if (response.status === 429) {
        const expiredCache = await getCachedPrice();
        if (expiredCache !== null) {
          console.warn('Rate limited, using expired cache');
          return expiredCache;
        }
      }
      
      // Return 0 for graceful degradation
      return 0;
    }
    
    const data = await response.json();
    const price = data.ethereum?.usd;
    
    if (typeof price !== 'number' || price <= 0) {
      console.warn('Invalid ETH price from CoinGecko:', data);
      return 0;
    }
    
    // Cache the price
    await setCachedPrice(price);
    
    return price;
  } catch (error) {
    clearTimeout(timeoutId);
    // Handle network errors, timeouts, etc.
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('ETH price fetch timeout (10s)');
      } else {
        console.warn('Error fetching ETH USD price:', error.message);
      }
    } else {
      console.warn('Unknown error fetching ETH price:', error);
    }
    
    // Try to use cached price even if expired
    const expiredCache = await getCachedPrice();
    if (expiredCache !== null) {
      console.warn('Using expired cache due to error');
      return expiredCache;
    }
    
    // Return 0 if API fails and no cache available
    return 0;
  }
}

/**
 * Calculate total USD value from token balances
 */
export function calculateTotalUsdValue(balances: TokenBalance[]): number {
  return balances.reduce((total, token) => {
    return total + (token.usdValue || 0);
  }, 0);
}

/**
 * Format USD value for display
 */
export function formatUsdValue(value: number): string {
  if (value === 0) return '$0.00';
  if (value < 0.01) return '<$0.01';
  if (value < 1) return `$${value.toFixed(2)}`;
  if (value < 1000) return `$${value.toFixed(2)}`;
  if (value < 1000000) {
    const kValue = value / 1000;
    return `$${kValue.toFixed(kValue < 10 ? 2 : 1)}K`;
  }
  const mValue = value / 1000000;
  return `$${mValue.toFixed(mValue < 10 ? 2 : 1)}M`;
}
