/**
 * Bridge Service
 * Cross-network bridging using LI.FI REST API
 * Supports bridging between supported EVM networks
 */

import { NetworkId, SUPPORTED_NETWORKS } from '@/src/constants/networks';
import { createLogger } from '@/src/utils/logger';

const logger = createLogger('BridgeService');

const LIFI_API_URL = 'https://li.quest/v1';

// Request timeout (20 seconds - bridge quotes can be slower)
const REQUEST_TIMEOUT = 20000;

// Default slippage for bridge quotes (0.5%)
const DEFAULT_SLIPPAGE = 0.005;

// Network ID to LI.FI chain ID mapping
const NETWORK_TO_CHAIN_ID: Record<NetworkId, number> = {
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
};

// Chain ID to Network ID mapping (reverse lookup)
const CHAIN_ID_TO_NETWORK: Record<number, NetworkId> = {
  1: 'ethereum',
  137: 'polygon',
  42161: 'arbitrum',
  10: 'optimism',
  8453: 'base',
};

/**
 * Bridge step in a route
 */
export interface BridgeStep {
  type: 'swap' | 'bridge' | 'cross';
  tool: string;
  fromNetwork: NetworkId;
  toNetwork: NetworkId;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  estimatedTime: number;
}

/**
 * Bridge route containing steps
 */
export interface BridgeRoute {
  steps: BridgeStep[];
  totalTime: number;
}

/**
 * Bridge quote from LI.FI
 */
export interface BridgeQuote {
  id: string;
  fromNetwork: NetworkId;
  toNetwork: NetworkId;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  toAmountMin: string;
  estimatedGas: string;
  estimatedGasUsd: number;
  bridgeFee: string;
  bridgeFeeUsd: number;
  totalFeeUsd: number;
  estimatedTime: number; // seconds
  priceImpact: string;
  route: BridgeRoute;
}

/**
 * Result of bridge check
 */
export interface BridgeCheckResult {
  needed: boolean;
  quote?: BridgeQuote;
}

/**
 * Bridge cost level indicator
 */
export type BridgeCostLevel = 'none' | 'warning' | 'expensive';

/**
 * Convert NetworkId to LI.FI chain ID
 */
function getChainId(networkId: NetworkId): number {
  const chainId = NETWORK_TO_CHAIN_ID[networkId];
  if (!chainId) {
    throw new Error(`Unsupported network for bridging: ${networkId}`);
  }
  return chainId;
}

/**
 * Convert LI.FI chain ID to NetworkId
 */
function getNetworkId(chainId: number): NetworkId {
  const networkId = CHAIN_ID_TO_NETWORK[chainId];
  if (!networkId) {
    throw new Error(`Unknown chain ID: ${chainId}`);
  }
  return networkId;
}

/**
 * Parse LI.FI step to BridgeStep
 */
function parseStep(step: Record<string, unknown>): BridgeStep {
  const action = step.action as Record<string, unknown>;
  const estimate = step.estimate as Record<string, unknown>;

  return {
    type: step.type as 'swap' | 'bridge' | 'cross',
    tool: step.tool as string,
    fromNetwork: getNetworkId(action.fromChainId as number),
    toNetwork: getNetworkId(action.toChainId as number),
    fromToken: ((action.fromToken as Record<string, unknown>)?.symbol as string) || '',
    toToken: ((action.toToken as Record<string, unknown>)?.symbol as string) || '',
    fromAmount: estimate.fromAmount as string,
    toAmount: estimate.toAmount as string,
    estimatedTime: (estimate.executionDuration as number) || 0,
  };
}

/**
 * Calculate total fees from LI.FI response
 */
function calculateFees(estimate: Record<string, unknown>): {
  estimatedGas: string;
  estimatedGasUsd: number;
  bridgeFee: string;
  bridgeFeeUsd: number;
  totalFeeUsd: number;
} {
  const gasCosts = estimate.gasCosts as Array<Record<string, unknown>> | undefined;
  const feeCosts = estimate.feeCosts as Array<Record<string, unknown>> | undefined;

  // Sum up gas costs
  let totalGas = BigInt(0);
  let totalGasUsd = 0;
  if (gasCosts && Array.isArray(gasCosts)) {
    for (const cost of gasCosts) {
      totalGas += BigInt(cost.amount as string || '0');
      totalGasUsd += parseFloat(cost.amountUSD as string || '0');
    }
  }

  // Sum up bridge/fee costs
  let totalBridgeFee = BigInt(0);
  let totalBridgeFeeUsd = 0;
  if (feeCosts && Array.isArray(feeCosts)) {
    for (const cost of feeCosts) {
      totalBridgeFee += BigInt(cost.amount as string || '0');
      totalBridgeFeeUsd += parseFloat(cost.amountUSD as string || '0');
    }
  }

  return {
    estimatedGas: totalGas.toString(),
    estimatedGasUsd: totalGasUsd,
    bridgeFee: totalBridgeFee.toString(),
    bridgeFeeUsd: totalBridgeFeeUsd,
    totalFeeUsd: totalGasUsd + totalBridgeFeeUsd,
  };
}

/**
 * Get bridge quote from LI.FI
 * @param fromNetwork - Source network
 * @param toNetwork - Destination network
 * @param fromToken - Token address on source network
 * @param toToken - Token address on destination network
 * @param amount - Amount in smallest unit (wei)
 * @param fromAddress - Sender address
 * @param toAddress - Recipient address (optional, defaults to fromAddress)
 * @returns Bridge quote or null if not available
 */
export async function getBridgeQuote(
  fromNetwork: NetworkId,
  toNetwork: NetworkId,
  fromToken: string,
  toToken: string,
  amount: string,
  fromAddress: string,
  toAddress?: string
): Promise<BridgeQuote | null> {
  try {
    const fromChainId = getChainId(fromNetwork);
    const toChainId = getChainId(toNetwork);

    // Build query parameters
    const params = new URLSearchParams({
      fromChain: fromChainId.toString(),
      toChain: toChainId.toString(),
      fromToken,
      toToken,
      fromAmount: amount,
      fromAddress,
      toAddress: toAddress || fromAddress,
      slippage: DEFAULT_SLIPPAGE.toString(),
    });

    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    let response: Response;
    try {
      response = await fetch(`${LIFI_API_URL}/quote?${params}`, {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.warn('Bridge quote request failed', {
        status: response.status,
        error: errorData,
      });
      return null;
    }

    const data = await response.json();

    // Parse the response
    const estimate = data.estimate as Record<string, unknown>;
    const action = data.action as Record<string, unknown>;
    const includedSteps = data.includedSteps as Array<Record<string, unknown>> | undefined;

    // Calculate fees
    const fees = calculateFees(estimate);

    // Parse route steps
    const steps: BridgeStep[] = [];
    if (includedSteps && Array.isArray(includedSteps)) {
      for (const step of includedSteps) {
        try {
          steps.push(parseStep(step));
        } catch (stepError) {
          logger.warn('Failed to parse bridge step', { step, error: stepError });
        }
      }
    }

    // Calculate total route time
    const totalTime = steps.reduce((sum, step) => sum + step.estimatedTime, 0) ||
      (estimate.executionDuration as number) || 0;

    return {
      id: data.id || `bridge-${Date.now()}`,
      fromNetwork,
      toNetwork,
      fromToken: ((action.fromToken as Record<string, unknown>)?.symbol as string) || fromToken,
      toToken: ((action.toToken as Record<string, unknown>)?.symbol as string) || toToken,
      fromAmount: amount,
      toAmount: estimate.toAmount as string,
      toAmountMin: estimate.toAmountMin as string,
      estimatedGas: fees.estimatedGas,
      estimatedGasUsd: fees.estimatedGasUsd,
      bridgeFee: fees.bridgeFee,
      bridgeFeeUsd: fees.bridgeFeeUsd,
      totalFeeUsd: fees.totalFeeUsd,
      estimatedTime: totalTime,
      priceImpact: (estimate.priceImpact as string) || '0',
      route: {
        steps,
        totalTime,
      },
    };
  } catch (error) {
    logger.warn('Failed to get bridge quote', { error, fromNetwork, toNetwork });
    return null;
  }
}

/**
 * Check if bridging is needed between sender and recipient preferred networks
 * @param senderNetwork - Network the sender has funds on
 * @param recipientPreferredNetwork - Network the recipient prefers (or undefined if no preference)
 * @param token - Token address to bridge
 * @param amount - Amount in smallest unit (wei)
 * @param fromAddress - Sender address
 * @param toAddress - Recipient address
 * @returns Object indicating if bridge is needed and quote if available
 */
export async function checkBridgeNeeded(
  senderNetwork: NetworkId,
  recipientPreferredNetwork: NetworkId | undefined,
  token: string,
  amount: string,
  fromAddress: string,
  toAddress: string
): Promise<BridgeCheckResult> {
  // No preference means no bridging needed
  if (!recipientPreferredNetwork) {
    return { needed: false };
  }

  // Same network means no bridging needed
  if (senderNetwork === recipientPreferredNetwork) {
    return { needed: false };
  }

  // Get bridge quote
  const quote = await getBridgeQuote(
    senderNetwork,
    recipientPreferredNetwork,
    token,
    token, // Same token on both networks
    amount,
    fromAddress,
    toAddress
  );

  return {
    needed: true,
    quote: quote || undefined,
  };
}

/**
 * Check the cost level of a bridge operation
 * @param amountUsd - Amount being bridged in USD
 * @param bridgeFeeUsd - Total bridge fees in USD
 * @returns Cost level indicator
 */
export function checkBridgeCostLevel(
  amountUsd: number,
  bridgeFeeUsd: number
): BridgeCostLevel {
  if (amountUsd <= 0) {
    return 'none';
  }

  const feePercentage = (bridgeFeeUsd / amountUsd) * 100;

  if (feePercentage > 10) {
    return 'expensive';
  }

  if (feePercentage >= 5) {
    return 'warning';
  }

  return 'none';
}

/**
 * Format bridge time for display
 * @param seconds - Time in seconds
 * @returns Formatted time string (e.g., "~2 min", "~1 hr")
 */
export function formatBridgeTime(seconds: number): string {
  if (seconds <= 0) {
    return '~instant';
  }

  if (seconds < 60) {
    return `~${seconds} sec`;
  }

  if (seconds < 3600) {
    const minutes = Math.round(seconds / 60);
    return `~${minutes} min`;
  }

  const hours = Math.round(seconds / 3600);
  return hours === 1 ? '~1 hr' : `~${hours} hrs`;
}

/**
 * Get human-readable network name
 */
export function getBridgeNetworkName(networkId: NetworkId): string {
  return SUPPORTED_NETWORKS[networkId]?.name || networkId;
}

/**
 * Check if a network is supported for bridging
 */
export function isBridgeNetworkSupported(networkId: NetworkId): boolean {
  return networkId in NETWORK_TO_CHAIN_ID;
}
