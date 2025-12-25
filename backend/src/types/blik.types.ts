/**
 * Типы для BLIK-подобной системы платежных кодов
 */

export enum PaymentRequestStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export interface CreatePaymentRequestParams {
  toUserId: string;
  amount: string;
  tokenSymbol: string;
  preferredChainId?: string;
  ttlSeconds?: number; // По умолчанию 300 (5 минут)
}

export interface PaymentRequestInfo {
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
  status: PaymentRequestStatus;
  expiresAt: Date;
  createdAt: Date;
}

export interface GetQuoteForRequestParams {
  code: string;
  fromUserId: string;
  fromChainId: string;
  fromAddress: string;
}

export interface ExecutePaymentRequestParams {
  code: string;
  fromUserId: string;
  fromChainId: string;
  fromAddress: string;
  routeId?: string; // Для crosschain через Rango/LI.FI
  txHash?: string; // Mobile передаёт txHash если транзакция уже отправлена
}

export interface PaymentRequestQuote {
  requestInfo: PaymentRequestInfo;
  quote: {
    estimatedOutput: string;
    fee: string;
    feeToken: string;
    durationSeconds: number;
    provider: 'lifi' | 'rango' | 'same-chain';
    routeId?: string;
  };
}
