import { IsString, IsNumber, IsOptional } from 'class-validator';

export class SwapQuoteRequestDto {
  @IsNumber()
  fromChainId: number;

  @IsNumber()
  toChainId: number;

  @IsString()
  fromTokenAddress: string;

  @IsString()
  toTokenAddress: string;

  @IsString()
  amount: string;

  @IsString()
  fromAddress: string;

  @IsOptional()
  @IsNumber()
  slippageBps?: number;
}

export class SwapQuoteResponseDto {
  routeId: string;
  router: string;
  fromAmount: string;
  toAmount: string;
  estimatedGas: string;
  estimatedTimeSeconds: number;
  txData?: string;
  to?: string;
  value?: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromChainId: number;
  toChainId: number;
}

export class SwapExecuteRequestDto {
  @IsString()
  routeId: string;

  @IsString()
  router: string;

  @IsString()
  signedTx: string;
}

export class SwapExecuteResponseDto {
  executionId: string;
  transactionHash: string;
  status: string;
}

export class SwapStatusResponseDto {
  executionId: string;
  transactionHash: string;
  status: string;
  fromAmount: string;
  toAmount: string;
}
