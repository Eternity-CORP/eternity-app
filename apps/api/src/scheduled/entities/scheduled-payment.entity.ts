/**
 * ScheduledPayment interface
 * Represents a scheduled payment in the database
 */

export type ScheduledPaymentStatus = 'pending' | 'executed' | 'cancelled' | 'failed';
export type RecurringInterval = 'daily' | 'weekly' | 'monthly';

export interface ScheduledPayment {
  id: string;
  creatorAddress: string;
  recipient: string;
  recipientUsername: string | null;
  recipientName: string | null;
  amount: string;
  tokenSymbol: string;
  scheduledAt: Date;
  recurringInterval: RecurringInterval | null;
  recurringEndDate: Date | null;
  description: string | null;
  status: ScheduledPaymentStatus;
  executedTxHash: string | null;
  executedAt: Date | null;
  reminderSent: boolean;
  signedTransaction: string | null;
  estimatedGasPrice: string | null;
  nonce: number | null;
  chainId: number | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}
