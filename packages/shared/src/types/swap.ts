/**
 * Swap-related types shared between web and mobile
 */

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
  toAmountMin: string;
  exchangeRate: string;
  priceImpact: string;
  estimatedGas: string;
  gasCostUSD: string;
  route?: SwapRoute;
  transactionRequest: SwapTransactionRequest;
}

export interface SwapTransactionRequest {
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
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  slippage?: number;
}

export interface SwapRoute {
  steps: SwapStep[];
  tags: string[];
  totalDuration: number;
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
