/**
 * Balance Service
 * Handles fetching token balances from blockchain via RPC
 */

import { JsonRpcProvider, formatEther } from 'ethers';

// RPC Configuration
// Load from environment variables (set in .env file)
// For Expo, variables must be prefixed with EXPO_PUBLIC_
// The .env file is gitignored, use .env.example as template
// Default values for development (Sepolia testnet)
const ALCHEMY_API_KEY = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY || '***REDACTED_ALCHEMY_KEY***';
const INFURA_API_KEY = process.env.EXPO_PUBLIC_INFURA_API_KEY || '78032b87897043d1a7c69d20fd9731dd';
const NETWORK = process.env.EXPO_PUBLIC_NETWORK || 'sepolia'; // 'sepolia' | 'mainnet'

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
 * Fetch USD price for ETH
 * Uses CoinGecko API (free tier)
 */
export async function fetchEthUsdPrice(): Promise<number> {
  try {
    // CoinGecko API (free, no API key needed for basic usage)
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        // Add timeout for mobile networks
        signal: AbortSignal.timeout(10000), // 10 second timeout
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.warn(`CoinGecko API error: ${response.status} ${response.statusText}`, errorText);
      // Return 0 for graceful degradation
      return 0;
    }
    
    const data = await response.json();
    const price = data.ethereum?.usd;
    
    if (typeof price !== 'number' || price <= 0) {
      console.warn('Invalid ETH price from CoinGecko:', data);
      return 0;
    }
    
    return price;
  } catch (error) {
    // Handle network errors, timeouts, etc.
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('ETH price fetch timeout');
      } else {
        console.warn('Error fetching ETH USD price:', error.message);
      }
    } else {
      console.warn('Unknown error fetching ETH price:', error);
    }
    // Return 0 if API fails (graceful degradation)
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
