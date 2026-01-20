/**
 * Routing Service
 * Calculates optimal transfer path based on recipient preferences and sender balances
 *
 * Handles all transfer cases from design doc:
 * - Cases 1-3: Recipient without preference
 * - Cases 4-9: Recipient with preference
 * - Edge cases: insufficient funds, expensive bridge
 */

import { NetworkId, SUPPORTED_NETWORKS, TIER1_NETWORK_IDS } from '@/src/constants/networks';
import type { AggregatedTokenBalance } from './network-service';

/**
 * Recipient's network preference for a token
 */
export type TokenNetworkPreference = NetworkId | null;

/**
 * Transfer route type
 */
export type RouteType =
  | 'direct' // Same network, no bridge needed
  | 'bridge' // Cross-network transfer, bridge required
  | 'consolidate' // Multiple source networks needed
  | 'insufficient'; // Not enough funds

/**
 * Single transfer step
 */
export interface TransferStep {
  type: 'send' | 'bridge';
  sourceNetwork: NetworkId;
  targetNetwork: NetworkId;
  amount: string;
  // Estimated fees in USD
  estimatedGasFee: number;
  estimatedBridgeFee: number;
  // Estimated time in seconds
  estimatedTime: number;
}

/**
 * Complete transfer route
 */
export interface TransferRoute {
  type: RouteType;
  steps: TransferStep[];
  // Total amount being sent (in token units)
  amount: string;
  // Token being sent
  symbol: string;
  // Total fees breakdown
  totalGasFee: number;
  totalBridgeFee: number;
  totalFee: number;
  // Recipient info
  recipientPreference: NetworkId | null;
  finalNetwork: NetworkId;
  // Estimated total time in seconds
  estimatedTime: number;
  // Warning flags
  warnings: RouteWarning[];
}

export type RouteWarning =
  | 'expensive_bridge' // Bridge fee > 20% of amount
  | 'slow_bridge' // Bridge time > 10 minutes
  | 'consolidation_needed' // Multiple networks required
  | 'preference_mismatch'; // Sending to different network than preferred

/**
 * Alternative route option
 */
export interface AlternativeRoute {
  route: TransferRoute;
  description: string;
  savings: number; // USD saved compared to primary route
}

/**
 * Result of route calculation
 */
export interface RoutingResult {
  success: boolean;
  // Primary recommended route
  primaryRoute: TransferRoute | null;
  // Alternative options (if any)
  alternatives: AlternativeRoute[];
  // Error if success is false
  error?: {
    code: 'INSUFFICIENT_FUNDS' | 'NO_ROUTE' | 'TOKEN_NOT_FOUND';
    message: string;
  };
}

/**
 * Sender's balance on a specific network
 */
interface SenderNetworkBalance {
  networkId: NetworkId;
  balance: number; // Parsed float
  balanceRaw: string;
  contractAddress: string;
}

// Estimated gas fees per network (in USD) - will be replaced with real-time data
const ESTIMATED_GAS_FEES: Record<NetworkId, number> = {
  ethereum: 2.5,
  polygon: 0.01,
  arbitrum: 0.05,
  base: 0.02,
  optimism: 0.03,
};

// Bridge fee estimate (percentage of amount)
const BRIDGE_FEE_PERCENTAGE = 0.003; // 0.3%
const MIN_BRIDGE_FEE_USD = 0.2;

// Bridge time estimates (seconds)
const BRIDGE_TIME_ESTIMATES: Record<NetworkId, Record<NetworkId, number>> = {
  ethereum: { polygon: 300, arbitrum: 600, base: 300, optimism: 300, ethereum: 0 },
  polygon: { ethereum: 1200, arbitrum: 180, base: 180, optimism: 180, polygon: 0 },
  arbitrum: { ethereum: 604800, polygon: 180, base: 180, optimism: 180, arbitrum: 0 }, // 7 days for Arb->ETH
  base: { ethereum: 604800, polygon: 180, arbitrum: 180, optimism: 180, base: 0 },
  optimism: { ethereum: 604800, polygon: 180, arbitrum: 180, base: 180, optimism: 0 },
};

/**
 * Calculate optimal transfer route
 *
 * @param symbol - Token symbol to send
 * @param amount - Amount to send (as float)
 * @param senderBalances - Sender's aggregated balances
 * @param recipientPreference - Recipient's preferred network (null = any)
 * @param amountUsdValue - USD value of the amount being sent
 */
export function calculateOptimalRoute(
  symbol: string,
  amount: number,
  senderBalances: AggregatedTokenBalance[],
  recipientPreference: TokenNetworkPreference,
  amountUsdValue: number
): RoutingResult {
  // Find token in sender's balances
  const tokenBalance = senderBalances.find(
    (b) => b.symbol.toUpperCase() === symbol.toUpperCase()
  );

  if (!tokenBalance) {
    return {
      success: false,
      primaryRoute: null,
      alternatives: [],
      error: {
        code: 'TOKEN_NOT_FOUND',
        message: `Token ${symbol} not found in your wallet`,
      },
    };
  }

  // Check total balance
  const totalBalance = parseFloat(tokenBalance.totalBalance);
  if (totalBalance < amount) {
    return {
      success: false,
      primaryRoute: null,
      alternatives: [],
      error: {
        code: 'INSUFFICIENT_FUNDS',
        message: `Insufficient ${symbol}. You have ${totalBalance.toFixed(6)}, need ${amount}`,
      },
    };
  }

  // Get per-network balances sorted by amount (descending)
  const networkBalances: SenderNetworkBalance[] = tokenBalance.networks
    .map((n) => ({
      networkId: n.networkId,
      balance: parseFloat(n.balance),
      balanceRaw: n.balanceRaw,
      contractAddress: n.contractAddress,
    }))
    .filter((n) => n.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  // Calculate routes based on recipient preference
  if (recipientPreference === null) {
    // Cases 1-3: No preference - use sender's network
    return calculateRouteNoPreference(
      symbol,
      amount,
      networkBalances,
      amountUsdValue
    );
  } else {
    // Cases 4-9: Recipient has preference
    return calculateRouteWithPreference(
      symbol,
      amount,
      networkBalances,
      recipientPreference,
      amountUsdValue
    );
  }
}

/**
 * Cases 1-3: Recipient has no preference
 * Choose sender's network (prioritize cheaper gas)
 */
function calculateRouteNoPreference(
  symbol: string,
  amount: number,
  networkBalances: SenderNetworkBalance[],
  amountUsdValue: number
): RoutingResult {
  // Sort by gas cost (cheapest first)
  const sortedByGas = [...networkBalances].sort(
    (a, b) => ESTIMATED_GAS_FEES[a.networkId] - ESTIMATED_GAS_FEES[b.networkId]
  );

  // Case 1 & 2: Single network has enough
  for (const nb of sortedByGas) {
    if (nb.balance >= amount) {
      const route = createDirectRoute(symbol, amount, nb.networkId, null, amountUsdValue);
      return {
        success: true,
        primaryRoute: route,
        alternatives: [],
      };
    }
  }

  // Case 3: Consolidation needed
  const consolidationRoute = createConsolidationRoute(
    symbol,
    amount,
    networkBalances,
    null, // No target preference
    amountUsdValue
  );

  if (!consolidationRoute) {
    return {
      success: false,
      primaryRoute: null,
      alternatives: [],
      error: {
        code: 'NO_ROUTE',
        message: 'Unable to calculate route',
      },
    };
  }

  // Offer alternative: send max from single network
  const maxSingleNetwork = networkBalances[0];
  const alternatives: AlternativeRoute[] = [];

  if (maxSingleNetwork.balance > 0 && maxSingleNetwork.balance < amount) {
    const altRoute = createDirectRoute(
      symbol,
      maxSingleNetwork.balance,
      maxSingleNetwork.networkId,
      null,
      (maxSingleNetwork.balance / amount) * amountUsdValue
    );
    alternatives.push({
      route: altRoute,
      description: `Send ${maxSingleNetwork.balance.toFixed(6)} ${symbol} (max from ${SUPPORTED_NETWORKS[maxSingleNetwork.networkId].name})`,
      savings: consolidationRoute.totalFee - altRoute.totalFee,
    });
  }

  return {
    success: true,
    primaryRoute: consolidationRoute,
    alternatives,
  };
}

/**
 * Cases 4-9: Recipient has preference
 */
function calculateRouteWithPreference(
  symbol: string,
  amount: number,
  networkBalances: SenderNetworkBalance[],
  preferredNetwork: NetworkId,
  amountUsdValue: number
): RoutingResult {
  const preferredBalance = networkBalances.find(
    (nb) => nb.networkId === preferredNetwork
  );
  const preferredAmount = preferredBalance?.balance ?? 0;
  const otherBalances = networkBalances.filter(
    (nb) => nb.networkId !== preferredNetwork
  );

  // Case 4 & 6: Preferred network has enough
  if (preferredAmount >= amount) {
    const route = createDirectRoute(
      symbol,
      amount,
      preferredNetwork,
      preferredNetwork,
      amountUsdValue
    );
    return {
      success: true,
      primaryRoute: route,
      alternatives: [],
    };
  }

  // Case 5: All tokens on different network, need bridge
  if (preferredAmount === 0 && otherBalances.length > 0) {
    // Find best source network (cheapest bridge)
    const sourceNetwork = findCheapestBridgeSource(otherBalances, preferredNetwork, amount);

    if (sourceNetwork && sourceNetwork.balance >= amount) {
      const route = createBridgeRoute(
        symbol,
        amount,
        sourceNetwork.networkId,
        preferredNetwork,
        amountUsdValue
      );

      // Alternative: Send without bridge
      const altRoute = createDirectRoute(
        symbol,
        amount,
        sourceNetwork.networkId,
        preferredNetwork, // Still show preference mismatch
        amountUsdValue
      );
      altRoute.warnings.push('preference_mismatch');

      return {
        success: true,
        primaryRoute: route,
        alternatives: [
          {
            route: altRoute,
            description: `Send on ${SUPPORTED_NETWORKS[sourceNetwork.networkId].name} without conversion`,
            savings: route.totalFee - altRoute.totalFee,
          },
        ],
      };
    }
  }

  // Case 7: Partial on preferred + bridge from other
  if (preferredAmount > 0 && preferredAmount < amount) {
    const remainingAmount = amount - preferredAmount;

    // Find source for remaining amount
    const sourceForRemaining = findCheapestBridgeSource(
      otherBalances,
      preferredNetwork,
      remainingAmount
    );

    if (sourceForRemaining && sourceForRemaining.balance >= remainingAmount) {
      const route = createPartialBridgeRoute(
        symbol,
        amount,
        preferredNetwork,
        preferredAmount,
        sourceForRemaining.networkId,
        remainingAmount,
        amountUsdValue
      );

      return {
        success: true,
        primaryRoute: route,
        alternatives: [],
      };
    }
  }

  // Cases 8-9: Bridge from other networks
  const consolidationRoute = createConsolidationRoute(
    symbol,
    amount,
    networkBalances,
    preferredNetwork,
    amountUsdValue
  );

  if (!consolidationRoute) {
    return {
      success: false,
      primaryRoute: null,
      alternatives: [],
      error: {
        code: 'NO_ROUTE',
        message: 'Unable to calculate route',
      },
    };
  }

  // Alternative: Send to sender's network without bridge
  const bestSenderNetwork = networkBalances.find((nb) => nb.balance >= amount);
  const alternatives: AlternativeRoute[] = [];

  if (bestSenderNetwork) {
    const altRoute = createDirectRoute(
      symbol,
      amount,
      bestSenderNetwork.networkId,
      preferredNetwork,
      amountUsdValue
    );
    altRoute.warnings.push('preference_mismatch');

    alternatives.push({
      route: altRoute,
      description: `Send on ${SUPPORTED_NETWORKS[bestSenderNetwork.networkId].name} without conversion`,
      savings: consolidationRoute.totalFee - altRoute.totalFee,
    });
  }

  return {
    success: true,
    primaryRoute: consolidationRoute,
    alternatives,
  };
}

/**
 * Create a direct (same-network) transfer route
 */
function createDirectRoute(
  symbol: string,
  amount: number,
  sourceNetwork: NetworkId,
  recipientPreference: NetworkId | null,
  amountUsdValue: number
): TransferRoute {
  const gasFee = ESTIMATED_GAS_FEES[sourceNetwork];

  const route: TransferRoute = {
    type: 'direct',
    steps: [
      {
        type: 'send',
        sourceNetwork,
        targetNetwork: sourceNetwork,
        amount: amount.toString(),
        estimatedGasFee: gasFee,
        estimatedBridgeFee: 0,
        estimatedTime: 30, // ~30 seconds for confirmation
      },
    ],
    amount: amount.toString(),
    symbol,
    totalGasFee: gasFee,
    totalBridgeFee: 0,
    totalFee: gasFee,
    recipientPreference,
    finalNetwork: sourceNetwork,
    estimatedTime: 30,
    warnings: [],
  };

  return route;
}

/**
 * Create a bridge transfer route
 */
function createBridgeRoute(
  symbol: string,
  amount: number,
  sourceNetwork: NetworkId,
  targetNetwork: NetworkId,
  amountUsdValue: number
): TransferRoute {
  const gasFee = ESTIMATED_GAS_FEES[sourceNetwork];
  const bridgeFee = Math.max(amountUsdValue * BRIDGE_FEE_PERCENTAGE, MIN_BRIDGE_FEE_USD);
  const bridgeTime = BRIDGE_TIME_ESTIMATES[sourceNetwork]?.[targetNetwork] ?? 300;

  const warnings: RouteWarning[] = [];

  // Check if bridge is expensive (> 20% of amount)
  if (bridgeFee > amountUsdValue * 0.2) {
    warnings.push('expensive_bridge');
  }

  // Check if bridge is slow (> 10 minutes)
  if (bridgeTime > 600) {
    warnings.push('slow_bridge');
  }

  return {
    type: 'bridge',
    steps: [
      {
        type: 'bridge',
        sourceNetwork,
        targetNetwork,
        amount: amount.toString(),
        estimatedGasFee: gasFee,
        estimatedBridgeFee: bridgeFee,
        estimatedTime: bridgeTime,
      },
    ],
    amount: amount.toString(),
    symbol,
    totalGasFee: gasFee,
    totalBridgeFee: bridgeFee,
    totalFee: gasFee + bridgeFee,
    recipientPreference: targetNetwork,
    finalNetwork: targetNetwork,
    estimatedTime: bridgeTime,
    warnings,
  };
}

/**
 * Create route with partial amount from preferred + bridge rest
 */
function createPartialBridgeRoute(
  symbol: string,
  totalAmount: number,
  preferredNetwork: NetworkId,
  preferredAmount: number,
  bridgeSourceNetwork: NetworkId,
  bridgeAmount: number,
  amountUsdValue: number
): TransferRoute {
  const preferredGasFee = ESTIMATED_GAS_FEES[preferredNetwork];
  const bridgeGasFee = ESTIMATED_GAS_FEES[bridgeSourceNetwork];
  const bridgeFeeUsd = (bridgeAmount / totalAmount) * amountUsdValue;
  const bridgeFee = Math.max(bridgeFeeUsd * BRIDGE_FEE_PERCENTAGE, MIN_BRIDGE_FEE_USD);
  const bridgeTime = BRIDGE_TIME_ESTIMATES[bridgeSourceNetwork]?.[preferredNetwork] ?? 300;

  const warnings: RouteWarning[] = ['consolidation_needed'];

  if (bridgeFee > bridgeFeeUsd * 0.2) {
    warnings.push('expensive_bridge');
  }

  return {
    type: 'consolidate',
    steps: [
      {
        type: 'send',
        sourceNetwork: preferredNetwork,
        targetNetwork: preferredNetwork,
        amount: preferredAmount.toString(),
        estimatedGasFee: preferredGasFee,
        estimatedBridgeFee: 0,
        estimatedTime: 30,
      },
      {
        type: 'bridge',
        sourceNetwork: bridgeSourceNetwork,
        targetNetwork: preferredNetwork,
        amount: bridgeAmount.toString(),
        estimatedGasFee: bridgeGasFee,
        estimatedBridgeFee: bridgeFee,
        estimatedTime: bridgeTime,
      },
    ],
    amount: totalAmount.toString(),
    symbol,
    totalGasFee: preferredGasFee + bridgeGasFee,
    totalBridgeFee: bridgeFee,
    totalFee: preferredGasFee + bridgeGasFee + bridgeFee,
    recipientPreference: preferredNetwork,
    finalNetwork: preferredNetwork,
    estimatedTime: bridgeTime + 30,
    warnings,
  };
}

/**
 * Create consolidation route (multiple sources)
 */
function createConsolidationRoute(
  symbol: string,
  amount: number,
  networkBalances: SenderNetworkBalance[],
  targetNetwork: NetworkId | null,
  amountUsdValue: number
): TransferRoute | null {
  // Determine target network (use cheapest gas if no preference)
  const target =
    targetNetwork ??
    networkBalances.reduce((cheapest, nb) =>
      ESTIMATED_GAS_FEES[nb.networkId] < ESTIMATED_GAS_FEES[cheapest.networkId]
        ? nb
        : cheapest
    ).networkId;

  const steps: TransferStep[] = [];
  let collected = 0;
  let totalGasFee = 0;
  let totalBridgeFee = 0;
  let maxTime = 0;

  for (const nb of networkBalances) {
    if (collected >= amount) break;

    const takeAmount = Math.min(nb.balance, amount - collected);
    const gasFee = ESTIMATED_GAS_FEES[nb.networkId];
    const needsBridge = nb.networkId !== target;

    let bridgeFee = 0;
    let time = 30;

    if (needsBridge) {
      const usdValue = (takeAmount / amount) * amountUsdValue;
      bridgeFee = Math.max(usdValue * BRIDGE_FEE_PERCENTAGE, MIN_BRIDGE_FEE_USD);
      time = BRIDGE_TIME_ESTIMATES[nb.networkId]?.[target] ?? 300;
    }

    steps.push({
      type: needsBridge ? 'bridge' : 'send',
      sourceNetwork: nb.networkId,
      targetNetwork: target,
      amount: takeAmount.toString(),
      estimatedGasFee: gasFee,
      estimatedBridgeFee: bridgeFee,
      estimatedTime: time,
    });

    collected += takeAmount;
    totalGasFee += gasFee;
    totalBridgeFee += bridgeFee;
    maxTime = Math.max(maxTime, time);
  }

  if (collected < amount) {
    return null;
  }

  const warnings: RouteWarning[] = ['consolidation_needed'];

  if (totalBridgeFee > amountUsdValue * 0.2) {
    warnings.push('expensive_bridge');
  }

  return {
    type: 'consolidate',
    steps,
    amount: amount.toString(),
    symbol,
    totalGasFee,
    totalBridgeFee,
    totalFee: totalGasFee + totalBridgeFee,
    recipientPreference: targetNetwork,
    finalNetwork: target,
    estimatedTime: maxTime,
    warnings,
  };
}

/**
 * Find the cheapest bridge source network
 */
function findCheapestBridgeSource(
  balances: SenderNetworkBalance[],
  targetNetwork: NetworkId,
  minAmount: number
): SenderNetworkBalance | null {
  const eligible = balances.filter((nb) => nb.balance >= minAmount);

  if (eligible.length === 0) return null;

  // Sort by estimated total cost (gas + bridge time as proxy for cost)
  return eligible.reduce((best, current) => {
    const currentCost =
      ESTIMATED_GAS_FEES[current.networkId] +
      (BRIDGE_TIME_ESTIMATES[current.networkId]?.[targetNetwork] ?? 1000) / 100;
    const bestCost =
      ESTIMATED_GAS_FEES[best.networkId] +
      (BRIDGE_TIME_ESTIMATES[best.networkId]?.[targetNetwork] ?? 1000) / 100;
    return currentCost < bestCost ? current : best;
  });
}

/**
 * Format fee for display
 */
export function formatFee(fee: number): string {
  if (fee < 0.01) return '<$0.01';
  return `~$${fee.toFixed(2)}`;
}

/**
 * Format time for display
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`;
  if (seconds < 3600) return `~${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `~${Math.round(seconds / 3600)} hr`;
  return `~${Math.round(seconds / 86400)} days`;
}
