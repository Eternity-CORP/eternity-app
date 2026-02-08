/**
 * Network Service
 * Handles multi-network balance fetching across all supported EVM networks.
 *
 * Pure business logic (types, aggregation, price fetching) is delegated to @e-y/shared.
 * This file keeps only ethers provider management, native balance fetching,
 * and the orchestrator that combines everything.
 */

import { JsonRpcProvider, formatEther } from 'ethers';
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
  TESTNET_NETWORK_IDS,
  getTestnetAlchemyUrl,
  getTestnetRpcUrl,
  getTestnetConfig,
} from '@/src/constants/networks-testnet';
import type { AccountType } from '@/src/store/slices/wallet-slice';

// Shared imports — types, aggregation, prices, Alchemy helpers
import {
  type NetworkTokenBalance as SharedNetworkTokenBalance,
  type AggregatedTokenBalance as SharedAggregatedTokenBalance,
  type MultiNetworkBalanceResult as SharedMultiNetworkBalanceResult,
  aggregateBalances,
  getBestNetworkForToken,
  findNetworksWithSufficientBalance,
  fetchAlchemyTokenBalances,
  fetchAlchemyTokenMetadata,
  formatRawTokenBalance,
  fetchTokenPricesBySymbol,
  applyPricesToBalances,
} from '@e-y/shared';

const log = createLogger('NetworkService');

const REQUEST_TIMEOUT = 15000;

// ============================================
// Types — re-export shared types with mobile extensions
// ============================================

/**
 * Combined network ID type for both mainnet and testnet
 */
export type AnyNetworkId = NetworkId | TestnetNetworkId;

/**
 * NetworkTokenBalance — shared type, re-exported for convenience.
 * The shared type uses `NetworkId | string` for networkId, which is compatible with AnyNetworkId.
 */
export type NetworkTokenBalance = SharedNetworkTokenBalance;

/**
 * AggregatedTokenBalance — shared type, re-exported.
 */
export type AggregatedTokenBalance = SharedAggregatedTokenBalance;

/**
 * Mobile-specific MultiNetworkBalanceResult — extends shared with `accountType`.
 */
export interface MultiNetworkBalanceResult extends SharedMultiNetworkBalanceResult {
  accountType: AccountType;
}

// Re-export shared helpers so existing imports keep working
export { aggregateBalances, getBestNetworkForToken, findNetworksWithSufficientBalance };

// ============================================
// Provider cache
// ============================================

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

// ============================================
// Price cache (mobile-specific, uses shared fetchTokenPricesBySymbol)
// ============================================

let priceCache: { prices: Record<string, number>; timestamp: number } | null = null;
const PRICE_CACHE_DURATION = 60 * 1000;

async function fetchTokenPrices(symbols: string[]): Promise<Record<string, number>> {
  if (priceCache && Date.now() - priceCache.timestamp < PRICE_CACHE_DURATION) {
    return priceCache.prices;
  }

  const prices = await fetchTokenPricesBySymbol(symbols);

  if (Object.keys(prices).length > 0) {
    priceCache = { prices, timestamp: Date.now() };
  }

  return prices;
}

// ============================================
// Native balance (ethers-specific, stays in mobile)
// ============================================

async function fetchNativeBalance(
  address: string,
  networkId: AnyNetworkId,
  accountType: AccountType,
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
        setTimeout(() => reject(new Error('RPC timeout')), REQUEST_TIMEOUT),
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
      usdValue: 0,
      iconUrl: network.iconUrl,
    };
  } catch (error) {
    log.warn(`Failed to fetch native balance on ${networkId}`, error);
    return null;
  }
}

// ============================================
// Per-network balance orchestrator
// ============================================

async function fetchNetworkBalances(
  address: string,
  networkId: AnyNetworkId,
  accountType: AccountType,
): Promise<NetworkTokenBalance[]> {
  const balances: NetworkTokenBalance[] = [];

  const alchemyUrl =
    accountType === 'test'
      ? getTestnetAlchemyUrl(networkId as TestnetNetworkId)
      : getAlchemyUrl(networkId as NetworkId);

  const [nativeBalance, tokenBalances] = await Promise.all([
    fetchNativeBalance(address, networkId, accountType),
    fetchAlchemyTokenBalances(alchemyUrl, address),
  ]);

  if (nativeBalance && parseFloat(nativeBalance.balance) > 0) {
    balances.push(nativeBalance);
  }

  // Fetch metadata for each token via shared helper
  const metadataPromises = tokenBalances.map((t) =>
    fetchAlchemyTokenMetadata(alchemyUrl, t.contractAddress),
  );
  const metadataResults = await Promise.all(metadataPromises);

  for (let i = 0; i < tokenBalances.length; i++) {
    const tokenData = tokenBalances[i];
    const metadata = metadataResults[i];
    if (!metadata) continue;

    const balance = formatRawTokenBalance(tokenData.tokenBalance, metadata.decimals);
    if (parseFloat(balance) === 0) continue;

    balances.push({
      networkId,
      contractAddress: tokenData.contractAddress,
      symbol: metadata.symbol,
      name: metadata.name,
      balance,
      balanceRaw: tokenData.tokenBalance,
      decimals: metadata.decimals,
      usdValue: 0,
      iconUrl: undefined,
    });
  }

  return balances;
}

// ============================================
// Public API
// ============================================

/**
 * Fetch balances from all supported networks based on account type
 */
export async function fetchAllNetworkBalances(
  address: string,
  accountType: AccountType,
  networks?: AnyNetworkId[],
): Promise<MultiNetworkBalanceResult> {
  const networksToFetch: AnyNetworkId[] =
    networks || (accountType === 'test' ? TESTNET_NETWORK_IDS : TIER1_NETWORK_IDS);

  const networkBalances: Record<string, NetworkTokenBalance[]> = {};
  const failedNetworks: string[] = [];

  log.info(`Fetching balances for ${accountType} account from ${networksToFetch.length} networks`);

  const results = await Promise.allSettled(
    networksToFetch.map(async (networkId) => {
      const balances = await fetchNetworkBalances(address, networkId, accountType);
      return { networkId, balances };
    }),
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const networkId = networksToFetch[i];
    if (result.status === 'fulfilled') {
      networkBalances[result.value.networkId] = result.value.balances;
    } else {
      failedNetworks.push(networkId);
      networkBalances[networkId] = [];
      log.warn(`Failed to fetch balances for ${networkId}`, result.reason);
    }
  }

  // Collect all symbols for price fetching
  const allSymbols = new Set<string>();
  for (const balances of Object.values(networkBalances)) {
    for (const balance of balances) {
      allSymbols.add(balance.symbol.toUpperCase());
    }
  }

  // Fetch prices via shared helper (with local cache)
  const prices = await fetchTokenPrices(Array.from(allSymbols));

  // Apply prices via shared helper
  for (const networkId of Object.keys(networkBalances)) {
    networkBalances[networkId] = applyPricesToBalances(networkBalances[networkId], prices);
  }

  // Aggregate via shared helper
  const aggregatedBalances = aggregateBalances(networkBalances);

  const totalUsdValue = aggregatedBalances.reduce(
    (sum, balance) => sum + balance.totalUsdValue,
    0,
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
  accountType: AccountType,
): Promise<NetworkTokenBalance[]> {
  return fetchNetworkBalances(address, networkId, accountType);
}

/**
 * Get balance for a specific token on a specific network
 */
export { getTokenBalanceOnNetwork } from '@e-y/shared';

/**
 * Check if user has sufficient balance on a specific network
 */
export { hasSufficientBalance } from '@e-y/shared';
