/**
 * Split bill types
 */

export type SplitBillStatus = 'active' | 'completed' | 'cancelled';
export type ParticipantStatus = 'pending' | 'paid';

export interface SplitParticipant {
  id?: string;
  address: string;
  username?: string;
  name?: string;
  amount: string;
  status: ParticipantStatus;
  paidTxHash?: string;
  paidAt?: string;
}

export interface SplitBill {
  id: string;
  creatorAddress: string;
  creatorUsername?: string;
  recipientAddress?: string;
  totalAmount: string;
  tokenSymbol: string;
  description?: string;
  participants: SplitParticipant[];
  createdAt: string;
  updatedAt: string;
  status: SplitBillStatus;
}

export interface CreateSplitBillRequest {
  creatorAddress: string;
  creatorUsername?: string;
  recipientAddress?: string;
  totalAmount: string;
  tokenSymbol: string;
  description?: string;
  participants: Array<{
    address: string;
    username?: string;
    name?: string;
    amount: string;
  }>;
}
