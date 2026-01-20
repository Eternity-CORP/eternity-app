/**
 * Bridge Service
 * LI.FI SDK integration for cross-chain token transfers
 */

import {
  createConfig,
  getQuote,
  getStatus,
  executeRoute,
  convertQuoteToRoute,
  type QuoteRequest,
  type Route,
  type RouteExtended,
  type ExecutionOptions,
  type StatusResponse,
  type ChainId,
} from '@lifi/sdk';
import type { Signer } from 'ethers';
import { type NetworkId, SUPPORTED_NETWORKS, getNetworkConfig } from '../constants/networks';

/**
 * Chain ID mapping: NetworkId -> LI.FI ChainId
 */
const NETWORK_TO_CHAIN_ID: Record<NetworkId, ChainId> = {
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
  base: 8453,
  optimism: 10,
};

/**
 * Reverse mapping: ChainId -> NetworkId
 */
const CHAIN_ID_TO_NETWORK: Record<number, NetworkId> = {
  1: 'ethereum',
  137: 'polygon',
  42161: 'arbitrum',
  8453: 'base',
  10: 'optimism',
};

/**
 * Native token address placeholder used by LI.FI
 */
const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * Bridge quote request parameters
 */
export interface BridgeQuoteRequest {
  fromNetwork: NetworkId;
  toNetwork: NetworkId;
  fromToken: string; // Token address or 'ETH' for native
  toToken: string; // Token address or 'ETH' for native
  fromAmount: string; // Amount in wei
  fromAddress: string; // Sender address
  toAddress?: string; // Recipient address (defaults to fromAddress)
}

/**
 * Bridge quote response
 */
export interface BridgeQuote {
  id: string;
  fromNetwork: NetworkId;
  toNetwork: NetworkId;
  fromToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
  toToken: {
    address: string;
    symbol: string;
    decimals: number;
  };
  fromAmount: string;
  toAmount: string;
  toAmountMin: string; // Minimum received (accounting for slippage)
  bridgeFee: string; // Fee in USD
  gasCost: string; // Estimated gas cost in USD
  estimatedTime: number; // Seconds
  route: Route;
  tools: string[]; // Bridge/DEX names used
}

/**
 * Bridge execution result
 */
export interface BridgeExecutionResult {
  txHash: string;
  status: BridgeStatus;
  routeId: string;
}

/**
 * Bridge status types
 */
export type BridgeStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'unknown';

/**
 * Bridge status response
 */
export interface BridgeStatusResponse {
  status: BridgeStatus;
  substatus?: string;
  sending?: {
    txHash: string;
    chainId: number;
  };
  receiving?: {
    txHash: string;
    chainId: number;
  };
  tool?: string;
  fromAmount?: string;
  toAmount?: string;
}

/**
 * Bridge error codes
 */
export type BridgeErrorCode =
  | 'BRIDGE_QUOTE_FAILED'
  | 'BRIDGE_EXECUTION_FAILED'
  | 'BRIDGE_STATUS_FAILED'
  | 'BRIDGE_INSUFFICIENT_BALANCE'
  | 'BRIDGE_SLIPPAGE_TOO_HIGH'
  | 'BRIDGE_ROUTE_NOT_FOUND'
  | 'BRIDGE_USER_REJECTED'
  | 'BRIDGE_TIMEOUT'
  | 'BRIDGE_UNKNOWN_ERROR';

/**
 * Bridge error
 */
export class BridgeError extends Error {
  code: BridgeErrorCode;
  details?: unknown;

  constructor(code: BridgeErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'BridgeError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Active bridge executions for status tracking
 */
const activeExecutions = new Map<string, RouteExtended>();

/**
 * Initialize LI.FI SDK configuration
 */
let isConfigured = false;

function ensureConfigured() {
  if (!isConfigured) {
    createConfig({
      integrator: 'eternity-wallet',
    });
    isConfigured = true;
  }
}

/**
 * Convert NetworkId to LI.FI ChainId
 */
export function networkToChainId(networkId: NetworkId): ChainId {
  const chainId = NETWORK_TO_CHAIN_ID[networkId];
  if (!chainId) {
    throw new BridgeError('BRIDGE_UNKNOWN_ERROR', `Unsupported network: ${networkId}`);
  }
  return chainId;
}

/**
 * Convert LI.FI ChainId to NetworkId
 */
export function chainIdToNetwork(chainId: number): NetworkId | undefined {
  return CHAIN_ID_TO_NETWORK[chainId];
}

/**
 * Get token address for LI.FI API
 * Returns native token placeholder for ETH
 */
function getTokenAddressForLiFi(token: string): string {
  if (token === 'ETH' || token.toLowerCase() === 'eth') {
    return NATIVE_TOKEN_ADDRESS;
  }
  return token;
}

/**
 * Get bridge quote from LI.FI
 */
export async function getBridgeQuote(request: BridgeQuoteRequest): Promise<BridgeQuote> {
  ensureConfigured();

  try {
    const quoteRequest: QuoteRequest = {
      fromChain: networkToChainId(request.fromNetwork),
      toChain: networkToChainId(request.toNetwork),
      fromToken: getTokenAddressForLiFi(request.fromToken),
      toToken: getTokenAddressForLiFi(request.toToken),
      fromAmount: request.fromAmount,
      fromAddress: request.fromAddress,
      toAddress: request.toAddress || request.fromAddress,
      // Slippage in percentage (0.5%)
      slippage: 0.005,
    };

    const quote = await getQuote(quoteRequest);

    // Extract fee information
    const bridgeFeeUsd = quote.estimate.feeCosts?.reduce(
      (sum, fee) => sum + parseFloat(fee.amountUSD || '0'),
      0
    ) || 0;

    const gasCostUsd = quote.estimate.gasCosts?.reduce(
      (sum, gas) => sum + parseFloat(gas.amountUSD || '0'),
      0
    ) || 0;

    // Get tools used in the route
    const tools = quote.includedSteps?.map((step) => step.tool || step.toolDetails?.name || 'Unknown') || [];

    return {
      id: quote.id || `quote-${Date.now()}`,
      fromNetwork: request.fromNetwork,
      toNetwork: request.toNetwork,
      fromToken: {
        address: quote.action.fromToken.address,
        symbol: quote.action.fromToken.symbol,
        decimals: quote.action.fromToken.decimals,
      },
      toToken: {
        address: quote.action.toToken.address,
        symbol: quote.action.toToken.symbol,
        decimals: quote.action.toToken.decimals,
      },
      fromAmount: quote.action.fromAmount,
      toAmount: quote.estimate.toAmount,
      toAmountMin: quote.estimate.toAmountMin,
      bridgeFee: bridgeFeeUsd.toFixed(2),
      gasCost: gasCostUsd.toFixed(2),
      estimatedTime: quote.estimate.executionDuration || 300,
      route: convertQuoteToRoute(quote),
      tools: [...new Set(tools)],
    };
  } catch (error) {
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('No routes found')) {
        throw new BridgeError(
          'BRIDGE_ROUTE_NOT_FOUND',
          'No bridge route available for this transfer',
          error
        );
      }
      if (error.message.includes('insufficient')) {
        throw new BridgeError(
          'BRIDGE_INSUFFICIENT_BALANCE',
          'Insufficient balance for bridge transfer',
          error
        );
      }
    }
    throw new BridgeError(
      'BRIDGE_QUOTE_FAILED',
      error instanceof Error ? error.message : 'Failed to get bridge quote',
      error
    );
  }
}

/**
 * Execute bridge transaction
 */
export async function executeBridge(
  quote: BridgeQuote,
  signer: Signer,
  callbacks?: {
    onTxHash?: (hash: string) => void;
    onStepUpdate?: (step: string, status: string) => void;
  }
): Promise<BridgeExecutionResult> {
  ensureConfigured();

  try {
    const executionOptions: ExecutionOptions = {
      updateRouteHook: (route) => {
        // Store route for status tracking
        activeExecutions.set(route.id, route);
        return route;
      },
    };

    // Execute the route
    const executedRoute = await executeRoute(quote.route, executionOptions);

    // Get transaction hash from executed steps
    const txHash = executedRoute.steps[0]?.execution?.process?.find(
      (p) => p.txHash
    )?.txHash || '';

    if (callbacks?.onTxHash && txHash) {
      callbacks.onTxHash(txHash);
    }

    // Determine status
    let status: BridgeStatus = 'pending';
    const lastStep = executedRoute.steps[executedRoute.steps.length - 1];
    if (lastStep?.execution?.status === 'DONE') {
      status = 'completed';
    } else if (lastStep?.execution?.status === 'FAILED') {
      status = 'failed';
    } else if (lastStep?.execution?.status === 'PENDING') {
      status = 'in_progress';
    }

    return {
      txHash,
      status,
      routeId: executedRoute.id,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('user rejected') || error.message.includes('User denied')) {
        throw new BridgeError('BRIDGE_USER_REJECTED', 'Transaction rejected by user', error);
      }
      if (error.message.includes('slippage')) {
        throw new BridgeError(
          'BRIDGE_SLIPPAGE_TOO_HIGH',
          'Price changed too much, please try again',
          error
        );
      }
    }
    throw new BridgeError(
      'BRIDGE_EXECUTION_FAILED',
      error instanceof Error ? error.message : 'Bridge execution failed',
      error
    );
  }
}

/**
 * Get bridge transaction status
 */
export async function getBridgeStatus(
  txHash: string,
  fromChainId: number,
  toChainId: number
): Promise<BridgeStatusResponse> {
  ensureConfigured();

  try {
    const status: StatusResponse = await getStatus({
      txHash,
      fromChain: fromChainId,
      toChain: toChainId,
    });

    // Map LI.FI status to our status
    let bridgeStatus: BridgeStatus;
    switch (status.status) {
      case 'DONE':
        bridgeStatus = 'completed';
        break;
      case 'FAILED':
        bridgeStatus = 'failed';
        break;
      case 'PENDING':
        bridgeStatus = 'pending';
        break;
      case 'NOT_FOUND':
        bridgeStatus = 'unknown';
        break;
      default:
        bridgeStatus = 'in_progress';
    }

    // Access properties safely with type narrowing
    // StatusResponse is a union: FullStatusData | StatusData | FailedStatusData
    // Only StatusData and FullStatusData have 'tool' and 'receiving'
    const sending = status.sending;
    const receiving = 'receiving' in status ? status.receiving : undefined;
    const tool = 'tool' in status ? status.tool : undefined;

    // PendingReceivingInfo only has chainId, ExtendedTransactionInfo has txHash
    const hasReceivingTxHash = receiving && 'txHash' in receiving && typeof receiving.txHash === 'string';
    const receivingTxHash: string = hasReceivingTxHash ? (receiving as { txHash: string }).txHash : '';

    // ExtendedTransactionInfo has amount, BaseTransactionInfo and PendingReceivingInfo don't
    const hasFromAmount = 'amount' in sending && typeof (sending as { amount?: string }).amount === 'string';
    const fromAmount: string | undefined = hasFromAmount ? (sending as { amount: string }).amount : undefined;

    const hasToAmount = receiving && 'amount' in receiving && typeof (receiving as { amount?: string }).amount === 'string';
    const toAmount: string | undefined = hasToAmount ? (receiving as { amount: string }).amount : undefined;

    return {
      status: bridgeStatus,
      substatus: status.substatus,
      sending: {
        txHash: sending.txHash,
        chainId: sending.chainId,
      },
      receiving: receiving ? {
        txHash: receivingTxHash,
        chainId: receiving.chainId,
      } : undefined,
      tool,
      fromAmount,
      toAmount,
    };
  } catch (error) {
    throw new BridgeError(
      'BRIDGE_STATUS_FAILED',
      error instanceof Error ? error.message : 'Failed to get bridge status',
      error
    );
  }
}

/**
 * Poll for bridge completion
 * Returns when bridge is complete or failed
 */
export async function waitForBridgeCompletion(
  txHash: string,
  fromNetwork: NetworkId,
  toNetwork: NetworkId,
  options?: {
    pollingInterval?: number; // ms
    timeout?: number; // ms
    onStatusUpdate?: (status: BridgeStatusResponse) => void;
  }
): Promise<BridgeStatusResponse> {
  const interval = options?.pollingInterval || 10000; // 10s default
  const timeout = options?.timeout || 30 * 60 * 1000; // 30 min default

  const fromChainId = networkToChainId(fromNetwork);
  const toChainId = networkToChainId(toNetwork);

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const status = await getBridgeStatus(txHash, fromChainId, toChainId);

    if (options?.onStatusUpdate) {
      options.onStatusUpdate(status);
    }

    if (status.status === 'completed' || status.status === 'failed' || status.status === 'refunded') {
      return status;
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new BridgeError('BRIDGE_TIMEOUT', 'Bridge transaction timed out');
}

/**
 * Get estimated bridge time in human-readable format
 */
export function formatBridgeTime(seconds: number): string {
  if (seconds < 60) {
    return `~${seconds}s`;
  }
  if (seconds < 3600) {
    return `~${Math.ceil(seconds / 60)} min`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.ceil((seconds % 3600) / 60);
  return `~${hours}h ${mins}m`;
}

/**
 * Get network name from NetworkId
 */
export function getNetworkName(networkId: NetworkId): string {
  return SUPPORTED_NETWORKS[networkId]?.name || networkId;
}

/**
 * Check if bridge is supported between two networks
 */
export function isBridgeSupported(fromNetwork: NetworkId, toNetwork: NetworkId): boolean {
  // All Tier 1 networks support bridging between each other
  return (
    fromNetwork in NETWORK_TO_CHAIN_ID &&
    toNetwork in NETWORK_TO_CHAIN_ID &&
    fromNetwork !== toNetwork
  );
}

/**
 * Get supported bridge destinations for a network
 */
export function getSupportedBridgeDestinations(fromNetwork: NetworkId): NetworkId[] {
  return Object.keys(NETWORK_TO_CHAIN_ID)
    .filter((network) => network !== fromNetwork) as NetworkId[];
}
