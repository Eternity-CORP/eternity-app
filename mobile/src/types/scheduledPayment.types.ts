export interface ScheduledPayment {
  id: string;
  recipientAddress: string;
  recipientName?: string;
  amount: string;
  currency: 'ETH';
  message?: string;
  emoji?: string;
  scheduledFor: number; // timestamp
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: number;
  executedAt?: number;
  txHash?: string;
  errorMessage?: string;
  notificationId?: string;
}
