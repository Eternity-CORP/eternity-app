/**
 * Transaction-related types
 */

export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export type TransactionDirection = 'sent' | 'received';

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  direction: TransactionDirection;
  status: TransactionStatus;
  gasUsed?: string;
  gasPrice?: string;
  blockNumber?: number;
  timestamp: string;
  createdAt: string;
}

export interface TransactionDetails extends Transaction {
  nonce: number;
  confirmations: number;
  receipt?: {
    status: number;
    logs: unknown[];
  };
}
