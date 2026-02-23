/**
 * Routing Service
 * Determines optimal transfer path based on user balances and recipient preferences.
 *
 * Uses shared determineSendRoute for the pure decision logic, then fetches
 * bridge quotes locally when needed. Keeps ethers-specific toWei helper.
 *
 * Pure helpers (getCheapestNetwork, findNetworksWithBalance, getTotalBalance, etc.)
 * are delegated to @e-y/shared.
 */

import {
  type AggregatedTokenBalance,
  getTotalBalance,
  calculateUsdValue,
  getTokenDecimals,
  getTokenAddressForNetwork,
  getRouteTotalFees,
  getRouteEstimatedTime,
  formatRouteDescription,
  routeRequiresConfirmation,
  determineSendRoute,
} from '@e-y/shared';
import { NetworkId, SUPPORTED_NETWORKS } from '@/src/constants/networks';
import { createLogger } from '@/src/utils/logger';
import {
  getBridgeQuote,
  checkBridgeCostLevel,
  BridgeQuote,
  BridgeCostLevel,
} from './bridge-service';
import { parseUnits } from 'ethers';

const logger = createLogger('RoutingService');

// ============================================
// Types (reference mobile-specific BridgeQuote)
// ============================================

export interface TransferRoute {
  type: 'direct' | 'bridge' | 'consolidation';
  fromNetwork: NetworkId;
  toNetwork: NetworkId;
  amount: string;
  token: string;
  bridgeQuote?: BridgeQuote;
  bridgeCostLevel?: BridgeCostLevel;
  sources?: {
    network: NetworkId;
    amount: string;
    bridgeQuote?: BridgeQuote;
  }[];
  alternative?: {
    description: string;
    network: NetworkId;
  };
}

export interface RoutingResult {
  canSend: boolean;
  route?: TransferRoute;
  error?: string;
  showBridgeCost: boolean;
  showConsolidationOption: boolean;
  showAlternative: boolean;
}

// ============================================
// Ethers helper (stays in mobile)
// ============================================

function toWei(amount: string, decimals: number): string {
  try {
    return parseUnits(amount, decimals).toString();
  } catch {
    return '0';
  }
}

// ============================================
// Main orchestrator
// ============================================

/**
 * Calculate optimal transfer route.
 *
 * Uses shared determineSendRoute for the pure decision logic, then
 * enriches the result with bridge quotes and mobile-specific fields.
 */
export async function calculateTransferRoute(
  aggregatedBalances: AggregatedTokenBalance[],
  token: string,
  amount: string,
  recipientPreferredNetwork: NetworkId | null,
  fromAddress: string,
  toAddress: string,
): Promise<RoutingResult> {
  logger.info('Calculating transfer route', { token, amount, recipientPreferredNetwork });

  const requestedAmount = parseFloat(amount);
  if (isNaN(requestedAmount) || requestedAmount <= 0) {
    return { canSend: false, error: 'Invalid amount', showBridgeCost: false, showConsolidationOption: false, showAlternative: false };
  }

  const totalBalance = parseFloat(getTotalBalance(aggregatedBalances, token));
  if (totalBalance < requestedAmount) {
    return { canSend: false, error: `Insufficient ${token} balance. You have ${totalBalance.toFixed(6)} ${token}`, showBridgeCost: false, showConsolidationOption: false, showAlternative: false };
  }

  // Use shared decision engine
  const route = determineSendRoute({
    aggregatedBalances,
    symbol: token,
    amount,
    recipientPreferredNetwork,
  });

  const decimals = getTokenDecimals(aggregatedBalances, token);
  const amountWei = toWei(amount, decimals);

  // Handle each route type
  if (route.type === 'insufficient') {
    return { canSend: false, error: route.message, showBridgeCost: false, showConsolidationOption: false, showAlternative: false };
  }

  if (route.type === 'direct') {
    const bestNetwork = route.fromNetwork as NetworkId;
    logger.info('Direct transfer on network', { bestNetwork });

    // Check if there are multiple sufficient networks (for consolidation option)
    const showConsolidationOption = !recipientPreferredNetwork && route.fromNetwork === route.toNetwork;

    return {
      canSend: true,
      route: { type: 'direct', fromNetwork: bestNetwork, toNetwork: bestNetwork, amount, token },
      showBridgeCost: false,
      showConsolidationOption,
      showAlternative: false,
    };
  }

  if (route.type === 'bridge') {
    const sourceNetwork = route.fromNetwork as NetworkId;
    const preferredNetwork = route.toNetwork as NetworkId;
    const tokenAddress = getTokenAddressForBridge(token, sourceNetwork);
    const destTokenAddress = getTokenAddressForBridge(token, preferredNetwork);

    // If the token is not bridgeable on either network, fall back to direct
    if (!tokenAddress || !destTokenAddress) {
      logger.info('Token not bridgeable, falling back to direct transfer', { sourceNetwork });
      return {
        canSend: true,
        route: { type: 'direct', fromNetwork: sourceNetwork, toNetwork: sourceNetwork, amount, token },
        showBridgeCost: false,
        showConsolidationOption: false,
        showAlternative: false,
      };
    }

    const bridgeQuote = await getBridgeQuote(sourceNetwork, preferredNetwork, tokenAddress, destTokenAddress, amountWei, fromAddress, toAddress);

    const amountUsd = calculateUsdValue(aggregatedBalances, token, requestedAmount);
    const bridgeCostLevel = bridgeQuote ? checkBridgeCostLevel(amountUsd, bridgeQuote.totalFeeUsd) : 'none';

    const showAlternative = bridgeCostLevel === 'expensive' || bridgeCostLevel === 'warning';
    const alternative = showAlternative
      ? { description: `Send on ${SUPPORTED_NETWORKS[sourceNetwork]?.name || sourceNetwork} instead (no bridge fee)`, network: sourceNetwork }
      : undefined;

    logger.info('Bridge transfer needed', { sourceNetwork, preferredNetwork, bridgeCostLevel, showAlternative });

    return {
      canSend: true,
      route: { type: 'bridge', fromNetwork: sourceNetwork, toNetwork: preferredNetwork, amount, token, bridgeQuote: bridgeQuote ?? undefined, bridgeCostLevel, alternative },
      showBridgeCost: true,
      showConsolidationOption: false,
      showAlternative,
    };
  }

  // Consolidation — fetch bridge quotes per source
  if (route.type === 'consolidation') {
    const targetNetwork = route.toNetwork as NetworkId;
    const sources: { network: NetworkId; amount: string; bridgeQuote?: BridgeQuote }[] = [];

    if (route.sources) {
      for (const source of route.sources) {
        if (source.networkId === targetNetwork) {
          sources.push({ network: source.networkId as NetworkId, amount: source.amount });
        } else {
          const tokenAddress = getTokenAddressForBridge(token, source.networkId);
          const destTokenAddress = getTokenAddressForBridge(token, targetNetwork);

          if (!tokenAddress || !destTokenAddress) {
            // Token not bridgeable from this source — skip bridge, include as direct
            sources.push({ network: source.networkId as NetworkId, amount: source.amount });
          } else {
            const sourceAmountWei = toWei(source.amount, decimals);

            const bridgeQuote = await getBridgeQuote(
              source.networkId as NetworkId, targetNetwork, tokenAddress, destTokenAddress, sourceAmountWei, fromAddress, toAddress,
            );
            sources.push({ network: source.networkId as NetworkId, amount: source.amount, bridgeQuote: bridgeQuote ?? undefined });
          }
        }
      }
    }

    logger.info('Consolidation needed', { targetNetwork, sources });

    return {
      canSend: true,
      route: { type: 'consolidation', fromNetwork: sources[0]?.network || targetNetwork, toNetwork: targetNetwork, amount, token, sources },
      showBridgeCost: true,
      showConsolidationOption: true,
      showAlternative: false,
    };
  }

  // Fallback (should not reach here)
  return { canSend: false, error: `Insufficient ${token} balance to send ${amount}`, showBridgeCost: false, showConsolidationOption: false, showAlternative: false };
}

// ============================================
// Bridgeability check
// ============================================

/**
 * Get token address for bridge, returning null if the token is not
 * available on the given network (i.e. getTokenAddressForNetwork
 * returns just the symbol instead of a 0x address).
 */
function getTokenAddressForBridge(symbol: string, networkId: string): string | null {
  const addr = getTokenAddressForNetwork(symbol, networkId);
  if (addr === symbol.toUpperCase()) return null;
  return addr;
}

// Re-export shared helpers for backward compatibility
export { getRouteTotalFees, getRouteEstimatedTime, formatRouteDescription, routeRequiresConfirmation };
