/**
 * Gas Bridge Helper -- suggests bridging gas tokens when user is short on a network.
 * Zero runtime dependencies. Uses only shared config and routing helpers.
 */

import type { AggregatedTokenBalance } from '../types/network-balance';
import { findNetworksWithBalance, getCheapestNetwork } from './routing-helpers';
import { SUPPORTED_NETWORKS, type NetworkId } from '../config/multi-network';

export interface GasBridgeSuggestion {
  fromNetwork: NetworkId;
  toNetwork: NetworkId;
  amount: string;
  nativeSymbol: string;
}

/**
 * Suggest a gas bridge when user has insufficient native token on a network.
 * Returns null if no source network has the native token.
 */
export function suggestGasBridge(
  targetNetwork: NetworkId,
  shortfallAmount: string,
  aggregatedBalances: AggregatedTokenBalance[],
): GasBridgeSuggestion | null {
  const nativeSymbol = SUPPORTED_NETWORKS[targetNetwork]?.nativeCurrency?.symbol;
  if (!nativeSymbol) return null;

  const networksWithBalance = findNetworksWithBalance(aggregatedBalances, nativeSymbol)
    .filter(n => n.networkId !== targetNetwork && parseFloat(n.balance) > 0);

  if (networksWithBalance.length === 0) return null;

  const sourceNetwork = getCheapestNetwork(networksWithBalance.map(n => n.networkId));
  if (!sourceNetwork) return null;

  // Bridge 2x the shortfall as safety margin, minimum 0.001
  const shortfall = parseFloat(shortfallAmount) || 0;
  const bridgeAmount = Math.max(shortfall * 2, 0.001).toFixed(6);

  return {
    fromNetwork: sourceNetwork,
    toNetwork: targetNetwork,
    amount: bridgeAmount,
    nativeSymbol,
  };
}
