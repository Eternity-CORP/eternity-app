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
  type RoutingResult,
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
} from './bridge-service';
import { parseUnits } from 'ethers';

const logger = createLogger('RoutingService');

/**
 * TransferRoute is a backward-compatible alias for RoutingResult.
 * Mobile send-slice and other callers reference this type for the
 * route object passed to executeSmartSendThunk.
 */
export type TransferRoute = RoutingResult;

export type { RoutingResult };

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
    return {
      type: 'insufficient', fromNetwork: 'ethereum', toNetwork: 'ethereum',
      amount, symbol: token, message: 'Invalid amount',
      costLevel: 'none', estimatedTime: '', canSend: false, needsBridge: false,
    };
  }

  const totalBalance = parseFloat(getTotalBalance(aggregatedBalances, token));
  if (totalBalance < requestedAmount) {
    return {
      type: 'insufficient', fromNetwork: 'ethereum', toNetwork: 'ethereum',
      amount, symbol: token,
      message: `Insufficient ${token} balance. You have ${totalBalance.toFixed(6)} ${token}`,
      costLevel: 'none', estimatedTime: '', canSend: false, needsBridge: false,
    };
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
    return {
      type: 'insufficient', fromNetwork: route.fromNetwork, toNetwork: route.toNetwork,
      amount, symbol: route.symbol, message: route.message,
      costLevel: 'none', estimatedTime: '', canSend: false, needsBridge: false,
    };
  }

  if (route.type === 'direct') {
    const bestNetwork = route.fromNetwork;
    logger.info('Direct transfer on network', { bestNetwork });

    return {
      type: 'direct', fromNetwork: bestNetwork, toNetwork: bestNetwork,
      amount, symbol: route.symbol,
      message: `Direct transfer on ${SUPPORTED_NETWORKS[bestNetwork]?.name || bestNetwork}`,
      costLevel: 'none', estimatedTime: '~15 sec',
      canSend: true, needsBridge: false,
    };
  }

  if (route.type === 'bridge') {
    const sourceNetwork = route.fromNetwork;
    const preferredNetwork = route.toNetwork;
    const tokenAddress = getTokenAddressForBridge(token, sourceNetwork);
    const destTokenAddress = getTokenAddressForBridge(token, preferredNetwork);

    // If the token is not bridgeable on either network, fall back to direct
    if (!tokenAddress || !destTokenAddress) {
      logger.info('Token not bridgeable, falling back to direct transfer', { sourceNetwork });
      return {
        type: 'direct', fromNetwork: sourceNetwork, toNetwork: sourceNetwork,
        amount, symbol: route.symbol,
        message: `Direct transfer on ${SUPPORTED_NETWORKS[sourceNetwork]?.name || sourceNetwork} (token not bridgeable)`,
        costLevel: 'none', estimatedTime: '~15 sec',
        canSend: true, needsBridge: false,
      };
    }

    const bridgeQuote = await getBridgeQuote(sourceNetwork, preferredNetwork, tokenAddress, destTokenAddress, amountWei, fromAddress, toAddress);

    const amountUsd = calculateUsdValue(aggregatedBalances, token, requestedAmount);
    const bridgeCostLevel = bridgeQuote ? checkBridgeCostLevel(amountUsd, bridgeQuote.totalFeeUsd) : 'none';

    const showAlt = bridgeCostLevel === 'expensive' || bridgeCostLevel === 'warning';
    const alternative = showAlt
      ? { description: `Send on ${SUPPORTED_NETWORKS[sourceNetwork]?.name || sourceNetwork} instead (no bridge fee)`, network: sourceNetwork as NetworkId }
      : undefined;

    logger.info('Bridge transfer needed', { sourceNetwork, preferredNetwork, bridgeCostLevel, showAlternative: showAlt });

    return {
      type: 'bridge', fromNetwork: sourceNetwork, toNetwork: preferredNetwork,
      amount, symbol: route.symbol,
      message: `Bridge from ${SUPPORTED_NETWORKS[sourceNetwork]?.name || sourceNetwork} to ${SUPPORTED_NETWORKS[preferredNetwork]?.name || preferredNetwork}`,
      costLevel: bridgeCostLevel,
      estimatedTime: bridgeQuote ? `~${Math.ceil(bridgeQuote.estimatedTime / 60)} min` : '',
      bridgeQuote: bridgeQuote ?? undefined,
      bridgeFeeUsd: bridgeQuote?.totalFeeUsd,
      canSend: true, needsBridge: true,
      showAlternative: showAlt, alternative,
    };
  }

  // Consolidation — fetch bridge quotes per source
  if (route.type === 'consolidation') {
    const targetNetwork = route.toNetwork;
    const sources: { network: NetworkId; amount: string; bridgeQuote?: BridgeQuote }[] = [];

    if (route.sources) {
      for (const source of route.sources) {
        if (source.networkId === targetNetwork) {
          sources.push({ network: source.networkId, amount: source.amount });
        } else {
          const tokenAddress = getTokenAddressForBridge(token, source.networkId);
          const destTokenAddress = getTokenAddressForBridge(token, targetNetwork);

          if (!tokenAddress || !destTokenAddress) {
            // Token not bridgeable from this source — skip bridge, include as direct
            sources.push({ network: source.networkId, amount: source.amount });
          } else {
            const sourceAmountWei = toWei(source.amount, decimals);

            const bridgeQuote = await getBridgeQuote(
              source.networkId, targetNetwork, tokenAddress, destTokenAddress, sourceAmountWei, fromAddress, toAddress,
            );
            sources.push({ network: source.networkId, amount: source.amount, bridgeQuote: bridgeQuote ?? undefined });
          }
        }
      }
    }

    logger.info('Consolidation needed', { targetNetwork, sources });

    return {
      type: 'consolidation',
      fromNetwork: sources[0]?.network || targetNetwork,
      toNetwork: targetNetwork,
      amount, symbol: route.symbol,
      message: 'Consolidation needed from multiple networks',
      costLevel: 'none', estimatedTime: '',
      canSend: true, needsBridge: true,
      sources,
    };
  }

  // Fallback (should not reach here)
  return {
    type: 'insufficient', fromNetwork: 'ethereum', toNetwork: 'ethereum',
    amount, symbol: token,
    message: `Insufficient ${token} balance to send ${amount}`,
    costLevel: 'none', estimatedTime: '', canSend: false, needsBridge: false,
  };
}

// ============================================
// Bridgeability check
// ============================================

/**
 * Get token address for bridge, returning null if the token is not
 * available on the given network (i.e. getTokenAddressForNetwork
 * returns just the symbol instead of a 0x address).
 */
function getTokenAddressForBridge(symbol: string, networkId: NetworkId): string | null {
  const addr = getTokenAddressForNetwork(symbol, networkId);
  if (addr === symbol.toUpperCase()) return null;
  return addr;
}

// Re-export shared helpers for backward compatibility
export { getRouteTotalFees, getRouteEstimatedTime, formatRouteDescription, routeRequiresConfirmation };
