/**
 * Shared Swap Service
 * Pure fetch-based functions for LI.FI API integration.
 * No ethers dependency — formatting/parsing stays in app code.
 */

import type { SwapToken, SwapParams, SwapTransactionRequest } from '../types/swap';
import { LIFI_API_URL, NATIVE_TOKEN_ADDRESS, POPULAR_TOKEN_SYMBOLS } from '../constants/swap';
import { DEFAULT_SLIPPAGE, SWAP_GAS_LIMIT_FALLBACK } from '../constants/swap-settings';
import { getNetworkByChainId } from '../config/multi-network';

const REQUEST_TIMEOUT = 20_000; // 20 seconds, same as bridge-service

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
  raw: Record<string, unknown>;
}

/** Shape of a single token entry from LI.FI /tokens endpoint */
interface LifiTokenEntry {
  address?: string;
  symbol?: string;
  decimals?: number;
  name?: string;
  logoURI?: string;
  priceUSD?: string;
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

    const data = (await response.json()) as Record<string, Record<string, LifiTokenEntry[]>>;
    const tokens: LifiTokenEntry[] = data?.tokens?.[String(chainId)] || [];

    return tokens.map((token) => ({
      address: token.address ?? '',
      symbol: token.symbol ?? '',
      decimals: token.decimals ?? 18,
      name: token.name ?? '',
      logoURI: token.logoURI,
      priceUSD: token.priceUSD,
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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  let response: Response;
  try {
    response = await fetch(`${LIFI_API_URL}/quote?${queryParams}`, {
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: response.statusText })) as Record<string, unknown>;
    throw new Error((errorBody?.message as string) || 'Failed to get swap quote');
  }

  const data = (await response.json()) as Record<string, unknown>;

  // Safe accessors for deeply nested LI.FI response
  const action = (data?.action ?? {}) as Record<string, unknown>;
  const actionFromToken = (action?.fromToken ?? {}) as Record<string, unknown>;
  const actionToToken = (action?.toToken ?? {}) as Record<string, unknown>;
  const estimate = (data?.estimate ?? {}) as Record<string, unknown>;
  const gasCosts = (Array.isArray(estimate?.gasCosts) ? estimate.gasCosts : []) as Record<string, unknown>[];
  const txRequest = (data?.transactionRequest ?? {}) as Record<string, unknown>;

  const fromToken: SwapToken = {
    address: (actionFromToken?.address as string) ?? '',
    symbol: (actionFromToken?.symbol as string) ?? '',
    decimals: (actionFromToken?.decimals as number) ?? 18,
    name: (actionFromToken?.name as string) ?? '',
    logoURI: actionFromToken?.logoURI as string | undefined,
    priceUSD: actionFromToken?.priceUSD as string | undefined,
  };

  const toToken: SwapToken = {
    address: (actionToToken?.address as string) ?? '',
    symbol: (actionToToken?.symbol as string) ?? '',
    decimals: (actionToToken?.decimals as number) ?? 18,
    name: (actionToToken?.name as string) ?? '',
    logoURI: actionToToken?.logoURI as string | undefined,
    priceUSD: actionToToken?.priceUSD as string | undefined,
  };

  return {
    id: (data?.id as string) || `quote-${Date.now()}`,
    fromToken,
    toToken,
    fromAmount: params.fromAmount,
    toAmount: (estimate?.toAmount as string) ?? '0',
    toAmountMin: (estimate?.toAmountMin as string) ?? '0',
    priceImpact: (estimate?.priceImpact as string) || '0',
    estimatedGas: (gasCosts[0]?.amount as string) || '0',
    gasCostUSD: (gasCosts[0]?.amountUSD as string) || '0',
    transactionRequest: {
      to: (txRequest?.to as string) ?? '',
      data: (txRequest?.data as string) ?? '',
      value: (txRequest?.value as string) || '0',
      gasLimit: (txRequest?.gasLimit as string) || SWAP_GAS_LIMIT_FALLBACK,
      gasPrice: txRequest?.gasPrice as string | undefined,
      chainId: (txRequest?.chainId as number | undefined) ?? params.fromChainId,
    },
    raw: data,
  };
}

/**
 * Check if it's a cross-chain swap (different chain IDs).
 */
export function isCrossChainSwap(fromChainId: number, toChainId: number): boolean {
  return fromChainId !== toChainId;
}

/**
 * Get human-readable chain name by chain ID.
 * Uses SUPPORTED_NETWORKS; falls back to "Chain {id}" for unknown chains.
 */
export function getChainName(chainId: number): string {
  const network = getNetworkByChainId(chainId);
  return network?.name || `Chain ${chainId}`;
}

/**
 * Build a native token object for a given chain.
 * Uses SUPPORTED_NETWORKS config instead of a hardcoded map.
 */
export function buildNativeToken(chainId: number): SwapToken {
  const network = getNetworkByChainId(chainId);

  // Fallback for chains not in SUPPORTED_NETWORKS (e.g. Sepolia testnet)
  const TESTNET_INFO: Record<number, { symbol: string; name: string }> = {
    11155111: { symbol: 'ETH', name: 'Sepolia ETH' },
  };

  const symbol = network?.nativeCurrency?.symbol ?? TESTNET_INFO[chainId]?.symbol ?? 'ETH';
  const name = network
    ? `${network.name} ${network.nativeCurrency.symbol}`
    : TESTNET_INFO[chainId]?.name ?? 'Native Token';

  return {
    address: NATIVE_TOKEN_ADDRESS,
    symbol,
    decimals: network?.nativeCurrency?.decimals ?? 18,
    name,
  };
}
