/**
 * Swap Service for Web
 * Uses shared types and API functions, adds ethers-dependent helpers
 */

import { ethers } from 'ethers'
import {
  type SwapToken,
  type SwapQuote,
  type SwapParams,
  NATIVE_TOKEN_ADDRESS,
  ERC20_ALLOWANCE_ABI,
  ERC20_APPROVE_ABI,
  fetchPopularTokens,
  fetchSwapQuote,
  buildNativeToken,
  formatTokenAmount,
  parseTokenAmount,
  getCachedQuote,
  setCachedQuote,
} from '@e-y/shared'

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

  const fromAmountDecimal = parseFloat(ethers.formatUnits(params.fromAmount, raw.fromToken.decimals))
  const toAmountDecimal = parseFloat(ethers.formatUnits(raw.toAmount, raw.toToken.decimals))
  const exchangeRate = fromAmountDecimal > 0 ? (toAmountDecimal / fromAmountDecimal).toString() : '0'

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

/**
 * Check token allowance
 */
export async function checkAllowance(
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string,
  provider: ethers.Provider
): Promise<bigint> {
  if (tokenAddress === NATIVE_TOKEN_ADDRESS) {
    return ethers.MaxUint256
  }

  const contract = new ethers.Contract(tokenAddress, ERC20_ALLOWANCE_ABI, provider)
  const allowance = await contract.allowance(ownerAddress, spenderAddress)

  return allowance
}

/**
 * Get approval transaction data
 */
export function getApprovalData(
  tokenAddress: string,
  spenderAddress: string,
  amount: string
): { to: string; data: string } {
  const erc20Interface = new ethers.Interface(ERC20_APPROVE_ABI as unknown as string[])
  const data = erc20Interface.encodeFunctionData('approve', [spenderAddress, amount])

  return {
    to: tokenAddress,
    data,
  }
}

/**
 * Execute swap transaction
 */
export async function executeSwap(
  quote: SwapQuote,
  signer: ethers.Signer
): Promise<ethers.TransactionResponse> {
  const tx = await signer.sendTransaction({
    to: quote.transactionRequest.to,
    data: quote.transactionRequest.data,
    value: quote.transactionRequest.value,
    gasLimit: quote.transactionRequest.gasLimit,
  })

  return tx
}

export { formatTokenAmount, parseTokenAmount, NATIVE_TOKEN_ADDRESS }
