/**
 * Scheduled payment types
 */

export type RecurringInterval = 'daily' | 'weekly' | 'monthly';
export type ScheduledPaymentStatus = 'pending' | 'executed' | 'cancelled' | 'failed';

export interface ScheduledPayment {
  id: string;
  creatorAddress: string;
  recipient: string;
  recipientUsername?: string;
  recipientName?: string;
  amount: string;
  tokenSymbol: string;
  scheduledAt: string;
  recurringInterval?: RecurringInterval | null;
  recurringEndDate?: string | null;
  description?: string;
  status: ScheduledPaymentStatus;
  executedTxHash?: string | null;
  executedAt?: string | null;
  reminderSent?: boolean;
  signedTransaction?: string | null;
  estimatedGasPrice?: string | null;
  nonce?: number | null;
  chainId?: number | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduledPaymentRequest {
  creatorAddress: string;
  recipient: string;
  recipientUsername?: string;
  recipientName?: string;
  amount: string;
  tokenSymbol: string;
  scheduledAt: string;
  recurringInterval?: RecurringInterval;
  recurringEndDate?: string;
  description?: string;
  signedTransaction?: string;
  estimatedGasPrice?: string;
  nonce?: number;
  chainId?: number;
}

export interface UpdateScheduledPaymentRequest {
  recipient?: string;
  recipientUsername?: string;
  recipientName?: string;
  amount?: string;
  tokenSymbol?: string;
  scheduledAt?: string;
  recurringInterval?: RecurringInterval | null;
  recurringEndDate?: string | null;
  description?: string;
  signedTransaction?: string;
  estimatedGasPrice?: string;
  nonce?: number;
  chainId?: number;
}
