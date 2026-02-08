/**
 * Routing Service
 * Determines optimal transfer path based on user balances and recipient preferences
 */

import { NATIVE_TOKEN_ADDRESS } from '@e-y/shared';
import { NetworkId, SUPPORTED_NETWORKS, getTokenAddress } from '@/src/constants/networks';
import { createLogger } from '@/src/utils/logger';
import {
  AggregatedTokenBalance,
  findNetworksWithSufficientBalance,
  getTokenBalanceOnNetwork,
  hasSufficientBalance,
} from './network-service';
import {
  getBridgeQuote,
  checkBridgeCostLevel,
  BridgeQuote,
  BridgeCostLevel,
} from './bridge-service';
import { parseUnits } from 'ethers';

const logger = createLogger('RoutingService');

// Network gas cost ranking (lower is cheaper)
// Based on typical L2 vs L1 gas costs
const NETWORK_GAS_RANKING: Record<NetworkId, number> = {
  base: 1, // Cheapest
  arbitrum: 2,
  optimism: 3,
  polygon: 4,
  ethereum: 5, // Most expensive
};

/**
 * Transfer route types
 */
export interface TransferRoute {
  type: 'direct' | 'bridge' | 'consolidation';
  fromNetwork: NetworkId;
  toNetwork: NetworkId;
  amount: string;
  token: string;
  // For bridge transfers
  bridgeQuote?: BridgeQuote;
  bridgeCostLevel?: BridgeCostLevel;
  // For consolidation (multiple source networks)
  sources?: {
    network: NetworkId;
    amount: string;
    bridgeQuote?: BridgeQuote;
  }[];
  // Alternative route (e.g., send without bridging)
  alternative?: {
    description: string;
    network: NetworkId;
  };
}

/**
 * Result of route calculation
 */
export interface RoutingResult {
  canSend: boolean;
  route?: TransferRoute;
  error?: string;
  // UI hints
  showBridgeCost: boolean;
  showConsolidationOption: boolean;
  showAlternative: boolean;
}

/**
 * Get the cheapest network from a list of networks
 */
function getCheapestNetwork(networks: NetworkId[]): NetworkId | null {
  if (networks.length === 0) return null;

  return networks.reduce((cheapest, current) => {
    const cheapestRank = NETWORK_GAS_RANKING[cheapest] ?? 99;
    const currentRank = NETWORK_GAS_RANKING[current] ?? 99;
    return currentRank < cheapestRank ? current : cheapest;
  });
}

/**
 * Find networks that have any balance of the token (not necessarily enough)
 */
function findNetworksWithBalance(
  aggregatedBalances: AggregatedTokenBalance[],
  symbol: string
): { networkId: NetworkId; balance: string }[] {
  const token = aggregatedBalances.find(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase()
  );
  if (!token) return [];

  return token.networks
    .filter((n) => parseFloat(n.balance) > 0)
    .map((n) => ({
      networkId: n.networkId as NetworkId,
      balance: n.balance,
    }));
}

/**
 * Get total balance of a token across all networks
 */
function getTotalBalance(
  aggregatedBalances: AggregatedTokenBalance[],
  symbol: string
): string {
  const token = aggregatedBalances.find(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase()
  );
  return token?.totalBalance ?? '0';
}

/**
 * Calculate USD value for a token amount
 */
function calculateUsdValue(
  aggregatedBalances: AggregatedTokenBalance[],
  symbol: string,
  amount: number
): number {
  const token = aggregatedBalances.find(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase()
  );
  if (!token || parseFloat(token.totalBalance) === 0) return 0;

  // Calculate USD per token based on total balance and total USD value
  const usdPerToken = token.totalUsdValue / parseFloat(token.totalBalance);
  return amount * usdPerToken;
}

/**
 * Get token decimals
 */
function getTokenDecimals(
  aggregatedBalances: AggregatedTokenBalance[],
  symbol: string
): number {
  const token = aggregatedBalances.find(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase()
  );
  return token?.decimals ?? 18;
}

/**
 * Convert amount to wei for bridge quote
 */
function toWei(amount: string, decimals: number): string {
  try {
    return parseUnits(amount, decimals).toString();
  } catch {
    return '0';
  }
}

/**
 * Get token address for a network, handling native tokens
 */
function getTokenAddressForNetwork(
  symbol: string,
  networkId: NetworkId
): string {
  const upperSymbol = symbol.toUpperCase();

  // Native tokens
  if (
    upperSymbol === 'ETH' ||
    upperSymbol === 'MATIC' ||
    upperSymbol === SUPPORTED_NETWORKS[networkId]?.nativeCurrency.symbol.toUpperCase()
  ) {
    return NATIVE_TOKEN_ADDRESS; // Native token address
  }

  // Look up token address
  return getTokenAddress(upperSymbol, networkId) ?? upperSymbol;
}

/**
 * Calculate optimal transfer route
 *
 * Logic:
 * 1. If recipient has NO preference:
 *    - Find network with sufficient balance (prefer cheaper gas)
 *    - If no single network has enough -> consolidation needed
 * 2. If recipient HAS preference:
 *    - If sender has enough on preferred network -> direct transfer
 *    - If sender has enough on OTHER network -> bridge needed, show cost
 *    - If need multiple networks -> consolidation + bridge
 * 3. Show alternative when bridge is expensive (>5% fee)
 */
export async function calculateTransferRoute(
  aggregatedBalances: AggregatedTokenBalance[],
  token: string,
  amount: string,
  recipientPreferredNetwork: NetworkId | null,
  fromAddress: string,
  toAddress: string
): Promise<RoutingResult> {
  logger.info('Calculating transfer route', {
    token,
    amount,
    recipientPreferredNetwork,
  });

  const requestedAmount = parseFloat(amount);
  if (isNaN(requestedAmount) || requestedAmount <= 0) {
    return {
      canSend: false,
      error: 'Invalid amount',
      showBridgeCost: false,
      showConsolidationOption: false,
      showAlternative: false,
    };
  }

  // Check total balance
  const totalBalance = parseFloat(getTotalBalance(aggregatedBalances, token));
  if (totalBalance < requestedAmount) {
    return {
      canSend: false,
      error: `Insufficient ${token} balance. You have ${totalBalance.toFixed(6)} ${token}`,
      showBridgeCost: false,
      showConsolidationOption: false,
      showAlternative: false,
    };
  }

  // Find networks with sufficient balance
  const sufficientNetworks = findNetworksWithSufficientBalance(
    aggregatedBalances,
    token,
    amount
  ) as NetworkId[];

  const decimals = getTokenDecimals(aggregatedBalances, token);
  const amountWei = toWei(amount, decimals);

  // CASE 1: No recipient preference
  if (!recipientPreferredNetwork) {
    // Find the cheapest network with sufficient balance
    if (sufficientNetworks.length > 0) {
      const bestNetwork = getCheapestNetwork(sufficientNetworks)!;

      logger.info('Direct transfer on cheapest network', { bestNetwork });

      return {
        canSend: true,
        route: {
          type: 'direct',
          fromNetwork: bestNetwork,
          toNetwork: bestNetwork,
          amount,
          token,
        },
        showBridgeCost: false,
        showConsolidationOption: sufficientNetworks.length > 1,
        showAlternative: false,
      };
    }

    // No single network has enough - need consolidation
    const networksWithBalance = findNetworksWithBalance(aggregatedBalances, token);
    if (networksWithBalance.length > 1) {
      // Choose the cheapest network as consolidation target
      const targetNetwork = getCheapestNetwork(
        networksWithBalance.map((n) => n.networkId)
      )!;

      const sources = networksWithBalance.map((n) => ({
        network: n.networkId,
        amount: n.balance,
      }));

      logger.info('Consolidation needed', { targetNetwork, sources });

      return {
        canSend: true,
        route: {
          type: 'consolidation',
          fromNetwork: sources[0].network, // Primary source
          toNetwork: targetNetwork,
          amount,
          token,
          sources,
        },
        showBridgeCost: true,
        showConsolidationOption: true,
        showAlternative: false,
      };
    }

    return {
      canSend: false,
      error: `Insufficient ${token} balance across all networks`,
      showBridgeCost: false,
      showConsolidationOption: false,
      showAlternative: false,
    };
  }

  // CASE 2: Recipient has a preferred network
  const preferredNetwork = recipientPreferredNetwork;

  // Check if sender has enough on the preferred network
  if (hasSufficientBalance(aggregatedBalances, token, amount, preferredNetwork)) {
    logger.info('Direct transfer to preferred network', { preferredNetwork });

    return {
      canSend: true,
      route: {
        type: 'direct',
        fromNetwork: preferredNetwork,
        toNetwork: preferredNetwork,
        amount,
        token,
      },
      showBridgeCost: false,
      showConsolidationOption: false,
      showAlternative: false,
    };
  }

  // Check if sender has enough on another network (need bridge)
  if (sufficientNetworks.length > 0) {
    // Pick the cheapest network to bridge from
    const sourceNetwork = getCheapestNetwork(sufficientNetworks)!;

    // Get bridge quote
    const tokenAddress = getTokenAddressForNetwork(token, sourceNetwork);
    const destTokenAddress = getTokenAddressForNetwork(token, preferredNetwork);

    const bridgeQuote = await getBridgeQuote(
      sourceNetwork,
      preferredNetwork,
      tokenAddress,
      destTokenAddress,
      amountWei,
      fromAddress,
      toAddress
    );

    // Calculate USD value for cost level check
    const amountUsd = calculateUsdValue(aggregatedBalances, token, requestedAmount);
    const bridgeCostLevel = bridgeQuote
      ? checkBridgeCostLevel(amountUsd, bridgeQuote.totalFeeUsd)
      : 'none';

    // Check if bridge is expensive - show alternative
    const showAlternative =
      bridgeCostLevel === 'expensive' || bridgeCostLevel === 'warning';

    const alternative = showAlternative
      ? {
          description: `Send on ${SUPPORTED_NETWORKS[sourceNetwork]?.name || sourceNetwork} instead (no bridge fee)`,
          network: sourceNetwork,
        }
      : undefined;

    logger.info('Bridge transfer needed', {
      sourceNetwork,
      preferredNetwork,
      bridgeCostLevel,
      showAlternative,
    });

    return {
      canSend: true,
      route: {
        type: 'bridge',
        fromNetwork: sourceNetwork,
        toNetwork: preferredNetwork,
        amount,
        token,
        bridgeQuote: bridgeQuote ?? undefined,
        bridgeCostLevel,
        alternative,
      },
      showBridgeCost: true,
      showConsolidationOption: false,
      showAlternative,
    };
  }

  // Need consolidation + possibly bridging
  const networksWithBalance = findNetworksWithBalance(aggregatedBalances, token);

  if (networksWithBalance.length > 1) {
    // Consolidate to the preferred network
    const sources: {
      network: NetworkId;
      amount: string;
      bridgeQuote?: BridgeQuote;
    }[] = [];

    // Get bridge quotes for each source
    for (const source of networksWithBalance) {
      if (source.networkId === preferredNetwork) {
        // No bridge needed for funds already on preferred network
        sources.push({
          network: source.networkId,
          amount: source.balance,
        });
      } else {
        // Need bridge quote
        const tokenAddress = getTokenAddressForNetwork(token, source.networkId);
        const destTokenAddress = getTokenAddressForNetwork(token, preferredNetwork);
        const sourceAmountWei = toWei(source.balance, decimals);

        const bridgeQuote = await getBridgeQuote(
          source.networkId,
          preferredNetwork,
          tokenAddress,
          destTokenAddress,
          sourceAmountWei,
          fromAddress,
          toAddress
        );

        sources.push({
          network: source.networkId,
          amount: source.balance,
          bridgeQuote: bridgeQuote ?? undefined,
        });
      }
    }

    logger.info('Consolidation + bridge needed', { preferredNetwork, sources });

    return {
      canSend: true,
      route: {
        type: 'consolidation',
        fromNetwork: sources[0].network,
        toNetwork: preferredNetwork,
        amount,
        token,
        sources,
      },
      showBridgeCost: true,
      showConsolidationOption: true,
      showAlternative: false,
    };
  }

  return {
    canSend: false,
    error: `Insufficient ${token} balance to send ${amount}`,
    showBridgeCost: false,
    showConsolidationOption: false,
    showAlternative: false,
  };
}

/**
 * Get estimated total fees for a route
 */
export function getRouteTotalFees(route: TransferRoute): number {
  if (route.type === 'direct') {
    return 0;
  }

  if (route.type === 'bridge' && route.bridgeQuote) {
    return route.bridgeQuote.totalFeeUsd;
  }

  if (route.type === 'consolidation' && route.sources) {
    return route.sources.reduce((total, source) => {
      return total + (source.bridgeQuote?.totalFeeUsd ?? 0);
    }, 0);
  }

  return 0;
}

/**
 * Get estimated time for a route (in seconds)
 */
export function getRouteEstimatedTime(route: TransferRoute): number {
  if (route.type === 'direct') {
    // Direct transfers are typically fast (block time)
    // Rough estimates by network
    const blockTimes: Record<NetworkId, number> = {
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
    // Max time across all bridge operations
    const maxBridgeTime = route.sources.reduce((max, source) => {
      const time = source.bridgeQuote?.estimatedTime ?? 0;
      return Math.max(max, time);
    }, 0);
    return maxBridgeTime;
  }

  return 0;
}

/**
 * Format route for display
 */
export function formatRouteDescription(route: TransferRoute): string {
  const fromName = SUPPORTED_NETWORKS[route.fromNetwork]?.name || route.fromNetwork;
  const toName = SUPPORTED_NETWORKS[route.toNetwork]?.name || route.toNetwork;

  switch (route.type) {
    case 'direct':
      return `Send directly on ${fromName}`;

    case 'bridge':
      return `Bridge from ${fromName} to ${toName}`;

    case 'consolidation':
      if (route.sources && route.sources.length > 1) {
        const sourceNames = route.sources
          .map((s) => SUPPORTED_NETWORKS[s.network]?.shortName || s.network)
          .join(', ');
        return `Consolidate from ${sourceNames} to ${toName}`;
      }
      return `Consolidate to ${toName}`;

    default:
      return 'Transfer';
  }
}

/**
 * Check if a route requires user confirmation (e.g., for bridge fees)
 */
export function routeRequiresConfirmation(route: TransferRoute): boolean {
  // Bridge routes always require confirmation
  if (route.type === 'bridge') {
    return true;
  }

  // Consolidation routes require confirmation
  if (route.type === 'consolidation') {
    return true;
  }

  return false;
}
