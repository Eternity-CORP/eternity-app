/**
 * Swap Service
 * DEX aggregator integration using LI.FI API
 * Supports same-chain and cross-chain swaps
 *
 * ERC-20 helpers (checkAllowance, getApprovalData, executeSwap)
 * are imported from @e-y/crypto — single source of truth.
 */

import { NetworkId, SUPPORTED_NETWORKS } from '@/src/constants/networks';
import {
  type SwapToken,
  type SwapQuote,
  type SwapRoute,
  type SwapStep,
  type SwapParams,
  type SwapTransactionRequest,
  NATIVE_TOKEN_ADDRESS,
  LIFI_CONTRACT_ADDRESSES,
  fetchTokens as sharedFetchTokens,
  fetchPopularTokens as sharedFetchPopularTokens,
  fetchSwapQuote,
  formatTokenAmount as sharedFormatTokenAmount,
  parseTokenAmount as sharedParseTokenAmount,
  getCachedQuote,
  setCachedQuote,
  isCrossChainSwap as sharedIsCrossChainSwap,
  getChainName as sharedGetChainName,
  calculateExchangeRate,
} from '@e-y/shared';

// Re-export ERC-20 helpers from @e-y/crypto
export { checkAllowance, getApprovalData, executeSwap } from '@e-y/crypto';

export type { SwapToken, SwapQuote, SwapRoute, SwapStep, SwapParams };

/** @deprecated Use SwapTransactionRequest from @e-y/shared */
export type TransactionRequest = SwapTransactionRequest;

/**
 * Get list of available tokens for a chain
 */
export async function getTokens(chainId: number): Promise<SwapToken[]> {
  return sharedFetchTokens(chainId);
}

/**
 * Get popular tokens for a chain (ETH, USDC, USDT, etc.)
 */
export async function getPopularTokens(chainId: number): Promise<SwapToken[]> {
  return sharedFetchPopularTokens(chainId, ['AAVE', 'MATIC', 'ARB', 'OP']);
}

/**
 * Get native token for a chain
 */
export function getNativeToken(networkId: NetworkId): SwapToken {
  const network = SUPPORTED_NETWORKS[networkId];
  return {
    address: NATIVE_TOKEN_ADDRESS,
    symbol: network.nativeCurrency.symbol,
    decimals: network.nativeCurrency.decimals,
    name: network.nativeCurrency.name,
    logoURI: network.iconUrl,
  };
}

/**
 * Get swap quote from LI.FI.
 * Results are cached for 30 seconds to avoid re-fetching on every keystroke.
 */
export async function getSwapQuote(params: SwapParams): Promise<SwapQuote> {
  const cacheKey = params as unknown as Record<string, unknown>;
  const cached = getCachedQuote<SwapQuote>(cacheKey);
  if (cached) return cached;

  const raw = await fetchSwapQuote(params);

  // Calculate exchange rate using shared pure function (no ethers dependency)
  const exchangeRate = calculateExchangeRate(
    params.fromAmount, raw.fromToken.decimals,
    raw.toAmount, raw.toToken.decimals,
  );

  // Build route steps from raw response
  const rawData = raw.raw as any;
  const steps: SwapStep[] = rawData.includedSteps?.map((step: Record<string, unknown>) => ({
    type: step.type as 'swap' | 'cross' | 'lifi',
    tool: step.tool as string,
    toolDetails: {
      name: (step.toolDetails as Record<string, unknown>)?.name as string || step.tool as string,
      logoURI: (step.toolDetails as Record<string, unknown>)?.logoURI as string || '',
    },
    fromChainId: (step.action as Record<string, unknown>)?.fromChainId as number,
    toChainId: (step.action as Record<string, unknown>)?.toChainId as number,
    fromToken: (step.action as Record<string, unknown>)?.fromToken as SwapToken,
    toToken: (step.action as Record<string, unknown>)?.toToken as SwapToken,
    fromAmount: (step.estimate as Record<string, unknown>)?.fromAmount as string,
    toAmount: (step.estimate as Record<string, unknown>)?.toAmount as string,
  })) || [];

  const quote: SwapQuote = {
    id: raw.id,
    fromToken: raw.fromToken,
    toToken: raw.toToken,
    fromAmount: raw.fromAmount,
    toAmount: raw.toAmount,
    toAmountMin: raw.toAmountMin,
    exchangeRate,
    priceImpact: raw.priceImpact,
    estimatedGas: raw.estimatedGas,
    gasCostUSD: raw.gasCostUSD,
    route: {
      steps,
      tags: rawData.tags || [],
      totalDuration: rawData.estimate?.executionDuration || 0,
    },
    transactionRequest: raw.transactionRequest,
  };

  setCachedQuote(cacheKey, quote);
  return quote;
}

/**
 * Get the LI.FI contract address for approvals
 */
export async function getLiFiContractAddress(chainId: number): Promise<string> {
  return LIFI_CONTRACT_ADDRESSES[chainId] || LIFI_CONTRACT_ADDRESSES[1];
}

// Re-export shared format utilities
export const formatTokenAmount = sharedFormatTokenAmount;
export const parseTokenAmount = sharedParseTokenAmount;

/** @deprecated Use isCrossChainSwap from @e-y/shared directly */
export const isCrossChainSwap = sharedIsCrossChainSwap;

/** @deprecated Use getChainName from @e-y/shared directly */
export const getChainName = sharedGetChainName;

// Export native token address constant
export { NATIVE_TOKEN_ADDRESS };
