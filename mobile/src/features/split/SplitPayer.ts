/**
 * Split Bill Payer
 * 
 * Sequential payment processor for split bills with:
 * - Nonce management (sequential sends)
 * - Transaction confirmation tracking
 * - Retry logic on failures
 * - Progress tracking
 * - Cancellation support
 */

import { ethers } from 'ethers';
import type { Network } from '../../config/env';
import { sendNative, waitForConfirmations } from '../../wallet/transactions';
import type { SplitBill, SplitParticipant } from './types';
import { useSplitBills } from './store/splitBillsSlice';

// ============================================================================
// Types
// ============================================================================

export interface PaymentQueueItem {
  participantId: string;
  address: string;
  amountSmallestUnit: string;
  amountHuman: string;
  status: 'pending' | 'processing' | 'confirming' | 'completed' | 'failed';
  txHash?: string;
  error?: string;
  attempts: number;
  startedAt?: number;
  completedAt?: number;
}

export interface PaymentProgress {
  billId: string;
  total: number;
  completed: number;
  failed: number;
  current?: PaymentQueueItem;
  queue: PaymentQueueItem[];
  isRunning: boolean;
  isPaused: boolean;
  isCancelled: boolean;
}

export interface PayAllParams {
  billId: string;
  network?: Network;
  minConfirmations?: number;
  maxRetries?: number;
  onProgress?: (progress: PaymentProgress) => void;
}

export interface PaySelectedParams {
  billId: string;
  participantIds: string[];
  network?: Network;
  minConfirmations?: number;
  maxRetries?: number;
  onProgress?: (progress: PaymentProgress) => void;
}

// ============================================================================
// Mutex for Sequential Sends
// ============================================================================

class NonceManager {
  private isLocked = false;
  private queue: Array<() => Promise<void>> = [];

  /**
   * Acquire lock for sequential transaction sending
   */
  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isLocked) {
        this.isLocked = true;
        resolve();
      } else {
        this.queue.push(() => {
          resolve();
          return Promise.resolve();
        });
      }
    });
  }

  /**
   * Release lock and process next in queue
   */
  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.isLocked = false;
    }
  }

  /**
   * Check if locked
   */
  isAcquired(): boolean {
    return this.isLocked;
  }
}

// Global nonce manager instance
const nonceManager = new NonceManager();

// ============================================================================
// Split Payer Class
// ============================================================================

export class SplitPayer {
  private billId: string;
  private network?: Network;
  private minConfirmations: number;
  private maxRetries: number;
  private onProgress?: (progress: PaymentProgress) => void;

  private queue: PaymentQueueItem[] = [];
  private isRunning = false;
  private isPaused = false;
  private isCancelled = false;

  constructor(params: PayAllParams | PaySelectedParams) {
    this.billId = params.billId;
    this.network = params.network;
    this.minConfirmations = params.minConfirmations || 2;
    this.maxRetries = params.maxRetries || 3;
    this.onProgress = params.onProgress;
  }

  /**
   * Pay all pending participants
   */
  static async payAll(params: PayAllParams): Promise<PaymentProgress> {
    const payer = new SplitPayer(params);
    return payer.execute('all');
  }

  /**
   * Pay selected participants
   */
  static async paySelected(params: PaySelectedParams): Promise<PaymentProgress> {
    const payer = new SplitPayer(params);
    return payer.execute('selected', params.participantIds);
  }

  /**
   * Execute payment queue
   */
  private async execute(
    mode: 'all' | 'selected',
    participantIds?: string[]
  ): Promise<PaymentProgress> {
    // Get bill
    const bill = useSplitBills.getState().getBill(this.billId);
    if (!bill) {
      throw new Error(`Bill not found: ${this.billId}`);
    }

    // Build queue
    this.buildQueue(bill, mode, participantIds);

    // Start processing
    this.isRunning = true;
    this.emitProgress();

    try {
      await this.processQueue();
    } finally {
      this.isRunning = false;
      this.emitProgress();
    }

    return this.getProgress();
  }

  /**
   * Build payment queue from bill
   */
  private buildQueue(
    bill: SplitBill,
    mode: 'all' | 'selected',
    participantIds?: string[]
  ): void {
    const participants = bill.participants.filter((p) => {
      // Filter by mode
      if (mode === 'selected' && participantIds) {
        return participantIds.includes(p.id) && p.payStatus === 'pending';
      }
      return p.payStatus === 'pending';
    });

    this.queue = participants.map((p) => ({
      participantId: p.id,
      address: p.address,
      amountSmallestUnit: p.amountSmallestUnit || '0',
      amountHuman: ethers.utils.formatEther(p.amountSmallestUnit || '0'),
      status: 'pending',
      attempts: 0,
    }));

    console.log(`📋 Payment queue built: ${this.queue.length} participants`);
  }

  /**
   * Process payment queue sequentially
   */
  private async processQueue(): Promise<void> {
    for (const item of this.queue) {
      // Check cancellation
      if (this.isCancelled) {
        console.log('❌ Payment queue cancelled');
        break;
      }

      // Check pause
      while (this.isPaused && !this.isCancelled) {
        await this.sleep(1000);
      }

      // Process item
      await this.processItem(item);
    }
  }

  /**
   * Process single payment item
   */
  private async processItem(item: PaymentQueueItem): Promise<void> {
    console.log(`\n💸 Processing payment to ${item.address}`);
    console.log(`   Amount: ${item.amountHuman} ETH`);

    let lastError: Error | undefined;

    // Retry loop
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      item.attempts = attempt;

      try {
        // Acquire nonce lock
        await nonceManager.acquire();

        try {
          // Send transaction
          item.status = 'processing';
          item.startedAt = Date.now();
          this.emitProgress(item);

          console.log(`   Attempt ${attempt}/${this.maxRetries}`);

          const result = await sendNative({
            to: item.address,
            amountEther: item.amountHuman,
            feeLevel: 'medium',
            network: this.network,
          });

          item.txHash = result.hash;
          console.log(`   ✅ Transaction sent: ${result.hash}`);

          // Update store immediately with txHash
          this.updateParticipantStatus(item.participantId, 'pending', result.hash);

          // Wait for confirmations
          item.status = 'confirming';
          this.emitProgress(item);

          console.log(`   ⏳ Waiting for ${this.minConfirmations} confirmations...`);

          await waitForConfirmations({
            hash: result.hash,
            minConfirms: this.minConfirmations,
            network: this.network,
            onStatusUpdate: (status) => {
              console.log(`   📊 Confirmations: ${status.confirmations}/${this.minConfirmations}`);
            },
          });

          // Success!
          item.status = 'completed';
          item.completedAt = Date.now();
          this.updateParticipantStatus(item.participantId, 'paid', item.txHash);

          console.log(`   ✅ Payment confirmed!`);
          this.emitProgress(item);

          // Break retry loop on success
          break;

        } finally {
          // Always release nonce lock
          nonceManager.release();
        }

      } catch (error: any) {
        lastError = error;
        console.error(`   ❌ Attempt ${attempt} failed:`, error.message);

        // If last attempt, mark as failed
        if (attempt >= this.maxRetries) {
          item.status = 'failed';
          item.error = error.message;
          item.completedAt = Date.now();
          this.updateParticipantStatus(item.participantId, 'failed');

          console.log(`   ❌ Payment failed after ${this.maxRetries} attempts`);
          this.emitProgress(item);
        } else {
          // Wait before retry (exponential backoff)
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`   ⏳ Retrying in ${backoffMs}ms...`);
          await this.sleep(backoffMs);
        }
      }
    }

    // Log final result
    this.logPaymentResult(item);
  }

  /**
   * Update participant status in store
   */
  private updateParticipantStatus(
    participantId: string,
    payStatus: 'pending' | 'paid' | 'failed',
    txHash?: string
  ): void {
    useSplitBills.getState().updateParticipantStatus({
      billId: this.billId,
      participantId,
      payStatus,
      txHash,
    });
  }

  /**
   * Log payment result
   */
  private logPaymentResult(item: PaymentQueueItem): void {
    const duration = item.completedAt && item.startedAt
      ? ((item.completedAt - item.startedAt) / 1000).toFixed(1)
      : 'N/A';

    console.log(`\n📊 Payment Result:`);
    console.log(`   To: ${item.address}`);
    console.log(`   Amount: ${item.amountHuman} ETH`);
    console.log(`   Status: ${item.status}`);
    console.log(`   TxHash: ${item.txHash || 'N/A'}`);
    console.log(`   Attempts: ${item.attempts}`);
    console.log(`   Duration: ${duration}s`);
    if (item.error) {
      console.log(`   Error: ${item.error}`);
    }
  }

  /**
   * Get current progress
   */
  private getProgress(): PaymentProgress {
    const completed = this.queue.filter((i) => i.status === 'completed').length;
    const failed = this.queue.filter((i) => i.status === 'failed').length;
    const current = this.queue.find((i) => 
      i.status === 'processing' || i.status === 'confirming'
    );

    return {
      billId: this.billId,
      total: this.queue.length,
      completed,
      failed,
      current,
      queue: this.queue,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      isCancelled: this.isCancelled,
    };
  }

  /**
   * Emit progress update
   */
  private emitProgress(current?: PaymentQueueItem): void {
    if (this.onProgress) {
      this.onProgress(this.getProgress());
    }
  }

  /**
   * Pause payment queue
   */
  pause(): void {
    this.isPaused = true;
    console.log('⏸️  Payment queue paused');
  }

  /**
   * Resume payment queue
   */
  resume(): void {
    this.isPaused = false;
    console.log('▶️  Payment queue resumed');
  }

  /**
   * Cancel payment queue
   */
  cancel(): void {
    this.isCancelled = true;
    console.log('🛑 Payment queue cancelled');
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Pay all pending participants in a bill
 */
export async function payAllParticipants(
  params: PayAllParams
): Promise<PaymentProgress> {
  return SplitPayer.payAll(params);
}

/**
 * Pay selected participants in a bill
 */
export async function paySelectedParticipants(
  params: PaySelectedParams
): Promise<PaymentProgress> {
  return SplitPayer.paySelected(params);
}

/**
 * Get nonce manager status (for debugging)
 */
export function getNonceManagerStatus(): { isLocked: boolean } {
  return {
    isLocked: nonceManager.isAcquired(),
  };
}
