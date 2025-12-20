/**
 * DTO для crosschain операций
 */

export class GetCrosschainQuoteRequestDto {
  fromChainId: string;
  toChainId: string;
  fromToken: string;
  toToken: string;
  amount: string;
  fromAddress: string;
  toAddress: string;
  slippage?: number;
}

export class CrosschainQuoteResponseDto {
  estimatedOutput: string;
  fee: string;
  feeToken: string;
  durationSeconds: number;
  priceImpact?: string;
  route: RouteInfoDto;
  router: string;
  provider: 'lifi' | 'rango' | 'socket' | 'squid'; // Название провайдера
}

export class RouteInfoDto {
  id: string;
  fromChain: ChainInfoDto;
  toChain: ChainInfoDto;
  fromToken: TokenInfoDto;
  toToken: TokenInfoDto;
  steps: RouteStepDto[];
}

export class ChainInfoDto {
  id: string;
  name: string;
  chainType: string;
}

export class TokenInfoDto {
  address: string;
  symbol: string;
  decimals: number;
  chainId: string;
  name?: string;
  logoURI?: string;
}

export class RouteStepDto {
  type: string;
  tool: string;
  fromToken: TokenInfoDto;
  toToken: TokenInfoDto;
  estimatedGas?: string;
}

export class CompareCrosschainQuotesResponseDto {
  quotes: Array<{
    router: string;
    estimatedOutput: string;
    fee: string;
    durationSeconds: number;
  }>;
  bestRouter: string;
}

export class PrepareCrosschainTransactionRequestDto {
  router: string;
  routeId: string;
  fromAddress: string;
  toAddress: string;
}

export class PrepareCrosschainTransactionResponseDto {
  to: string;
  data: string;
  value: string;
  chainId: string;
  gasLimit?: string;
  gasPrice?: string;
}

export class GetCrosschainStatusRequestDto {
  router: string;
  txHash: string;
}

export class GetCrosschainStatusResponseDto {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fromTxHash?: string;
  toTxHash?: string;
  currentStep?: number;
  totalSteps?: number;
  message?: string;
}
