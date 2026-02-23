/**
 * Smart Routing — pure synchronous decision engine for send transfers.
 * Determines route type (direct/bridge/consolidation) without fetching quotes.
 * The calling platform code fetches bridge quotes if the result requires it.
 */

import type { AggregatedTokenBalance } from '../types/network-balance';
import { findNetworksWithSufficientBalance } from '../types/network-balance';
import { getCheapestNetwork, findNetworksWithBalance } from './routing-helpers';

export type SmartRouteType = 'direct' | 'bridge' | 'consolidation' | 'insufficient';

export interface SmartRoute {
  type: SmartRouteType;
  fromNetwork: string;
  toNetwork: string;
  amount: string;
  symbol: string;
  sources?: { networkId: string; amount: string }[];
  message: string;
}

export interface SmartRoutingParams {
  aggregatedBalances: AggregatedTokenBalance[];
  symbol: string;
  amount: string;
  recipientPreferredNetwork: string | null;
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
    return { type: 'insufficient', fromNetwork: '', toNetwork: '', amount, symbol: upper, message: 'Invalid amount' };
  }

  const sufficientNetworks = findNetworksWithSufficientBalance(aggregatedBalances, upper, amount);

  if (sufficientNetworks.length === 0) {
    // Check if consolidation would work
    const networksWithBalance = findNetworksWithBalance(aggregatedBalances, upper);
    if (networksWithBalance.length > 1) {
      const target = recipientPreferredNetwork || (getCheapestNetwork(networksWithBalance.map(n => n.networkId)) as string);
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
    return { type: 'insufficient', fromNetwork: '', toNetwork: '', amount, symbol: upper, message: `Insufficient ${upper} balance` };
  }

  const target = recipientPreferredNetwork || (getCheapestNetwork(sufficientNetworks) as string);

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
  const source = getCheapestNetwork(sufficientNetworks) as string;
  return {
    type: 'bridge',
    fromNetwork: source,
    toNetwork: target,
    amount,
    symbol: upper,
    message: `Bridge from ${source} to ${target}`,
  };
}
