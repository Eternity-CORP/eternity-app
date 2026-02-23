/**
 * Shared Swap Service
 * Pure fetch-based functions for LI.FI API integration.
 * No ethers dependency — formatting/parsing stays in app code.
 */

import type { SwapToken, SwapParams, SwapTransactionRequest } from '../types/swap';
import { LIFI_API_URL, NATIVE_TOKEN_ADDRESS, POPULAR_TOKEN_SYMBOLS } from '../constants/swap';
import { DEFAULT_SLIPPAGE } from '../constants/swap-settings';

/* eslint-disable @typescript-eslint/no-explicit-any -- LI.FI API responses are untyped */

/**
 * Raw quote response from the shared service.
 * Apps wrap this into their own SwapQuote shape
 * (web doesn't need route, mobile does).
 */
export interface RawSwapQuoteResponse {
  id: string;
  fromToken: SwapToken;
  toToken: SwapToken;
  fromAmount: string;
  toAmount: string;
  toAmountMin: string;
  priceImpact: string;
  estimatedGas: string;
  gasCostUSD: string;
  transactionRequest: SwapTransactionRequest;
  /** Raw LI.FI response for extended parsing (route steps, etc.) */
  raw: Record<string, any>;
}

/**
 * Fetch available tokens for a chain from LI.FI
 */
export async function fetchTokens(chainId: number): Promise<SwapToken[]> {
  try {
    const response = await fetch(`${LIFI_API_URL}/tokens?chains=${chainId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch tokens: ${response.statusText}`);
    }

    const data: any = await response.json();
    const tokens: any[] = data.tokens[chainId] || [];

    return tokens.map((token) => ({
      address: token.address as string,
      symbol: token.symbol as string,
      decimals: token.decimals as number,
      name: token.name as string,
      logoURI: token.logoURI as string | undefined,
      priceUSD: token.priceUSD as string | undefined,
    }));
  } catch (error: unknown) {
    console.error('Failed to fetch tokens:', error);
    return [];
  }
}

/**
 * Fetch popular tokens for a chain (filtered by common symbols)
 */
export async function fetchPopularTokens(
  chainId: number,
  extraSymbols: string[] = [],
): Promise<SwapToken[]> {
  const allTokens = await fetchTokens(chainId);
  const symbols = [...POPULAR_TOKEN_SYMBOLS, ...extraSymbols];

  const popular = allTokens.filter((token) =>
    symbols.includes(token.symbol.toUpperCase()),
  );

  popular.sort((a, b) => {
    const aIndex = symbols.indexOf(a.symbol.toUpperCase());
    const bIndex = symbols.indexOf(b.symbol.toUpperCase());
    return aIndex - bIndex;
  });

  return popular;
}

/**
 * Fetch a swap quote from LI.FI.
 * Returns raw data so each app can enrich it (e.g. exchange rate via ethers.formatUnits).
 */
export async function fetchSwapQuote(params: SwapParams): Promise<RawSwapQuoteResponse> {
  // Slippage as decimal fraction (e.g. 0.005 = 0.5%)
  const slippage = params.slippage ?? DEFAULT_SLIPPAGE;

  const queryParams = new URLSearchParams({
    fromChain: params.fromChainId.toString(),
    toChain: params.toChainId.toString(),
    fromToken: params.fromToken,
    toToken: params.toToken,
    fromAmount: params.fromAmount,
    fromAddress: params.fromAddress,
    slippage: slippage.toString(),
  });

  const response = await fetch(`${LIFI_API_URL}/quote?${queryParams}`);

  if (!response.ok) {
    const error: any = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || 'Failed to get swap quote');
  }

  const data: any = await response.json();

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

  return {
    id: data.id || `quote-${Date.now()}`,
    fromToken,
    toToken,
    fromAmount: params.fromAmount,
    toAmount: data.estimate.toAmount,
    toAmountMin: data.estimate.toAmountMin,
    priceImpact: data.estimate.priceImpact || '0',
    estimatedGas: data.estimate.gasCosts?.[0]?.amount || '0',
    gasCostUSD: data.estimate.gasCosts?.[0]?.amountUSD || '0',
    transactionRequest: {
      to: data.transactionRequest.to,
      data: data.transactionRequest.data,
      value: data.transactionRequest.value || '0',
      gasLimit: data.transactionRequest.gasLimit || '500000',
      gasPrice: data.transactionRequest.gasPrice,
      chainId: data.transactionRequest.chainId,
    },
    raw: data,
  };
}

/**
 * Build a native token object for a given chain
 */
export function buildNativeToken(chainId: number): SwapToken {
  const chainInfo: Record<number, { symbol: string; name: string }> = {
    1: { symbol: 'ETH', name: 'Ethereum' },
    11155111: { symbol: 'ETH', name: 'Sepolia ETH' },
    137: { symbol: 'MATIC', name: 'Polygon' },
    42161: { symbol: 'ETH', name: 'Arbitrum ETH' },
    8453: { symbol: 'ETH', name: 'Base ETH' },
    10: { symbol: 'ETH', name: 'Optimism ETH' },
  };

  const info = chainInfo[chainId] || { symbol: 'ETH', name: 'Native Token' };

  return {
    address: NATIVE_TOKEN_ADDRESS,
    symbol: info.symbol,
    decimals: 18,
    name: info.name,
  };
}
