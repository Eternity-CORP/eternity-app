/**
 * Network Service
 * Handles multi-network balance fetching across all supported EVM networks
 */

import { JsonRpcProvider, formatEther, formatUnits } from 'ethers';
import { createLogger } from '@/src/utils/logger';
import {
  NetworkId,
  SUPPORTED_NETWORKS,
  TIER1_NETWORK_IDS,
  getAlchemyUrl,
  getRpcUrl,
  getNetworkConfig,
  NetworkConfig,
} from '@/src/constants/networks';
import {
  TestnetNetworkId,
  TESTNET_NETWORKS,
  TESTNET_NETWORK_IDS,
  getTestnetAlchemyUrl,
  getTestnetRpcUrl,
  getTestnetConfig,
} from '@/src/constants/networks-testnet';
import type { AccountType } from '@/src/store/slices/wallet-slice';

const log = createLogger('NetworkService');

// Request timeout
const REQUEST_TIMEOUT = 15000;

// CoinGecko IDs for native tokens (used for testnet price estimation)
const COINGECKO_IDS: Record<string, string> = {
  ETH: 'ethereum',
  MATIC: 'matic-network',
  POL: 'matic-network', // Polygon renamed to POL
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
  WETH: 'weth',
  WBTC: 'wrapped-bitcoin',
  LINK: 'chainlink',
  UNI: 'uniswap',
  AAVE: 'aave',
};

// Cache for token prices
let priceCache: { prices: Record<string, number>; timestamp: number } | null = null;
const PRICE_CACHE_DURATION = 60 * 1000; // 1 minute

// Provider cache per network (mainnet and testnet)
const mainnetProviders: Partial<Record<NetworkId, JsonRpcProvider>> = {};
const testnetProviders: Partial<Record<TestnetNetworkId, JsonRpcProvider>> = {};

/**
 * Get or create provider for a mainnet network
 */
export function getProvider(networkId: NetworkId): JsonRpcProvider {
  if (!mainnetProviders[networkId]) {
    mainnetProviders[networkId] = new JsonRpcProvider(getRpcUrl(networkId));
  }
  return mainnetProviders[networkId]!;
}

/**
 * Get or create provider for a testnet network
 */
export function getTestnetProvider(networkId: TestnetNetworkId): JsonRpcProvider {
  if (!testnetProviders[networkId]) {
    testnetProviders[networkId] = new JsonRpcProvider(getTestnetRpcUrl(networkId));
  }
  return testnetProviders[networkId]!;
}

/**
 * Combined network ID type for both mainnet and testnet
 */
export type AnyNetworkId = NetworkId | TestnetNetworkId;

/**
 * Balance for a single token on a single network
 */
export interface NetworkTokenBalance {
  networkId: AnyNetworkId;
  contractAddress: string; // 'native' for native currency
  symbol: string;
  name: string;
  balance: string;
  balanceRaw: string;
  decimals: number;
  usdValue: number;
  iconUrl?: string;
}

/**
 * Aggregated balance for a token across all networks
 */
export interface AggregatedTokenBalance {
  symbol: string;
  name: string;
  totalBalance: string;
  totalUsdValue: number;
  decimals: number;
  iconUrl?: string;
  // Breakdown by network
  networks: {
    networkId: AnyNetworkId;
    balance: string;
    balanceRaw: string;
    usdValue: number;
    contractAddress: string;
  }[];
}

/**
 * Result of multi-network balance fetch
 */
export interface MultiNetworkBalanceResult {
  // Aggregated balances (what user sees by default)
  aggregatedBalances: AggregatedTokenBalance[];
  // Total USD value across all networks
  totalUsdValue: number;
  // Raw balances per network (for detailed view)
  networkBalances: Record<AnyNetworkId, NetworkTokenBalance[]>;
  // Networks that failed to fetch
  failedNetworks: AnyNetworkId[];
  // Timestamp
  lastUpdated: number;
  // Account type used for this fetch
  accountType: AccountType;
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

/**
 * Fetch token prices from CoinGecko (for test token estimation)
 */
async function fetchTokenPrices(symbols: string[]): Promise<Record<string, number>> {
  // Check cache
  if (priceCache && Date.now() - priceCache.timestamp < PRICE_CACHE_DURATION) {
    return priceCache.prices;
  }

  // Get unique CoinGecko IDs for the symbols
  const uniqueIds = new Set<string>();
  for (const symbol of symbols) {
    const upperSymbol = symbol.toUpperCase();
    if (COINGECKO_IDS[upperSymbol]) {
      uniqueIds.add(COINGECKO_IDS[upperSymbol]);
    }
  }

  if (uniqueIds.size === 0) {
    return {};
  }

  try {
    const idsParam = Array.from(uniqueIds).join(',');
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }
    );

    if (!response.ok) {
      log.warn('CoinGecko API error', { status: response.status });
      return priceCache?.prices || {};
    }

    const data = await response.json();

    // Build symbol -> price mapping
    const prices: Record<string, number> = {};
    for (const [symbol, coingeckoId] of Object.entries(COINGECKO_IDS)) {
      if (data[coingeckoId]?.usd) {
        prices[symbol] = data[coingeckoId].usd;
      }
    }

    // Update cache
    priceCache = { prices, timestamp: Date.now() };
    return prices;
  } catch (error) {
    log.warn('Failed to fetch token prices', error);
    return priceCache?.prices || {};
  }
}

/**
 * Apply mainnet prices to test token balances
 */
function applyPricesToBalances(
  balances: NetworkTokenBalance[],
  prices: Record<string, number>
): NetworkTokenBalance[] {
  return balances.map((balance) => {
    const upperSymbol = balance.symbol.toUpperCase();
    const price = prices[upperSymbol] || 0;
    const balanceNum = parseFloat(balance.balance);
    return {
      ...balance,
      usdValue: balanceNum * price,
    };
  });
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Fetch native token balance for a network (mainnet or testnet)
 */
async function fetchNativeBalance(
  address: string,
  networkId: AnyNetworkId,
  accountType: AccountType
): Promise<NetworkTokenBalance | null> {
  try {
    let provider: JsonRpcProvider;
    let network: NetworkConfig;

    if (accountType === 'test') {
      provider = getTestnetProvider(networkId as TestnetNetworkId);
      network = getTestnetConfig(networkId as TestnetNetworkId);
    } else {
      provider = getProvider(networkId as NetworkId);
      network = getNetworkConfig(networkId as NetworkId);
    }

    const balanceWei = await Promise.race([
      provider.getBalance(address),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('RPC timeout')), REQUEST_TIMEOUT)
      ),
    ]);

    const balance = formatEther(balanceWei);

    return {
      networkId,
      contractAddress: 'native',
      symbol: network.nativeCurrency.symbol,
      name: network.nativeCurrency.name,
      balance: parseFloat(balance).toFixed(6),
      balanceRaw: balanceWei.toString(),
      decimals: network.nativeCurrency.decimals,
      usdValue: 0, // Will be calculated later
      iconUrl: network.iconUrl,
    };
  } catch (error) {
    log.warn(`Failed to fetch native balance on ${networkId}`, error);
    return null;
  }
}

/**
 * Fetch ERC-20 token balances for a network using Alchemy (mainnet or testnet)
 */
async function fetchTokenBalances(
  address: string,
  networkId: AnyNetworkId,
  accountType: AccountType
): Promise<AlchemyTokenBalance[]> {
  try {
    const alchemyUrl = accountType === 'test'
      ? getTestnetAlchemyUrl(networkId as TestnetNetworkId)
      : getAlchemyUrl(networkId as NetworkId);

    const response = await fetchWithTimeout(alchemyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getTokenBalances',
        params: [address, 'erc20'],
      }),
    });

    if (!response.ok) {
      log.warn(`Alchemy API error on ${networkId}`, { status: response.status });
      return [];
    }

    const data: AlchemyTokenBalancesResponse = await response.json();
    return data.result.tokenBalances.filter(
      (token) => token.tokenBalance !== '0x0' && token.tokenBalance !== '0x'
    );
  } catch (error) {
    log.warn(`Failed to fetch token balances on ${networkId}`, error);
    return [];
  }
}

/**
 * Fetch token metadata from Alchemy (mainnet or testnet)
 */
async function fetchTokenMetadata(
  contractAddress: string,
  networkId: AnyNetworkId,
  accountType: AccountType
): Promise<AlchemyTokenMetadata | null> {
  try {
    const alchemyUrl = accountType === 'test'
      ? getTestnetAlchemyUrl(networkId as TestnetNetworkId)
      : getAlchemyUrl(networkId as NetworkId);

    const response = await fetchWithTimeout(alchemyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getTokenMetadata',
        params: [contractAddress],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    log.warn(`Failed to fetch token metadata for ${contractAddress} on ${networkId}`, error);
    return null;
  }
}

/**
 * Format raw token balance to human-readable string
 */
function formatTokenBalance(rawBalance: string, decimals: number): string {
  if (!rawBalance || rawBalance === '0x0' || rawBalance === '0x') {
    return '0';
  }

  try {
    const balance = BigInt(rawBalance);
    const divisor = BigInt(10 ** decimals);
    const wholePart = balance / divisor;
    const fractionalPart = balance % divisor;

    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');

    if (wholePart === BigInt(0) && balance > BigInt(0)) {
      return `0.${fractionalStr.slice(0, 6)}`;
    }

    const trimmedFractional = fractionalStr.slice(0, 6).replace(/0+$/, '') || '0';
    return `${wholePart}.${trimmedFractional}`;
  } catch {
    return '0';
  }
}

/**
 * Fetch all balances for a single network (mainnet or testnet)
 */
async function fetchNetworkBalances(
  address: string,
  networkId: AnyNetworkId,
  accountType: AccountType
): Promise<NetworkTokenBalance[]> {
  const balances: NetworkTokenBalance[] = [];

  // Fetch native and token balances in parallel
  const [nativeBalance, tokenBalances] = await Promise.all([
    fetchNativeBalance(address, networkId, accountType),
    fetchTokenBalances(address, networkId, accountType),
  ]);

  // Add native balance
  if (nativeBalance && parseFloat(nativeBalance.balance) > 0) {
    balances.push(nativeBalance);
  }

  // Fetch metadata for each token
  const metadataPromises = tokenBalances.map((t) =>
    fetchTokenMetadata(t.contractAddress, networkId, accountType)
  );
  const metadataResults = await Promise.all(metadataPromises);

  // Process token balances
  for (let i = 0; i < tokenBalances.length; i++) {
    const tokenData = tokenBalances[i];
    const metadata = metadataResults[i];

    if (!metadata) continue;

    const balance = formatTokenBalance(tokenData.tokenBalance, metadata.decimals);
    const balanceNum = parseFloat(balance);

    if (balanceNum === 0) continue;

    balances.push({
      networkId,
      contractAddress: tokenData.contractAddress,
      symbol: metadata.symbol,
      name: metadata.name,
      balance,
      balanceRaw: tokenData.tokenBalance,
      decimals: metadata.decimals,
      usdValue: 0, // Will be calculated later
      iconUrl: metadata.logo || undefined,
    });
  }

  return balances;
}

/**
 * Aggregate balances by token symbol across networks
 */
function aggregateBalances(
  networkBalances: Record<AnyNetworkId, NetworkTokenBalance[]>
): AggregatedTokenBalance[] {
  const aggregated: Record<string, AggregatedTokenBalance> = {};

  for (const [networkId, balances] of Object.entries(networkBalances)) {
    for (const balance of balances) {
      const key = balance.symbol.toUpperCase();

      if (!aggregated[key]) {
        aggregated[key] = {
          symbol: balance.symbol,
          name: balance.name,
          totalBalance: '0',
          totalUsdValue: 0,
          decimals: balance.decimals,
          iconUrl: balance.iconUrl,
          networks: [],
        };
      }

      // Add network breakdown
      aggregated[key].networks.push({
        networkId: networkId as AnyNetworkId,
        balance: balance.balance,
        balanceRaw: balance.balanceRaw,
        usdValue: balance.usdValue,
        contractAddress: balance.contractAddress,
      });

      // Update totals
      const currentTotal = parseFloat(aggregated[key].totalBalance);
      const additional = parseFloat(balance.balance);
      aggregated[key].totalBalance = (currentTotal + additional).toFixed(6);
      aggregated[key].totalUsdValue += balance.usdValue;

      // Use icon from first network that has one
      if (!aggregated[key].iconUrl && balance.iconUrl) {
        aggregated[key].iconUrl = balance.iconUrl;
      }
    }
  }

  // Sort by USD value descending
  return Object.values(aggregated).sort((a, b) => b.totalUsdValue - a.totalUsdValue);
}

/**
 * Fetch balances from all supported networks based on account type
 * - TEST accounts: fetch from testnet networks (Sepolia, Amoy, etc.)
 * - REAL accounts: fetch from mainnet networks (Ethereum, Polygon, etc.)
 */
export async function fetchAllNetworkBalances(
  address: string,
  accountType: AccountType,
  networks?: AnyNetworkId[]
): Promise<MultiNetworkBalanceResult> {
  // Determine which networks to fetch based on account type
  const networksToFetch: AnyNetworkId[] = networks || (
    accountType === 'test' ? TESTNET_NETWORK_IDS : TIER1_NETWORK_IDS
  );

  const networkBalances: Record<AnyNetworkId, NetworkTokenBalance[]> = {} as Record<
    AnyNetworkId,
    NetworkTokenBalance[]
  >;
  const failedNetworks: AnyNetworkId[] = [];

  log.info(`Fetching balances for ${accountType} account from ${networksToFetch.length} networks`);

  // Fetch from all networks in parallel
  const results = await Promise.allSettled(
    networksToFetch.map(async (networkId) => {
      const balances = await fetchNetworkBalances(address, networkId, accountType);
      return { networkId, balances };
    })
  );

  // Process results
  for (const result of results) {
    if (result.status === 'fulfilled') {
      networkBalances[result.value.networkId] = result.value.balances;
    } else {
      // Extract network ID from the error context
      const index = results.indexOf(result);
      const networkId = networksToFetch[index];
      failedNetworks.push(networkId);
      networkBalances[networkId] = [];
      log.warn(`Failed to fetch balances for ${networkId}`, result.reason);
    }
  }

  // Fetch mainnet prices and apply them to token balances (for both test and real accounts)
  // This gives us USD values for common tokens like ETH, MATIC, USDC, etc.
  const allSymbols = new Set<string>();
  for (const balances of Object.values(networkBalances)) {
    for (const balance of balances) {
      allSymbols.add(balance.symbol.toUpperCase());
    }
  }

  // Fetch prices from CoinGecko
  const prices = await fetchTokenPrices(Array.from(allSymbols));

  // Apply prices to all network balances
  for (const networkId of Object.keys(networkBalances) as AnyNetworkId[]) {
    networkBalances[networkId] = applyPricesToBalances(
      networkBalances[networkId],
      prices
    );
  }

  // Aggregate balances
  const aggregatedBalances = aggregateBalances(networkBalances);

  // Calculate total USD value
  const totalUsdValue = aggregatedBalances.reduce(
    (sum, balance) => sum + balance.totalUsdValue,
    0
  );

  return {
    aggregatedBalances,
    totalUsdValue,
    networkBalances,
    failedNetworks,
    lastUpdated: Date.now(),
    accountType,
  };
}

/**
 * Fetch balances for a specific network only
 */
export async function fetchSingleNetworkBalances(
  address: string,
  networkId: AnyNetworkId,
  accountType: AccountType
): Promise<NetworkTokenBalance[]> {
  return fetchNetworkBalances(address, networkId, accountType);
}

/**
 * Get balance for a specific token on a specific network
 */
export function getTokenBalanceOnNetwork(
  aggregatedBalances: AggregatedTokenBalance[],
  symbol: string,
  networkId: AnyNetworkId
): { balance: string; usdValue: number } | null {
  const token = aggregatedBalances.find(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase()
  );
  if (!token) return null;

  const networkBalance = token.networks.find((n) => n.networkId === networkId);
  if (!networkBalance) return null;

  return {
    balance: networkBalance.balance,
    usdValue: networkBalance.usdValue,
  };
}

/**
 * Find the network with the highest balance for a token
 */
export function getBestNetworkForToken(
  aggregatedBalances: AggregatedTokenBalance[],
  symbol: string
): { networkId: AnyNetworkId; balance: string } | null {
  const token = aggregatedBalances.find(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase()
  );
  if (!token || token.networks.length === 0) return null;

  const best = token.networks.reduce((prev, current) =>
    parseFloat(current.balance) > parseFloat(prev.balance) ? current : prev
  );

  return {
    networkId: best.networkId,
    balance: best.balance,
  };
}

/**
 * Check if user has sufficient balance on a specific network
 */
export function hasSufficientBalance(
  aggregatedBalances: AggregatedTokenBalance[],
  symbol: string,
  amount: string,
  networkId: AnyNetworkId
): boolean {
  const balance = getTokenBalanceOnNetwork(aggregatedBalances, symbol, networkId);
  if (!balance) return false;

  return parseFloat(balance.balance) >= parseFloat(amount);
}

/**
 * Find networks that can fulfill an amount requirement
 */
export function findNetworksWithSufficientBalance(
  aggregatedBalances: AggregatedTokenBalance[],
  symbol: string,
  amount: string
): AnyNetworkId[] {
  const token = aggregatedBalances.find(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase()
  );
  if (!token) return [];

  const requiredAmount = parseFloat(amount);
  return token.networks
    .filter((n) => parseFloat(n.balance) >= requiredAmount)
    .map((n) => n.networkId);
}
