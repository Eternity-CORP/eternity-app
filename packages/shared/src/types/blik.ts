/**
 * BLIK code-related types
 */

export type BlikCodeStatus = 'active' | 'matched' | 'expired' | 'used';

export interface BlikCode {
  code: string;
  amount: string;
  token: string;
  senderAddress?: string;
  receiverAddress?: string;
  status: BlikCodeStatus;
  expiresAt: string;
  createdAt: string;
  matchedAt?: string;
}

export interface CreateBlikCodeDto {
  amount: string;
  token: string;
  senderAddress: string;
}

export interface RedeemBlikCodeDto {
  code: string;
  receiverAddress: string;
}

export interface BlikCodeMatchEvent {
  code: string;
  amount: string;
  token: string;
  senderAddress: string;
  receiverAddress: string;
  matchedAt: string;
}
