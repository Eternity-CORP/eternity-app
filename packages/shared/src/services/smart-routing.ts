/**
 * Smart Routing — pure synchronous decision engine for send transfers.
 * Determines route type (direct/bridge/consolidation) without fetching quotes.
 * The calling platform code fetches bridge quotes if the result requires it.
 */

import type { NetworkId } from '../config/multi-network';
import type { AggregatedTokenBalance } from '../types/network-balance';
import { findNetworksWithSufficientBalance } from '../types/network-balance';
import { getCheapestNetwork, findNetworksWithBalance } from './routing-helpers';

export type SmartRouteType = 'direct' | 'bridge' | 'consolidation' | 'insufficient';

export interface SmartRoute {
  type: SmartRouteType;
  fromNetwork: NetworkId;
  toNetwork: NetworkId;
  amount: string;
  symbol: string;
  sources?: { networkId: NetworkId; amount: string }[];
  message: string;
}

export interface SmartRoutingParams {
  aggregatedBalances: AggregatedTokenBalance[];
  symbol: string;
  amount: string;
  recipientPreferredNetwork: NetworkId | null;
}

/**
 * Minimal bridge quote shape shared between platforms.
 * Platform-specific bridge quote types (BridgeQuoteResult, BridgeQuote)
 * are assignable to this since they have at least totalFeeUsd and estimatedTime.
 */
export interface BridgeQuoteLike {
  totalFeeUsd: number;
  estimatedTime: number;
}

/**
 * Unified RoutingResult type used by both web and mobile.
 * Produced by the platform calculateTransferRoute after enriching
 * the pure SmartRoute with bridge quotes and UI flags.
 */
export interface RoutingResult {
  type: SmartRouteType;
  fromNetwork: NetworkId;
  toNetwork: NetworkId;
  amount: string;
  symbol: string;
  message: string;
  estimatedTime: string;

  // Bridge info (only for bridge/consolidation routes)
  bridgeQuote?: BridgeQuoteLike;
  bridgeFeeUsd?: number;
  costLevel: string; // 'none' | 'low' | 'warning' | 'expensive'

  // Derived boolean helpers
  canSend: boolean;
  needsBridge: boolean;

  // Consolidation sources
  sources?: {
    network: NetworkId;
    amount: string;
    bridgeQuote?: BridgeQuoteLike;
  }[];

  // Alternative route suggestion (e.g. send on source network to skip bridge)
  showAlternative?: boolean;
  alternative?: {
    description: string;
    network: NetworkId;
  };

  // Gas savings hint (direct routes)
  gasSavings?: string;
}

/**
 * Determine optimal send route. Pure function — no async, no bridge quotes.
 * Returns the route type and relevant networks.
 */
export function determineSendRoute(params: SmartRoutingParams): SmartRoute {
  const { aggregatedBalances, symbol, amount, recipientPreferredNetwork } = params;
  const upper = symbol.toUpperCase();
  const amountNum = parseFloat(amount);

  if (isNaN(amountNum) || amountNum <= 0) {
    return { type: 'insufficient', fromNetwork: 'ethereum', toNetwork: 'ethereum', amount, symbol: upper, message: 'Invalid amount' };
  }

  const sufficientNetworks = findNetworksWithSufficientBalance(aggregatedBalances, upper, amount);

  if (sufficientNetworks.length === 0) {
    // Check if consolidation would work
    const networksWithBalance = findNetworksWithBalance(aggregatedBalances, upper);
    if (networksWithBalance.length > 1) {
      // Verify total balance across all networks is sufficient
      const totalBalance = networksWithBalance.reduce(
        (sum, n) => sum + parseFloat(n.balance),
        0,
      );
      if (totalBalance < amountNum) {
        return { type: 'insufficient', fromNetwork: 'ethereum', toNetwork: 'ethereum', amount, symbol: upper, message: `Insufficient ${upper} balance across all networks` };
      }

      const target = recipientPreferredNetwork || getCheapestNetwork(networksWithBalance.map(n => n.networkId)) || 'ethereum';
      return {
        type: 'consolidation',
        fromNetwork: networksWithBalance[0].networkId,
        toNetwork: target,
        amount,
        symbol: upper,
        sources: networksWithBalance.map(n => ({ networkId: n.networkId, amount: n.balance })),
        message: 'Consolidation needed from multiple networks',
      };
    }
    return { type: 'insufficient', fromNetwork: 'ethereum', toNetwork: 'ethereum', amount, symbol: upper, message: `Insufficient ${upper} balance` };
  }

  const target = recipientPreferredNetwork || getCheapestNetwork(sufficientNetworks) || 'ethereum';

  // Direct on target?
  if (sufficientNetworks.includes(target)) {
    return {
      type: 'direct',
      fromNetwork: target,
      toNetwork: target,
      amount,
      symbol: upper,
      message: `Direct transfer on ${target}`,
    };
  }

  // Bridge from cheapest source to target
  const source = getCheapestNetwork(sufficientNetworks) || 'ethereum';
  return {
    type: 'bridge',
    fromNetwork: source,
    toNetwork: target,
    amount,
    symbol: upper,
    message: `Bridge from ${source} to ${target}`,
  };
}
