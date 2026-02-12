/**
 * Routing Helpers
 * Pure functions for multi-network transfer routing.
 * Zero ethers / platform dependencies — uses only shared config and types.
 */

import type { NetworkId } from '../config/multi-network';
import {
  NETWORK_GAS_RANKING,
  SUPPORTED_NETWORKS,
  COMMON_TOKENS,
} from '../config/multi-network';
import { NATIVE_TOKEN_ADDRESS } from '../constants/swap';
import type { AggregatedTokenBalance } from '../types/network-balance';

// ============================================
// Network helpers
// ============================================

/**
 * Get the cheapest network from a list (based on gas ranking).
 */
export function getCheapestNetwork(networks: string[]): string | null {
  if (networks.length === 0) return null;

  return networks.reduce((cheapest, current) => {
    const cheapestRank = NETWORK_GAS_RANKING[cheapest as NetworkId] ?? 99;
    const currentRank = NETWORK_GAS_RANKING[current as NetworkId] ?? 99;
    return currentRank < cheapestRank ? current : cheapest;
  });
}

/**
 * Find networks that have any positive balance of a token.
 */
export function findNetworksWithBalance(
  aggregatedBalances: AggregatedTokenBalance[],
  symbol: string,
): { networkId: string; balance: string }[] {
  const token = aggregatedBalances.find(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase(),
  );
  if (!token) return [];

  return token.networks
    .filter((n) => parseFloat(n.balance) > 0)
    .map((n) => ({ networkId: n.networkId, balance: n.balance }));
}

// ============================================
// Balance helpers
// ============================================

/**
 * Get total balance of a token across all networks.
 */
export function getTotalBalance(
  aggregatedBalances: AggregatedTokenBalance[],
  symbol: string,
): string {
  const token = aggregatedBalances.find(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase(),
  );
  return token?.totalBalance ?? '0';
}

/**
 * Calculate USD value for a given token amount using aggregated price data.
 */
export function calculateUsdValue(
  aggregatedBalances: AggregatedTokenBalance[],
  symbol: string,
  amount: number,
): number {
  const token = aggregatedBalances.find(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase(),
  );
  if (!token || parseFloat(token.totalBalance) === 0) return 0;

  const usdPerToken = token.totalUsdValue / parseFloat(token.totalBalance);
  return amount * usdPerToken;
}

/**
 * Get token decimals from aggregated balances.
 */
export function getTokenDecimals(
  aggregatedBalances: AggregatedTokenBalance[],
  symbol: string,
): number {
  const token = aggregatedBalances.find(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase(),
  );
  return token?.decimals ?? 18;
}

/**
 * Get balance for a specific token on a specific network.
 */
export function getTokenBalanceOnNetwork(
  aggregatedBalances: AggregatedTokenBalance[],
  symbol: string,
  networkId: string,
): { balance: string; usdValue: number } | null {
  const token = aggregatedBalances.find(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase(),
  );
  if (!token) return null;

  const networkBalance = token.networks.find((n) => n.networkId === networkId);
  if (!networkBalance) return null;

  return { balance: networkBalance.balance, usdValue: networkBalance.usdValue };
}

/**
 * Check if user has sufficient balance on a specific network.
 */
export function hasSufficientBalance(
  aggregatedBalances: AggregatedTokenBalance[],
  symbol: string,
  amount: string,
  networkId: string,
): boolean {
  const balance = getTokenBalanceOnNetwork(aggregatedBalances, symbol, networkId);
  if (!balance) return false;
  return parseFloat(balance.balance) >= parseFloat(amount);
}

// ============================================
// Token address helpers
// ============================================

/**
 * Get the contract address for a token on a network.
 * Returns NATIVE_TOKEN_ADDRESS for native currency symbols.
 */
export function getTokenAddressForNetwork(
  symbol: string,
  networkId: string,
): string {
  const upperSymbol = symbol.toUpperCase();
  const network = SUPPORTED_NETWORKS[networkId as NetworkId];

  if (
    upperSymbol === 'ETH' ||
    upperSymbol === 'MATIC' ||
    (network && upperSymbol === network.nativeCurrency.symbol.toUpperCase())
  ) {
    return NATIVE_TOKEN_ADDRESS;
  }

  return COMMON_TOKENS[upperSymbol]?.[networkId as NetworkId] ?? upperSymbol;
}

// ============================================
// Route description helpers
// ============================================

interface RouteLike {
  type: string;
  fromNetwork: string;
  toNetwork: string;
  token?: string;
  bridgeQuote?: { totalFeeUsd: number; estimatedTime: number } | null;
  sources?: { network: string; amount: string; bridgeQuote?: { totalFeeUsd: number; estimatedTime: number } | null }[];
}

/**
 * Get estimated total bridge fees for a route (in USD).
 */
export function getRouteTotalFees(route: RouteLike): number {
  if (route.type === 'direct') return 0;

  if (route.type === 'bridge' && route.bridgeQuote) {
    return route.bridgeQuote.totalFeeUsd;
  }

  if (route.type === 'consolidation' && route.sources) {
    return route.sources.reduce(
      (total, source) => total + (source.bridgeQuote?.totalFeeUsd ?? 0),
      0,
    );
  }

  return 0;
}

/**
 * Get estimated time for a route (in seconds).
 */
export function getRouteEstimatedTime(route: RouteLike): number {
  if (route.type === 'direct') {
    const blockTimes: Record<string, number> = {
      ethereum: 15,
      polygon: 2,
      arbitrum: 1,
      optimism: 2,
      base: 2,
    };
    return blockTimes[route.fromNetwork] ?? 15;
  }

  if (route.type === 'bridge' && route.bridgeQuote) {
    return route.bridgeQuote.estimatedTime;
  }

  if (route.type === 'consolidation' && route.sources) {
    return route.sources.reduce(
      (max, source) => Math.max(max, source.bridgeQuote?.estimatedTime ?? 0),
      0,
    );
  }

  return 0;
}

/**
 * Format a route into a human-readable description.
 */
export function formatRouteDescription(route: RouteLike): string {
  const fromName = SUPPORTED_NETWORKS[route.fromNetwork as NetworkId]?.name || route.fromNetwork;
  const toName = SUPPORTED_NETWORKS[route.toNetwork as NetworkId]?.name || route.toNetwork;

  switch (route.type) {
    case 'direct':
      return `Send directly on ${fromName}`;

    case 'bridge':
      return `Bridge from ${fromName} to ${toName}`;

    case 'consolidation':
      if (route.sources && route.sources.length > 1) {
        const sourceNames = route.sources
          .map((s) => SUPPORTED_NETWORKS[s.network as NetworkId]?.shortName || s.network)
          .join(', ');
        return `Consolidate from ${sourceNames} to ${toName}`;
      }
      return `Consolidate to ${toName}`;

    default:
      return 'Transfer';
  }
}

/**
 * Check if a route requires user confirmation (bridge or consolidation).
 */
export function routeRequiresConfirmation(route: RouteLike): boolean {
  return route.type === 'bridge' || route.type === 'consolidation';
}
