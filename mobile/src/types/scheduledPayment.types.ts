import type { Network } from '../config/env';

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
  /**
   * Network on which the payment should be executed.
   * Captured at creation time to ensure consistency.
   * @since v1.1.0
   */
  network?: Network;
}
