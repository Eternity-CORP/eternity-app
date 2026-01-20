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
} from '@/src/constants/networks';

const log = createLogger('NetworkService');

// Request timeout
const REQUEST_TIMEOUT = 15000;

// Provider cache per network
const providers: Partial<Record<NetworkId, JsonRpcProvider>> = {};

/**
 * Get or create provider for a network
 */
export function getProvider(networkId: NetworkId): JsonRpcProvider {
  if (!providers[networkId]) {
    providers[networkId] = new JsonRpcProvider(getRpcUrl(networkId));
  }
  return providers[networkId]!;
}

/**
 * Balance for a single token on a single network
 */
export interface NetworkTokenBalance {
  networkId: NetworkId;
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
    networkId: NetworkId;
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
  networkBalances: Record<NetworkId, NetworkTokenBalance[]>;
  // Networks that failed to fetch
  failedNetworks: NetworkId[];
  // Timestamp
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
 * Fetch native token balance for a network
 */
async function fetchNativeBalance(
  address: string,
  networkId: NetworkId
): Promise<NetworkTokenBalance | null> {
  try {
    const provider = getProvider(networkId);
    const network = getNetworkConfig(networkId);

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
 * Fetch ERC-20 token balances for a network using Alchemy
 */
async function fetchTokenBalances(
  address: string,
  networkId: NetworkId
): Promise<AlchemyTokenBalance[]> {
  try {
    const alchemyUrl = getAlchemyUrl(networkId);

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
 * Fetch token metadata from Alchemy
 */
async function fetchTokenMetadata(
  contractAddress: string,
  networkId: NetworkId
): Promise<AlchemyTokenMetadata | null> {
  try {
    const alchemyUrl = getAlchemyUrl(networkId);

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
 * Fetch all balances for a single network
 */
async function fetchNetworkBalances(
  address: string,
  networkId: NetworkId
): Promise<NetworkTokenBalance[]> {
  const balances: NetworkTokenBalance[] = [];

  // Fetch native and token balances in parallel
  const [nativeBalance, tokenBalances] = await Promise.all([
    fetchNativeBalance(address, networkId),
    fetchTokenBalances(address, networkId),
  ]);

  // Add native balance
  if (nativeBalance && parseFloat(nativeBalance.balance) > 0) {
    balances.push(nativeBalance);
  }

  // Fetch metadata for each token
  const metadataPromises = tokenBalances.map((t) =>
    fetchTokenMetadata(t.contractAddress, networkId)
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
  networkBalances: Record<NetworkId, NetworkTokenBalance[]>
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
        networkId: networkId as NetworkId,
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
 * Fetch balances from all supported networks
 */
export async function fetchAllNetworkBalances(
  address: string,
  networks: NetworkId[] = TIER1_NETWORK_IDS
): Promise<MultiNetworkBalanceResult> {
  const networkBalances: Record<NetworkId, NetworkTokenBalance[]> = {} as Record<
    NetworkId,
    NetworkTokenBalance[]
  >;
  const failedNetworks: NetworkId[] = [];

  // Fetch from all networks in parallel
  const results = await Promise.allSettled(
    networks.map(async (networkId) => {
      const balances = await fetchNetworkBalances(address, networkId);
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
      const networkId = networks[index];
      failedNetworks.push(networkId);
      networkBalances[networkId] = [];
      log.warn(`Failed to fetch balances for ${networkId}`, result.reason);
    }
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
  };
}

/**
 * Fetch balances for a specific network only
 */
export async function fetchSingleNetworkBalances(
  address: string,
  networkId: NetworkId
): Promise<NetworkTokenBalance[]> {
  return fetchNetworkBalances(address, networkId);
}

/**
 * Get balance for a specific token on a specific network
 */
export function getTokenBalanceOnNetwork(
  aggregatedBalances: AggregatedTokenBalance[],
  symbol: string,
  networkId: NetworkId
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
): { networkId: NetworkId; balance: string } | null {
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
  networkId: NetworkId
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
): NetworkId[] {
  const token = aggregatedBalances.find(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase()
  );
  if (!token) return [];

  const requiredAmount = parseFloat(amount);
  return token.networks
    .filter((n) => parseFloat(n.balance) >= requiredAmount)
    .map((n) => n.networkId);
}
