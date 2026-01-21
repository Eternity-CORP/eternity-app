/**
 * Swap Service
 * DEX aggregator integration using LI.FI API
 * Supports same-chain and cross-chain swaps
 */

import { ethers } from 'ethers';
import { NetworkId, SUPPORTED_NETWORKS } from '@/src/constants/networks';

const LIFI_API_URL = 'https://li.quest/v1';

// Native token address constant used by LI.FI
const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

export interface SwapToken {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
  logoURI?: string;
  priceUSD?: string;
}

export interface SwapQuote {
  id: string;
  fromToken: SwapToken;
  toToken: SwapToken;
  fromAmount: string;
  toAmount: string;
  toAmountMin: string; // After slippage
  exchangeRate: string;
  priceImpact: string;
  estimatedGas: string;
  gasCostUSD: string;
  route: SwapRoute;
  transactionRequest: TransactionRequest;
}

export interface SwapRoute {
  steps: SwapStep[];
  tags: string[];
  totalDuration: number; // seconds
}

export interface SwapStep {
  type: 'swap' | 'cross' | 'lifi';
  tool: string;
  toolDetails: {
    name: string;
    logoURI: string;
  };
  fromChainId: number;
  toChainId: number;
  fromToken: SwapToken;
  toToken: SwapToken;
  fromAmount: string;
  toAmount: string;
}

export interface TransactionRequest {
  to: string;
  data: string;
  value: string;
  gasLimit: string;
  gasPrice?: string;
  chainId: number;
}

export interface SwapParams {
  fromChainId: number;
  toChainId: number;
  fromToken: string; // Token address
  toToken: string; // Token address
  fromAmount: string; // In wei/smallest unit
  fromAddress: string;
  slippage?: number; // Default 0.5%
}

/**
 * Get list of available tokens for a chain
 */
export async function getTokens(chainId: number): Promise<SwapToken[]> {
  try {
    const response = await fetch(`${LIFI_API_URL}/tokens?chains=${chainId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch tokens: ${response.statusText}`);
    }

    const data = await response.json();
    const tokens = data.tokens[chainId] || [];

    return tokens.map((token: Record<string, unknown>) => ({
      address: token.address as string,
      symbol: token.symbol as string,
      decimals: token.decimals as number,
      name: token.name as string,
      logoURI: token.logoURI as string | undefined,
      priceUSD: token.priceUSD as string | undefined,
    }));
  } catch (error) {
    console.error('Failed to fetch tokens:', error);
    return [];
  }
}

/**
 * Get popular tokens for a chain (ETH, USDC, USDT, etc.)
 */
export async function getPopularTokens(chainId: number): Promise<SwapToken[]> {
  const allTokens = await getTokens(chainId);

  // Popular token symbols
  const popularSymbols = ['ETH', 'WETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'LINK', 'UNI', 'AAVE', 'MATIC', 'ARB', 'OP'];

  const popular = allTokens.filter((token) =>
    popularSymbols.includes(token.symbol.toUpperCase())
  );

  // Sort by popularity
  popular.sort((a, b) => {
    const aIndex = popularSymbols.indexOf(a.symbol.toUpperCase());
    const bIndex = popularSymbols.indexOf(b.symbol.toUpperCase());
    return aIndex - bIndex;
  });

  return popular;
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
 * Get swap quote from LI.FI
 */
export async function getSwapQuote(params: SwapParams): Promise<SwapQuote> {
  const slippage = params.slippage || 0.5; // 0.5% default

  const queryParams = new URLSearchParams({
    fromChain: params.fromChainId.toString(),
    toChain: params.toChainId.toString(),
    fromToken: params.fromToken,
    toToken: params.toToken,
    fromAmount: params.fromAmount,
    fromAddress: params.fromAddress,
    slippage: (slippage / 100).toString(), // Convert percentage to decimal
  });

  const response = await fetch(`${LIFI_API_URL}/quote?${queryParams}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || 'Failed to get swap quote');
  }

  const data = await response.json();

  // Parse the response
  const fromToken: SwapToken = {
    address: data.action.fromToken.address,
    symbol: data.action.fromToken.symbol,
    decimals: data.action.fromToken.decimals,
    name: data.action.fromToken.name,
    logoURI: data.action.fromToken.logoURI,
    priceUSD: data.action.fromToken.priceUSD,
  };

  const toToken: SwapToken = {
    address: data.action.toToken.address,
    symbol: data.action.toToken.symbol,
    decimals: data.action.toToken.decimals,
    name: data.action.toToken.name,
    logoURI: data.action.toToken.logoURI,
    priceUSD: data.action.toToken.priceUSD,
  };

  // Calculate exchange rate
  const fromAmountDecimal = parseFloat(ethers.formatUnits(params.fromAmount, fromToken.decimals));
  const toAmountDecimal = parseFloat(ethers.formatUnits(data.estimate.toAmount, toToken.decimals));
  const exchangeRate = fromAmountDecimal > 0 ? (toAmountDecimal / fromAmountDecimal).toString() : '0';

  // Build route steps
  const steps: SwapStep[] = data.includedSteps?.map((step: Record<string, unknown>) => ({
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
    route: {
      steps,
      tags: data.tags || [],
      totalDuration: data.estimate.executionDuration || 0,
    },
    transactionRequest: {
      to: data.transactionRequest.to,
      data: data.transactionRequest.data,
      value: data.transactionRequest.value || '0',
      gasLimit: data.transactionRequest.gasLimit || '500000',
      gasPrice: data.transactionRequest.gasPrice,
      chainId: data.transactionRequest.chainId,
    },
  };
}

/**
 * Check if token approval is needed
 */
export async function checkAllowance(
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string,
  provider: ethers.Provider
): Promise<bigint> {
  if (tokenAddress === NATIVE_TOKEN_ADDRESS) {
    return ethers.MaxUint256; // Native token doesn't need approval
  }

  const erc20Interface = new ethers.Interface([
    'function allowance(address owner, address spender) view returns (uint256)',
  ]);

  const contract = new ethers.Contract(tokenAddress, erc20Interface, provider);
  const allowance = await contract.allowance(ownerAddress, spenderAddress);

  return allowance;
}

/**
 * Get approval transaction data
 */
export async function getApprovalData(
  tokenAddress: string,
  spenderAddress: string,
  amount: string
): Promise<{ to: string; data: string }> {
  const erc20Interface = new ethers.Interface([
    'function approve(address spender, uint256 amount) returns (bool)',
  ]);

  const data = erc20Interface.encodeFunctionData('approve', [spenderAddress, amount]);

  return {
    to: tokenAddress,
    data,
  };
}

/**
 * Get the LI.FI contract address for approvals
 */
export async function getLiFiContractAddress(chainId: number): Promise<string> {
  // LI.FI diamond contract address - same across most chains
  // This is the main router contract that needs approval
  const contractAddresses: Record<number, string> = {
    1: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE', // Ethereum
    137: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE', // Polygon
    42161: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE', // Arbitrum
    8453: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE', // Base
    10: '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE', // Optimism
  };

  return contractAddresses[chainId] || contractAddresses[1];
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
  });

  return tx;
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: string, decimals: number, maxDecimals: number = 6): string {
  const formatted = ethers.formatUnits(amount, decimals);
  const num = parseFloat(formatted);

  if (num === 0) return '0';
  if (num < 0.000001) return '<0.000001';

  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

/**
 * Parse token amount from user input
 */
export function parseTokenAmount(amount: string, decimals: number): string {
  try {
    return ethers.parseUnits(amount, decimals).toString();
  } catch {
    return '0';
  }
}

/**
 * Check if it's a cross-chain swap
 */
export function isCrossChainSwap(fromChainId: number, toChainId: number): boolean {
  return fromChainId !== toChainId;
}

/**
 * Get chain name by ID
 */
export function getChainName(chainId: number): string {
  const network = Object.values(SUPPORTED_NETWORKS).find((n) => n.chainId === chainId);
  return network?.name || `Chain ${chainId}`;
}

// Export native token address constant
export { NATIVE_TOKEN_ADDRESS };
