/**
 * Swap Service for Web
 * DEX aggregator integration using LI.FI API
 */

import { ethers } from 'ethers'

const LIFI_API_URL = 'https://li.quest/v1'
const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000'

export interface SwapToken {
  address: string
  symbol: string
  decimals: number
  name: string
  logoURI?: string
  priceUSD?: string
}

export interface SwapQuote {
  id: string
  fromToken: SwapToken
  toToken: SwapToken
  fromAmount: string
  toAmount: string
  toAmountMin: string
  exchangeRate: string
  priceImpact: string
  estimatedGas: string
  gasCostUSD: string
  transactionRequest: {
    to: string
    data: string
    value: string
    gasLimit: string
    chainId: number
  }
}

export interface SwapParams {
  fromChainId: number
  toChainId: number
  fromToken: string
  toToken: string
  fromAmount: string
  fromAddress: string
  slippage?: number
}

/**
 * Get list of available tokens for a chain
 */
export async function getTokens(chainId: number): Promise<SwapToken[]> {
  try {
    const response = await fetch(`${LIFI_API_URL}/tokens?chains=${chainId}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch tokens: ${response.statusText}`)
    }

    const data = await response.json()
    const tokens = data.tokens[chainId] || []

    return tokens.map((token: Record<string, unknown>) => ({
      address: token.address as string,
      symbol: token.symbol as string,
      decimals: token.decimals as number,
      name: token.name as string,
      logoURI: token.logoURI as string | undefined,
      priceUSD: token.priceUSD as string | undefined,
    }))
  } catch (error) {
    console.error('Failed to fetch tokens:', error)
    return []
  }
}

/**
 * Get popular tokens for a chain
 */
export async function getPopularTokens(chainId: number): Promise<SwapToken[]> {
  const allTokens = await getTokens(chainId)

  const popularSymbols = ['ETH', 'WETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'LINK', 'UNI']

  const popular = allTokens.filter((token) =>
    popularSymbols.includes(token.symbol.toUpperCase())
  )

  popular.sort((a, b) => {
    const aIndex = popularSymbols.indexOf(a.symbol.toUpperCase())
    const bIndex = popularSymbols.indexOf(b.symbol.toUpperCase())
    return aIndex - bIndex
  })

  return popular
}

/**
 * Get native token
 */
export function getNativeToken(chainId: number): SwapToken {
  const chainInfo: Record<number, { symbol: string; name: string }> = {
    1: { symbol: 'ETH', name: 'Ethereum' },
    11155111: { symbol: 'ETH', name: 'Sepolia ETH' },
    137: { symbol: 'MATIC', name: 'Polygon' },
    42161: { symbol: 'ETH', name: 'Arbitrum ETH' },
    8453: { symbol: 'ETH', name: 'Base ETH' },
    10: { symbol: 'ETH', name: 'Optimism ETH' },
  }

  const info = chainInfo[chainId] || { symbol: 'ETH', name: 'Native Token' }

  return {
    address: NATIVE_TOKEN_ADDRESS,
    symbol: info.symbol,
    decimals: 18,
    name: info.name,
  }
}

/**
 * Get swap quote from LI.FI
 */
export async function getSwapQuote(params: SwapParams): Promise<SwapQuote> {
  const slippage = params.slippage || 0.5

  const queryParams = new URLSearchParams({
    fromChain: params.fromChainId.toString(),
    toChain: params.toChainId.toString(),
    fromToken: params.fromToken,
    toToken: params.toToken,
    fromAmount: params.fromAmount,
    fromAddress: params.fromAddress,
    slippage: (slippage / 100).toString(),
  })

  const response = await fetch(`${LIFI_API_URL}/quote?${queryParams}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || 'Failed to get swap quote')
  }

  const data = await response.json()

  const fromToken: SwapToken = {
    address: data.action.fromToken.address,
    symbol: data.action.fromToken.symbol,
    decimals: data.action.fromToken.decimals,
    name: data.action.fromToken.name,
    logoURI: data.action.fromToken.logoURI,
    priceUSD: data.action.fromToken.priceUSD,
  }

  const toToken: SwapToken = {
    address: data.action.toToken.address,
    symbol: data.action.toToken.symbol,
    decimals: data.action.toToken.decimals,
    name: data.action.toToken.name,
    logoURI: data.action.toToken.logoURI,
    priceUSD: data.action.toToken.priceUSD,
  }

  const fromAmountDecimal = parseFloat(ethers.formatUnits(params.fromAmount, fromToken.decimals))
  const toAmountDecimal = parseFloat(ethers.formatUnits(data.estimate.toAmount, toToken.decimals))
  const exchangeRate = fromAmountDecimal > 0 ? (toAmountDecimal / fromAmountDecimal).toString() : '0'

  return {
    id: data.id || `quote-${Date.now()}`,
    fromToken,
    toToken,
    fromAmount: params.fromAmount,
    toAmount: data.estimate.toAmount,
    toAmountMin: data.estimate.toAmountMin,
    exchangeRate,
    priceImpact: data.estimate.priceImpact || '0',
    estimatedGas: data.estimate.gasCosts?.[0]?.amount || '0',
    gasCostUSD: data.estimate.gasCosts?.[0]?.amountUSD || '0',
    transactionRequest: {
      to: data.transactionRequest.to,
      data: data.transactionRequest.data,
      value: data.transactionRequest.value || '0',
      gasLimit: data.transactionRequest.gasLimit || '500000',
      chainId: data.transactionRequest.chainId,
    },
  }
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

  const erc20Interface = new ethers.Interface([
    'function allowance(address owner, address spender) view returns (uint256)',
  ])

  const contract = new ethers.Contract(tokenAddress, erc20Interface, provider)
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
  const erc20Interface = new ethers.Interface([
    'function approve(address spender, uint256 amount) returns (bool)',
  ])

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

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: string, decimals: number, maxDecimals: number = 6): string {
  const formatted = ethers.formatUnits(amount, decimals)
  const num = parseFloat(formatted)

  if (num === 0) return '0'
  if (num < 0.000001) return '<0.000001'

  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  })
}

/**
 * Parse token amount from user input
 */
export function parseTokenAmount(amount: string, decimals: number): string {
  try {
    return ethers.parseUnits(amount, decimals).toString()
  } catch {
    return '0'
  }
}

export { NATIVE_TOKEN_ADDRESS }
