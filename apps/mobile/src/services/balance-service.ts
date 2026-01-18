/**
 * Balance Service
 * Handles fetching token balances from blockchain via RPC
 */

import { JsonRpcProvider, formatEther } from 'ethers';
import * as SecureStore from 'expo-secure-store';
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

interface AlchemyTokenBalance {
  contractAddress: string;
  tokenBalance: string;
}

interface AlchemyTokenBalancesResponse {
  jsonrpc: string;
  id: number;
  result: {
    address: string;
    tokenBalances: AlchemyTokenBalance[];
  };
}

interface AlchemyTokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo: string | null;
}

interface AlchemyTokenMetadataResponse {
  jsonrpc: string;
  id: number;
  result: AlchemyTokenMetadata;
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
 * Fetch ETH balance for an address
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
 * Fetch all ERC-20 token balances using Alchemy API
 */
export async function fetchAllTokenBalances(address: string): Promise<AlchemyTokenBalance[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(getAlchemyUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getTokenBalances',
        params: [address, 'erc20'],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      log.warn('Alchemy API error', { status: response.status });
      return [];
    }

    const data: AlchemyTokenBalancesResponse = await response.json();
    return data.result.tokenBalances.filter(
      (token) => token.tokenBalance !== '0x0' && token.tokenBalance !== '0x'
    );
  } catch (error) {
    clearTimeout(timeoutId);
    log.warn('Failed to fetch token balances', error);
    return [];
  }
}

/**
 * Fetch USD price for ETH with caching
 */
export async function fetchEthUsdPrice(): Promise<number> {
  const cachedPrice = await getCachedPrice();
  if (cachedPrice !== null) {
    return cachedPrice;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      log.warn('CoinGecko API error', { status: response.status });
      if (response.status === 429) {
        const expiredCache = await getCachedPrice();
        if (expiredCache !== null) {
          return expiredCache;
        }
      }
      return 0;
    }

    const data = await response.json();
    const price = data.ethereum?.usd;

    if (typeof price !== 'number' || price <= 0) {
      log.warn('Invalid ETH price from CoinGecko', data);
      return 0;
    }

    await setCachedPrice(price);
    return price;
  } catch (error) {
    clearTimeout(timeoutId);
    log.warn('Failed to fetch ETH price', error);

    const expiredCache = await getCachedPrice();
    if (expiredCache !== null) {
      return expiredCache;
    }
    return 0;
  }
}

/**
 * Fetch token metadata from Alchemy API
 */
export async function fetchTokenMetadata(
  contractAddress: string
): Promise<{ name: string; symbol: string; decimals: number } | null> {
  const cache = await getCachedMetadata();
  if (cache[contractAddress.toLowerCase()]) {
    return cache[contractAddress.toLowerCase()];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(getAlchemyUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getTokenMetadata',
        params: [contractAddress],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      log.warn('Alchemy metadata API error', { status: response.status });
      return null;
    }

    const data: AlchemyTokenMetadataResponse = await response.json();
    const { name, symbol, decimals } = data.result;

    const updatedCache = { ...cache, [contractAddress.toLowerCase()]: { name, symbol, decimals } };
    await setCachedMetadata(updatedCache);

    return { name, symbol, decimals };
  } catch (error) {
    clearTimeout(timeoutId);
    log.warn('Failed to fetch token metadata', error);
    return null;
  }
}

/**
 * Fetch USD prices for ETH and multiple tokens
 */
export async function fetchTokenPrices(
  contractAddresses: string[]
): Promise<{ ethPrice: number; tokenPrices: { [address: string]: number } }> {
  const cached = await getCachedTokenPrices();
  if (cached) {
    return { ethPrice: cached.ethPrice, tokenPrices: cached.prices };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const ethResponse = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      {
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      }
    );

    let ethPrice = 0;
    if (ethResponse.ok) {
      const ethData = await ethResponse.json();
      ethPrice = ethData.ethereum?.usd || 0;
    }

    const tokenPrices: { [address: string]: number } = {};

    if (contractAddresses.length > 0) {
      const addressList = contractAddresses.slice(0, 100).join(',');
      const tokenResponse = await fetch(
        `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${addressList}&vs_currencies=usd`,
        {
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        }
      );

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        for (const [address, priceData] of Object.entries(tokenData)) {
          tokenPrices[address.toLowerCase()] = (priceData as { usd?: number })?.usd || 0;
        }
      }
    }

    clearTimeout(timeoutId);

    await setCachedTokenPrices({
      prices: tokenPrices,
      ethPrice,
      timestamp: Date.now(),
    });

    return { ethPrice, tokenPrices };
  } catch (error) {
    clearTimeout(timeoutId);
    log.warn('Failed to fetch token prices', error);

    const expiredCache = await getCachedTokenPrices();
    if (expiredCache) {
      return { ethPrice: expiredCache.ethPrice, tokenPrices: expiredCache.prices };
    }

    return { ethPrice: 0, tokenPrices: {} };
  }
}

/**
 * Get token icon URL from Trust Wallet Assets
 */
export function getTokenIconUrl(contractAddress: string): string {
  return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${contractAddress}/logo.png`;
}

/**
 * Format raw token balance to human-readable string
 */
export function formatTokenBalance(rawBalance: string, decimals: number): string {
  if (!rawBalance || rawBalance === '0x0' || rawBalance === '0x') {
    return '0';
  }

  const balance = BigInt(rawBalance);
  const divisor = BigInt(10 ** decimals);
  const wholePart = balance / divisor;
  const fractionalPart = balance % divisor;

  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.slice(0, 6).replace(/0+$/, '') || '0';

  if (wholePart === BigInt(0) && balance > BigInt(0)) {
    return `0.${fractionalStr.slice(0, 6)}`;
  }

  return `${wholePart}.${trimmedFractional}`;
}

/**
 * Calculate total USD value from token balances
 */
export function calculateTotalUsdValue(balances: TokenBalance[]): number {
  return balances.reduce((total, token) => total + (token.usdValue || 0), 0);
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
