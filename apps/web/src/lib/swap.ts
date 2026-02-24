/**
 * Swap Service for Web
 * Uses shared types and API functions, imports ethers-dependent helpers from @e-y/crypto.
 */

import {
  type SwapToken,
  type SwapQuote,
  type SwapParams,
  NATIVE_TOKEN_ADDRESS,
  fetchPopularTokens,
  fetchSwapQuote,
  buildNativeToken,
  formatTokenAmount,
  parseTokenAmount,
  getCachedQuote,
  setCachedQuote,
  calculateExchangeRate,
} from '@e-y/shared'

// ERC-20 helpers from @e-y/crypto (single source of truth)
export { checkAllowance, getApprovalData, executeSwap } from '@e-y/crypto'

export type { SwapToken, SwapQuote, SwapParams }

/**
 * Get popular tokens for a chain
 */
export async function getPopularTokens(chainId: number): Promise<SwapToken[]> {
  return fetchPopularTokens(chainId)
}

/**
 * Get native token
 */
export function getNativeToken(chainId: number): SwapToken {
  return buildNativeToken(chainId)
}

/**
 * Get swap quote from LI.FI (enriched with exchange rate).
 * Results are cached for 30 seconds to avoid re-fetching on every keystroke.
 */
export async function getSwapQuote(params: SwapParams): Promise<SwapQuote> {
  const cacheKey = params as unknown as Record<string, unknown>
  const cached = getCachedQuote<SwapQuote>(cacheKey)
  if (cached) return cached

  const raw = await fetchSwapQuote(params)

  const exchangeRate = calculateExchangeRate(
    params.fromAmount, raw.fromToken.decimals,
    raw.toAmount, raw.toToken.decimals,
  )

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
    transactionRequest: raw.transactionRequest,
  }

  setCachedQuote(cacheKey, quote)
  return quote
}

export { formatTokenAmount, parseTokenAmount, NATIVE_TOKEN_ADDRESS }
