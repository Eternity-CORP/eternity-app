/**
 * Routing Service
 * Determines optimal transfer path based on user balances and recipient preferences.
 *
 * Pure helpers (getCheapestNetwork, findNetworksWithBalance, getTotalBalance, etc.)
 * are delegated to @e-y/shared. This file keeps the main orchestrator
 * and ethers-specific toWei helper.
 */

import {
  type AggregatedTokenBalance,
  findNetworksWithSufficientBalance,
  getCheapestNetwork,
  findNetworksWithBalance,
  getTotalBalance,
  calculateUsdValue,
  getTokenDecimals,
  getTokenAddressForNetwork,
  getRouteTotalFees,
  getRouteEstimatedTime,
  formatRouteDescription,
  routeRequiresConfirmation,
  hasSufficientBalance,
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
 * Calculate optimal transfer route
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

  const sufficientNetworks = findNetworksWithSufficientBalance(aggregatedBalances, token, amount) as NetworkId[];
  const decimals = getTokenDecimals(aggregatedBalances, token);
  const amountWei = toWei(amount, decimals);

  // CASE 1: No recipient preference
  if (!recipientPreferredNetwork) {
    if (sufficientNetworks.length > 0) {
      const bestNetwork = getCheapestNetwork(sufficientNetworks) as NetworkId;
      logger.info('Direct transfer on cheapest network', { bestNetwork });

      return {
        canSend: true,
        route: { type: 'direct', fromNetwork: bestNetwork, toNetwork: bestNetwork, amount, token },
        showBridgeCost: false,
        showConsolidationOption: sufficientNetworks.length > 1,
        showAlternative: false,
      };
    }

    const networksWithBalance = findNetworksWithBalance(aggregatedBalances, token);
    if (networksWithBalance.length > 1) {
      const targetNetwork = getCheapestNetwork(networksWithBalance.map((n) => n.networkId)) as NetworkId;
      const sources = networksWithBalance.map((n) => ({ network: n.networkId as NetworkId, amount: n.balance }));
      logger.info('Consolidation needed', { targetNetwork, sources });

      return {
        canSend: true,
        route: { type: 'consolidation', fromNetwork: sources[0].network, toNetwork: targetNetwork, amount, token, sources },
        showBridgeCost: true,
        showConsolidationOption: true,
        showAlternative: false,
      };
    }

    return { canSend: false, error: `Insufficient ${token} balance across all networks`, showBridgeCost: false, showConsolidationOption: false, showAlternative: false };
  }

  // CASE 2: Recipient has a preferred network
  const preferredNetwork = recipientPreferredNetwork;

  if (hasSufficientBalance(aggregatedBalances, token, amount, preferredNetwork)) {
    logger.info('Direct transfer to preferred network', { preferredNetwork });

    return {
      canSend: true,
      route: { type: 'direct', fromNetwork: preferredNetwork, toNetwork: preferredNetwork, amount, token },
      showBridgeCost: false,
      showConsolidationOption: false,
      showAlternative: false,
    };
  }

  if (sufficientNetworks.length > 0) {
    const sourceNetwork = getCheapestNetwork(sufficientNetworks) as NetworkId;
    const tokenAddress = getTokenAddressForNetwork(token, sourceNetwork);
    const destTokenAddress = getTokenAddressForNetwork(token, preferredNetwork);

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

  // Need consolidation + possibly bridging
  const networksWithBalance = findNetworksWithBalance(aggregatedBalances, token);

  if (networksWithBalance.length > 1) {
    const sources: { network: NetworkId; amount: string; bridgeQuote?: BridgeQuote }[] = [];

    for (const source of networksWithBalance) {
      if (source.networkId === preferredNetwork) {
        sources.push({ network: source.networkId as NetworkId, amount: source.balance });
      } else {
        const tokenAddress = getTokenAddressForNetwork(token, source.networkId);
        const destTokenAddress = getTokenAddressForNetwork(token, preferredNetwork);
        const sourceAmountWei = toWei(source.balance, decimals);

        const bridgeQuote = await getBridgeQuote(
          source.networkId as NetworkId, preferredNetwork, tokenAddress, destTokenAddress, sourceAmountWei, fromAddress, toAddress,
        );
        sources.push({ network: source.networkId as NetworkId, amount: source.balance, bridgeQuote: bridgeQuote ?? undefined });
      }
    }

    logger.info('Consolidation + bridge needed', { preferredNetwork, sources });

    return {
      canSend: true,
      route: { type: 'consolidation', fromNetwork: sources[0].network, toNetwork: preferredNetwork, amount, token, sources },
      showBridgeCost: true,
      showConsolidationOption: true,
      showAlternative: false,
    };
  }

  return { canSend: false, error: `Insufficient ${token} balance to send ${amount}`, showBridgeCost: false, showConsolidationOption: false, showAlternative: false };
}

// Re-export shared helpers for backward compatibility
export { getRouteTotalFees, getRouteEstimatedTime, formatRouteDescription, routeRequiresConfirmation };
