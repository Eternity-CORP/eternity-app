/**
 * Bridge Service
 * Cross-network bridging using LI.FI REST API
 * Supports bridging between supported EVM networks
 *
 * Delegates quote fetching, status polling, fee calculation, and time formatting
 * to @e-y/shared. Keeps: NetworkId adapter, ethers signing, error parsing,
 * retry logic (platform-specific).
 */

import { ethers } from 'ethers';
import {
  LIFI_CONTRACT_ADDRESSES,
  NATIVE_TOKEN_ADDRESS,
  ERC20_ALLOWANCE_ABI,
  ERC20_APPROVE_ABI,
  fetchBridgeQuote as sharedFetchQuote,
  fetchBridgeStatus as sharedFetchStatus,
  checkBridgeCostLevel as sharedCheckCostLevel,
  formatBridgeTime as sharedFormatBridgeTime,
  type BridgeQuoteResult,
  type BridgeCostLevel,
} from '@e-y/shared';
import {
  NETWORK_TO_CHAIN_ID,
  CHAIN_ID_TO_NETWORK,
} from '@e-y/shared';
import { NetworkId, SUPPORTED_NETWORKS } from '@/src/constants/networks';
import { createLogger } from '@/src/utils/logger';

const logger = createLogger('BridgeService');

// LI.FI Diamond contract address (default to mainnet)
const LIFI_CONTRACT_ADDRESS = LIFI_CONTRACT_ADDRESSES[1];

// Re-export for backward compatibility
export { NETWORK_TO_CHAIN_ID };

function getChainId(networkId: NetworkId): number {
  const chainId = NETWORK_TO_CHAIN_ID[networkId];
  if (!chainId) {
    throw new Error(`Unsupported network for bridging: ${networkId}`);
  }
  return chainId;
}

function getNetworkId(chainId: number): NetworkId {
  const networkId = CHAIN_ID_TO_NETWORK[chainId];
  if (!networkId) {
    throw new Error(`Unknown chain ID: ${chainId}`);
  }
  return networkId;
}

// ============================================
// Types (NetworkId-based, wrapping shared chain-ID types)
// ============================================

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

export interface BridgeRoute {
  steps: BridgeStep[];
  totalTime: number;
}

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
  estimatedTime: number;
  priceImpact: string;
  route: BridgeRoute;
}

export interface BridgeCheckResult {
  needed: boolean;
  quote?: BridgeQuote;
}

export type { BridgeCostLevel };

export interface BridgeQuoteWithTx extends BridgeQuote {
  transactionRequest: {
    to: string;
    data: string;
    value: string;
    gasLimit: string;
    chainId: number;
  };
}

export interface BridgeQuoteParams {
  fromNetwork: NetworkId;
  toNetwork: NetworkId;
  fromToken: string;
  toToken: string;
  amount: string;
  fromAddress: string;
  toAddress?: string;
}

export interface BridgeExecutionResult {
  success: boolean;
  txHash: string;
  txResponse: ethers.TransactionResponse;
}

export interface BridgeCompletionResult {
  status: 'DONE' | 'FAILED';
  receivingTxHash?: string;
  message?: string;
}

export type BridgeErrorCode =
  | 'INSUFFICIENT_LIQUIDITY'
  | 'SLIPPAGE_EXCEEDED'
  | 'BRIDGE_TIMEOUT'
  | 'APPROVAL_REJECTED'
  | 'BRIDGE_TX_REJECTED'
  | 'BRIDGE_TX_FAILED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface BridgeError extends Error {
  code: BridgeErrorCode;
  canRetry: boolean;
  canSendAlternative: boolean;
}

// ============================================
// Shared → Mobile Adapter (chainId → NetworkId)
// ============================================

function convertSharedQuote(
  result: BridgeQuoteResult,
  fromNetwork: NetworkId,
  toNetwork: NetworkId,
): BridgeQuote {
  const steps: BridgeStep[] = result.route.steps.map((s) => ({
    type: s.type,
    tool: s.tool,
    fromNetwork: CHAIN_ID_TO_NETWORK[s.fromChainId] || fromNetwork,
    toNetwork: CHAIN_ID_TO_NETWORK[s.toChainId] || toNetwork,
    fromToken: s.fromToken,
    toToken: s.toToken,
    fromAmount: s.fromAmount,
    toAmount: s.toAmount,
    estimatedTime: s.estimatedTime,
  }));

  return {
    id: result.id,
    fromNetwork,
    toNetwork,
    fromToken: result.fromToken,
    toToken: result.toToken,
    fromAmount: result.fromAmount,
    toAmount: result.toAmount,
    toAmountMin: result.toAmountMin,
    estimatedGas: result.estimatedGas,
    estimatedGasUsd: result.estimatedGasUsd,
    bridgeFee: result.bridgeFee,
    bridgeFeeUsd: result.bridgeFeeUsd,
    totalFeeUsd: result.totalFeeUsd,
    estimatedTime: result.estimatedTime,
    priceImpact: result.priceImpact,
    route: { steps, totalTime: result.route.totalTime },
  };
}

// ============================================
// Public API (delegates to shared)
// ============================================

/**
 * Get bridge quote from LI.FI (delegates to shared fetchBridgeQuote)
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
  const result = await sharedFetchQuote({
    fromChainId: getChainId(fromNetwork),
    toChainId: getChainId(toNetwork),
    fromToken,
    toToken,
    fromAmount: amount,
    fromAddress,
    toAddress,
  });

  if (!result) return null;
  return convertSharedQuote(result, fromNetwork, toNetwork);
}

/**
 * Check if bridging is needed between sender and recipient preferred networks
 */
export async function checkBridgeNeeded(
  senderNetwork: NetworkId,
  recipientPreferredNetwork: NetworkId | undefined,
  token: string,
  amount: string,
  fromAddress: string,
  toAddress: string
): Promise<BridgeCheckResult> {
  if (!recipientPreferredNetwork) {
    return { needed: false };
  }

  if (senderNetwork === recipientPreferredNetwork) {
    return { needed: false };
  }

  const quote = await getBridgeQuote(
    senderNetwork,
    recipientPreferredNetwork,
    token,
    token,
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
 * Check the cost level of a bridge operation (delegates to shared)
 */
export const checkBridgeCostLevel = sharedCheckCostLevel;

/**
 * Format bridge time for display (delegates to shared)
 */
export const formatBridgeTime = sharedFormatBridgeTime;

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

// ============================================
// Bridge Execution (ethers-specific, stays local)
// ============================================

function parseBridgeError(error: unknown): BridgeError {
  const message = error instanceof Error ? error.message : 'Unknown error';
  const lowerMessage = message.toLowerCase();

  let code: BridgeErrorCode = 'UNKNOWN';
  let canRetry = false;
  let canSendAlternative = true;

  if (lowerMessage.includes('user rejected') || lowerMessage.includes('user denied')) {
    code = 'BRIDGE_TX_REJECTED';
    canRetry = false;
    canSendAlternative = false;
  } else if (lowerMessage.includes('insufficient') || lowerMessage.includes('liquidity')) {
    code = 'INSUFFICIENT_LIQUIDITY';
    canRetry = false;
  } else if (lowerMessage.includes('slippage')) {
    code = 'SLIPPAGE_EXCEEDED';
    canRetry = true;
  } else if (lowerMessage.includes('timeout') || lowerMessage.includes('abort')) {
    code = 'BRIDGE_TIMEOUT';
    canRetry = true;
  } else if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    code = 'NETWORK_ERROR';
    canRetry = true;
  } else if (lowerMessage.includes('failed') || lowerMessage.includes('reverted')) {
    code = 'BRIDGE_TX_FAILED';
    canRetry = true;
  }

  const bridgeError = new Error(message) as BridgeError;
  bridgeError.code = code;
  bridgeError.canRetry = canRetry;
  bridgeError.canSendAlternative = canSendAlternative;

  return bridgeError;
}

/**
 * Get bridge quote WITH transaction request for execution
 * (delegates to shared fetchBridgeQuote which includes txRequest when available)
 */
export async function getBridgeQuoteWithTx(
  params: BridgeQuoteParams
): Promise<BridgeQuoteWithTx | null> {
  const result = await sharedFetchQuote({
    fromChainId: getChainId(params.fromNetwork),
    toChainId: getChainId(params.toNetwork),
    fromToken: params.fromToken,
    toToken: params.toToken,
    fromAmount: params.amount,
    fromAddress: params.fromAddress,
    toAddress: params.toAddress,
  });

  if (!result || !result.transactionRequest) {
    return null;
  }

  const quote = convertSharedQuote(result, params.fromNetwork, params.toNetwork);

  return {
    ...quote,
    transactionRequest: result.transactionRequest,
  };
}

/**
 * Execute bridge transaction
 */
export async function executeBridge(
  quote: BridgeQuoteWithTx,
  signer: ethers.Signer
): Promise<BridgeExecutionResult> {
  try {
    logger.info('Executing bridge transaction', {
      from: quote.fromNetwork,
      to: quote.toNetwork,
      amount: quote.fromAmount,
    });

    const txResponse = await signer.sendTransaction({
      to: quote.transactionRequest.to,
      data: quote.transactionRequest.data,
      value: quote.transactionRequest.value,
      gasLimit: quote.transactionRequest.gasLimit,
    });

    logger.info('Bridge transaction sent', { txHash: txResponse.hash });

    return {
      success: true,
      txHash: txResponse.hash,
      txResponse,
    };
  } catch (error: unknown) {
    const bridgeError = parseBridgeError(error);
    throw bridgeError;
  }
}

/**
 * Execute bridge with automatic retry on transient errors
 */
export async function executeBridgeWithRetry(
  params: BridgeQuoteParams,
  signer: ethers.Signer,
  maxRetries: number = 2
): Promise<BridgeExecutionResult> {
  let lastError: BridgeError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const quote = await getBridgeQuoteWithTx(params);

      if (!quote) {
        const err = new Error('Failed to get bridge quote') as BridgeError;
        err.code = 'INSUFFICIENT_LIQUIDITY';
        err.canRetry = false;
        err.canSendAlternative = true;
        throw err;
      }

      const result = await executeBridge(quote, signer);
      return result;
    } catch (error) {
      lastError = error as BridgeError;

      logger.warn(`Bridge attempt ${attempt + 1} failed`, {
        code: lastError.code,
        message: lastError.message,
        canRetry: lastError.canRetry,
      });

      if (!lastError.canRetry) {
        throw lastError;
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

/**
 * Wait for bridge to complete by polling LI.FI status API (delegates to shared fetchBridgeStatus)
 */
export async function waitForBridgeCompletion(
  txHash: string,
  fromChainId: number,
  toChainId: number,
  timeoutMs: number = 15 * 60 * 1000
): Promise<BridgeCompletionResult> {
  const startTime = Date.now();
  const pollInterval = 5000;

  while (Date.now() - startTime < timeoutMs) {
    const statusResult = await sharedFetchStatus(txHash, fromChainId, toChainId);

    if (statusResult.status === 'DONE') {
      return {
        status: 'DONE',
        receivingTxHash: statusResult.receivingTxHash,
      };
    }

    if (statusResult.status === 'FAILED') {
      return {
        status: 'FAILED',
        message: statusResult.message || 'Bridge transaction failed',
      };
    }

    logger.debug('Bridge status', { status: statusResult.status });
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  const err = new Error('Bridge completion timeout') as BridgeError;
  err.code = 'BRIDGE_TIMEOUT';
  err.canRetry = true;
  err.canSendAlternative = true;
  throw err;
}

/**
 * Check if token approval is needed for LI.FI
 */
export async function checkBridgeAllowance(
  tokenAddress: string,
  ownerAddress: string,
  provider: ethers.Provider
): Promise<bigint> {
  if (tokenAddress === NATIVE_TOKEN_ADDRESS ||
      tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' ||
      tokenAddress.toUpperCase() === 'ETH') {
    return ethers.MaxUint256;
  }

  try {
    const contract = new ethers.Contract(tokenAddress, ERC20_ALLOWANCE_ABI as unknown as string[], provider);
    const allowance = await contract.allowance(ownerAddress, LIFI_CONTRACT_ADDRESS);

    return allowance;
  } catch (error) {
    logger.warn('Failed to check allowance', { error, tokenAddress });
    return BigInt(0);
  }
}

/**
 * Approve token for LI.FI bridge (unlimited approval)
 */
export async function approveBridgeToken(
  tokenAddress: string,
  signer: ethers.Signer
): Promise<ethers.TransactionResponse> {
  const contract = new ethers.Contract(tokenAddress, ERC20_APPROVE_ABI as unknown as string[], signer);
  const tx = await contract.approve(LIFI_CONTRACT_ADDRESS, ethers.MaxUint256);

  logger.info('Approval transaction sent', { txHash: tx.hash, token: tokenAddress });

  return tx;
}

/**
 * Get LI.FI contract address
 */
export function getLiFiContractAddress(): string {
  return LIFI_CONTRACT_ADDRESS;
}
