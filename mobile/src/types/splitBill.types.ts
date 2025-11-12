export type SplitMode = 'equal' | 'custom';

export interface SplitBillParticipant {
  id: string;
  address: string;
  name?: string;
  amount: string; // Amount in ETH/Token this participant should pay
}

export interface SplitBill {
  id: string;
  totalAmount: string;
  currency: 'ETH'; // For now, only ETH
  mode: SplitMode;
  participants: SplitBillParticipant[];
  creatorAddress: string;
  status: 'draft' | 'pending' | 'completed';
  createdAt: number;
  shareableLink?: string;
}

export interface SplitBillHistory {
  bills: SplitBill[];
}
