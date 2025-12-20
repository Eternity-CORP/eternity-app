/**
 * DTO для BLIK-подобной системы платежных кодов
 */

export class CreateBlikRequestDto {
  amount: string;
  tokenSymbol: string;
  preferredChainId?: string;
  ttlSeconds?: number;
}

export class BlikRequestResponseDto {
  code: string;
  expiresAt: Date;
  amount: string;
  tokenSymbol: string;
}

export class BlikRequestInfoDto {
  code: string;
  toUser: {
    id: string;
    globalId: string;
    nickname: string;
    wallets?: Array<{
      chainId: string;
      address: string;
      isPrimary: boolean;
    }>;
  };
  amount: string;
  tokenSymbol: string;
  preferredChainId?: string;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  expiresAt: Date;
  createdAt: Date;
}

export class GetBlikQuoteRequestDto {
  fromChainId: string;
  fromAddress: string;
}

export class BlikQuoteResponseDto {
  requestInfo: BlikRequestInfoDto;
  quote: {
    estimatedOutput: string;
    fee: string;
    feeToken: string;
    durationSeconds: number;
    provider: 'lifi' | 'rango' | 'same-chain';
    routeId?: string;
  };
}

export class ExecuteBlikRequestDto {
  fromChainId: string;
  fromAddress: string;
  routeId?: string;
}

export class ExecuteBlikResponseDto {
  txHash: string;
  status: string;
  code: string;
}

export class BlikErrorDto {
  code: string;
  message: string;
  details?: any;
}
