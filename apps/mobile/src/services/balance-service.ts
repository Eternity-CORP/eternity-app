/**
 * Balance Service
 * Handles fetching token balances from blockchain via RPC
 *
 * Delegates Alchemy/CoinGecko fetches to @e-y/shared.
 * Keeps: ethers getBalance, SecureStore cache, provider singleton (platform-specific).
 */

import { JsonRpcProvider, formatEther } from 'ethers';
import * as SecureStore from 'expo-secure-store';
import {
  formatUsd,
  fetchAlchemyTokenBalances as sharedFetchTokenBalances,
  fetchAlchemyTokenMetadata as sharedFetchMetadata,
  fetchEthUsdPrice as sharedFetchEthPrice,
  fetchTokenPrices as sharedFetchTokenPrices,
  getTokenIconUrl as sharedGetTokenIconUrl,
  formatRawTokenBalance,
  calculateTotalUsdValue as sharedCalcTotal,
  type AlchemyTokenBalanceEntry,
} from '@e-y/shared';
import { createLogger } from '@/src/utils/logger';

const log = createLogger('BalanceService');

// RPC Configuration
const ALCHEMY_API_KEY = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY;
const INFURA_API_KEY = process.env.EXPO_PUBLIC_INFURA_API_KEY;
const NETWORK = process.env.EXPO_PUBLIC_NETWORK || 'sepolia';

// Cache configuration
const ETH_PRICE_CACHE_KEY = 'eth_price_cache';
const ETH_PRICE_CACHE_DURATION = 60 * 1000; // 1 minute
const TOKEN_METADATA_CACHE_KEY = 'token_metadata_cache';
const TOKEN_PRICES_CACHE_KEY = 'token_prices_cache';

interface CachedPrice {
  price: number;
  timestamp: number;
}

interface CachedTokenMetadata {
  [contractAddress: string]: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

interface CachedTokenPrices {
  prices: { [contractAddress: string]: number };
  ethPrice: number;
  timestamp: number;
}

// RPC URL helpers
const getRpcUrl = (): string => {
  if (ALCHEMY_API_KEY) {
    return `https://eth-${NETWORK}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
  }
  if (INFURA_API_KEY) {
    return `https://${NETWORK}.infura.io/v3/${INFURA_API_KEY}`;
  }
  return NETWORK === 'mainnet'
    ? 'https://eth.llamarpc.com'
    : 'https://rpc.sepolia.org';
};

const getAlchemyUrl = (): string => {
  return `https://eth-${NETWORK}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
};

// Provider singleton
let provider: JsonRpcProvider | null = null;

export const getProvider = (): JsonRpcProvider => {
  if (!provider) {
    provider = new JsonRpcProvider(getRpcUrl());
  }
  return provider;
};

export interface TokenBalance {
  token: string;
  symbol: string;
  name: string;
  balance: string;
  balanceRaw: string;
  decimals: number;
  usdValue?: number;
  iconUrl?: string;
  lastUpdated: number;
}

// Cache helpers
async function getCachedPrice(): Promise<number | null> {
  try {
    const cached = await SecureStore.getItemAsync(ETH_PRICE_CACHE_KEY);
    if (!cached) return null;

    const data: CachedPrice = JSON.parse(cached);
    if (Date.now() - data.timestamp < ETH_PRICE_CACHE_DURATION) {
      return data.price;
    }
    return null;
  } catch (error) {
    log.warn('Failed to read cached ETH price', error);
    return null;
  }
}

async function setCachedPrice(price: number): Promise<void> {
  try {
    const data: CachedPrice = { price, timestamp: Date.now() };
    await SecureStore.setItemAsync(ETH_PRICE_CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    log.warn('Failed to cache ETH price', error);
  }
}

async function getCachedMetadata(): Promise<CachedTokenMetadata> {
  try {
    const cached = await SecureStore.getItemAsync(TOKEN_METADATA_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (error) {
    log.warn('Failed to read metadata cache', error);
    return {};
  }
}

async function setCachedMetadata(metadata: CachedTokenMetadata): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_METADATA_CACHE_KEY, JSON.stringify(metadata));
  } catch (error) {
    log.warn('Failed to cache metadata', error);
  }
}

async function getCachedTokenPrices(): Promise<CachedTokenPrices | null> {
  try {
    const cached = await SecureStore.getItemAsync(TOKEN_PRICES_CACHE_KEY);
    if (!cached) return null;

    const data: CachedTokenPrices = JSON.parse(cached);
    if (Date.now() - data.timestamp < ETH_PRICE_CACHE_DURATION) {
      return data;
    }
    return null;
  } catch (error) {
    log.warn('Failed to read token prices cache', error);
    return null;
  }
}

async function setCachedTokenPrices(prices: CachedTokenPrices): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_PRICES_CACHE_KEY, JSON.stringify(prices));
  } catch (error) {
    log.warn('Failed to cache token prices', error);
  }
}

/**
 * Fetch ETH balance for an address (platform-specific: uses ethers RPC)
 */
export async function fetchEthBalance(address: string): Promise<TokenBalance> {
  try {
    const rpcProvider = getProvider();
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
      name: 'Ethereum',
      balance: parseFloat(balance).toFixed(6),
      balanceRaw: balanceWei.toString(),
      decimals: 18,
      iconUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
      lastUpdated: Date.now(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.warn('Failed to fetch ETH balance', error);
    throw new Error(`Failed to fetch ETH balance: ${message}`);
  }
}

/**
 * Fetch all ERC-20 token balances using shared Alchemy function
 */
export async function fetchAllTokenBalances(address: string): Promise<AlchemyTokenBalanceEntry[]> {
  return sharedFetchTokenBalances(getAlchemyUrl(), address);
}

/**
 * Fetch USD price for ETH with SecureStore caching
 */
export async function fetchEthUsdPrice(): Promise<number> {
  const cachedPrice = await getCachedPrice();
  if (cachedPrice !== null) {
    return cachedPrice;
  }

  const price = await sharedFetchEthPrice();
  if (price > 0) {
    await setCachedPrice(price);
  }
  return price;
}

/**
 * Fetch token metadata with SecureStore caching
 */
export async function fetchTokenMetadata(
  contractAddress: string
): Promise<{ name: string; symbol: string; decimals: number } | null> {
  const metadataCache = await getCachedMetadata();
  if (metadataCache[contractAddress.toLowerCase()]) {
    return metadataCache[contractAddress.toLowerCase()];
  }

  const result = await sharedFetchMetadata(getAlchemyUrl(), contractAddress);
  if (result) {
    const updatedCache = { ...metadataCache, [contractAddress.toLowerCase()]: result };
    await setCachedMetadata(updatedCache);
  }
  return result;
}

/**
 * Fetch USD prices for ETH and multiple tokens with SecureStore caching
 */
export async function fetchTokenPrices(
  contractAddresses: string[]
): Promise<{ ethPrice: number; tokenPrices: { [address: string]: number } }> {
  const cached = await getCachedTokenPrices();
  if (cached) {
    return { ethPrice: cached.ethPrice, tokenPrices: cached.prices };
  }

  const result = await sharedFetchTokenPrices(contractAddresses);

  await setCachedTokenPrices({
    prices: result.tokenPrices,
    ethPrice: result.ethPrice,
    timestamp: Date.now(),
  });

  return result;
}

/**
 * Get token icon URL from Trust Wallet Assets
 */
export const getTokenIconUrl = sharedGetTokenIconUrl;

/**
 * Format raw token balance to human-readable string
 */
export const formatTokenBalance = formatRawTokenBalance;

/**
 * Calculate total USD value from token balances
 */
export function calculateTotalUsdValue(balances: TokenBalance[]): number {
  return sharedCalcTotal(balances);
}

/** @deprecated Use formatUsd from @e-y/shared */
export const formatUsdValue = formatUsd;

/**
 * Fetch all balances (ETH + ERC-20) for an address
 */
export async function fetchAllBalances(address: string): Promise<{
  balances: TokenBalance[];
  ethPrice: number;
  totalUsdValue: number;
}> {
  const [ethBalance, tokenBalances] = await Promise.all([
    fetchEthBalance(address),
    fetchAllTokenBalances(address),
  ]);

  const contractAddresses = tokenBalances.map((t) => t.contractAddress);

  const [{ ethPrice, tokenPrices }, ...metadataResults] = await Promise.all([
    fetchTokenPrices(contractAddresses),
    ...tokenBalances.map((t) => fetchTokenMetadata(t.contractAddress)),
  ]);

  const ethUsdValue = parseFloat(ethBalance.balance) * ethPrice;
  const ethBalanceWithPrice: TokenBalance = {
    ...ethBalance,
    usdValue: ethUsdValue,
  };

  const erc20Balances: TokenBalance[] = [];

  for (let i = 0; i < tokenBalances.length; i++) {
    const tokenData = tokenBalances[i];
    const metadata = metadataResults[i];

    if (!metadata) continue;

    const balance = formatTokenBalance(tokenData.tokenBalance, metadata.decimals);
    const balanceNum = parseFloat(balance);

    if (balanceNum === 0) continue;

    const price = tokenPrices[tokenData.contractAddress.toLowerCase()] || 0;
    const usdValue = balanceNum * price;

    erc20Balances.push({
      token: tokenData.contractAddress,
      symbol: metadata.symbol,
      name: metadata.name,
      balance,
      balanceRaw: tokenData.tokenBalance,
      decimals: metadata.decimals,
      usdValue,
      iconUrl: getTokenIconUrl(tokenData.contractAddress),
      lastUpdated: Date.now(),
    });
  }

  const allBalances = [ethBalanceWithPrice, ...erc20Balances].sort(
    (a, b) => (b.usdValue || 0) - (a.usdValue || 0)
  );

  const totalUsdValue = calculateTotalUsdValue(allBalances);

  return { balances: allBalances, ethPrice, totalUsdValue };
}
