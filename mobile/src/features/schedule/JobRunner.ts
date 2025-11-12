/**
 * Job Runner for Scheduled Payments
 * 
 * Executes scheduled payments at their nextRunAt time
 */

import { ethers } from 'ethers';
import type {
  ScheduledPayment,
  ExecutionResult,
  PaymentStatus,
} from './types';
import { useScheduledPayments } from './store/scheduledSlice';
import { isValidAddress, sanitizeError } from './utils/validators';
import { computeNextRunAt } from './utils/time-helpers';

// ============================================================================
// Configuration
// ============================================================================

const TICK_INTERVAL_MS = 20 * 1000; // 20 seconds
const MIN_CONFIRMATIONS = 2;
const MAX_BACKOFF_MS = 24 * 60 * 60 * 1000; // 24 hours
const BASE_BACKOFF_MS = 15 * 60 * 1000; // 15 minutes

// ============================================================================
// Events
// ============================================================================

export type JobStatusEvent = {
  paymentId: string;
  status: PaymentStatus;
  txHash?: string;
  error?: string;
  timestamp: number;
};

type JobStatusListener = (event: JobStatusEvent) => void;

// ============================================================================
// Job Runner
// ============================================================================

export class JobRunner {
  private intervalId?: NodeJS.Timeout;
  private isRunning: boolean = false;
  private listeners: JobStatusListener[] = [];

  // Dependencies (injected for testability)
  private sendNative?: (params: any) => Promise<any>;
  private sendErc20?: (params: any) => Promise<any>;
  private getProvider?: (chainId: number) => ethers.providers.Provider;

  constructor(deps?: {
    sendNative?: (params: any) => Promise<any>;
    sendErc20?: (params: any) => Promise<any>;
    getProvider?: (chainId: number) => ethers.providers.Provider;
  }) {
    this.sendNative = deps?.sendNative;
    this.sendErc20 = deps?.sendErc20;
    this.getProvider = deps?.getProvider;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Start the job runner
   */
  start(): void {
    if (this.isRunning) {
      console.log('JobRunner: Already running');
      return;
    }

    console.log('JobRunner: Starting...');
    this.isRunning = true;

    // Run immediately
    this.tick();

    // Schedule periodic ticks
    this.intervalId = setInterval(() => {
      this.tick();
    }, TICK_INTERVAL_MS);

    console.log(`JobRunner: Started (interval: ${TICK_INTERVAL_MS}ms)`);
  }

  /**
   * Stop the job runner
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('JobRunner: Not running');
      return;
    }

    console.log('JobRunner: Stopping...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    console.log('JobRunner: Stopped');
  }

  /**
   * Execute one tick (check and run due payments)
   * 
   * @param now - Current timestamp (ms), defaults to Date.now()
   */
  async tick(now: number = Date.now()): Promise<void> {
    console.log(`JobRunner: Tick at ${new Date(now).toISOString()}`);

    try {
      // Get due payments
      const duePayments = useScheduledPayments.getState().getDuePayments(now);

      if (duePayments.length === 0) {
        console.log('JobRunner: No due payments');
        return;
      }

      console.log(`JobRunner: Found ${duePayments.length} due payment(s)`);

      // Execute each payment
      for (const payment of duePayments) {
        await this.executePayment(payment, now);
      }
    } catch (error) {
      console.error('JobRunner: Tick error:', error);
    }
  }

  /**
   * Subscribe to job status changes
   */
  onJobStatusChanged(listener: JobStatusListener): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // ==========================================================================
  // Execution
  // ==========================================================================

  /**
   * Execute a single payment
   */
  private async executePayment(
    payment: ScheduledPayment,
    now: number
  ): Promise<void> {
    const { id, chainId, asset, to, amountHuman } = payment;

    console.log(`JobRunner: Executing payment ${id}`);
    console.log(`  Chain: ${chainId}`);
    console.log(`  Asset: ${asset.type}`);
    console.log(`  To: ${to.slice(0, 10)}...`);
    console.log(`  Amount: ${amountHuman}`);

    // Update status to running
    this.updatePaymentStatus(id, 'running');

    try {
      // Step 1: Revalidate
      this.revalidate(payment);

      // Step 2: Get provider
      const provider = this.getProviderForChain(chainId);

      // Step 3: Compute gas fees
      const gasFees = await this.computeGasFees(payment, provider);

      // Step 4: Execute transaction
      const result = await this.sendTransaction(payment, gasFees);

      // Step 5: Wait for confirmations
      await this.waitForConfirmations(result.txHash!, provider);

      // Step 6: Handle success
      await this.handleSuccess(payment, result, now);

      console.log(`JobRunner: Payment ${id} executed successfully`);
      console.log(`  TX: ${result.txHash}`);
      console.log(`  Gas: ${result.gasUsed}`);
    } catch (error) {
      // Handle failure
      await this.handleFailure(payment, error as Error, now);

      console.error(`JobRunner: Payment ${id} failed:`, (error as Error).message);
    }
  }

  /**
   * Revalidate payment before execution
   */
  private revalidate(payment: ScheduledPayment): void {
    // Validate address
    if (!isValidAddress(payment.to)) {
      throw new Error('Invalid recipient address');
    }

    // Validate chain ID (basic check)
    if (![1, 11155111, 17000].includes(payment.chainId)) {
      throw new Error(`Unsupported chain ID: ${payment.chainId}`);
    }

    // Validate asset
    if (payment.asset.type === 'ERC20' && !payment.asset.tokenAddress) {
      throw new Error('Token address required for ERC20');
    }
  }

  /**
   * Get provider for chain
   */
  private getProviderForChain(
    chainId: number
  ): ethers.providers.Provider {
    if (this.getProvider) {
      return this.getProvider(chainId);
    }

    // Fallback: use public RPC
    const rpcUrls: Record<number, string> = {
      1: 'https://ethereum-rpc.publicnode.com',
      11155111: 'https://rpc.sepolia.org',
      17000: 'https://ethereum-holesky-rpc.publicnode.com',
    };

    const rpcUrl = rpcUrls[chainId];
    if (!rpcUrl) {
      throw new Error(`No RPC URL for chain ${chainId}`);
    }

    return new ethers.providers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Compute gas fees with caps
   */
  private async computeGasFees(
    payment: ScheduledPayment,
    provider: ethers.providers.Provider
  ): Promise<{
    maxFeePerGas: ethers.BigNumber;
    maxPriorityFeePerGas: ethers.BigNumber;
  }> {
    // Get current fees
    const feeData = await provider.getFeeData();

    let maxFeePerGas = feeData.maxFeePerGas || ethers.BigNumber.from(0);
    let maxPriorityFeePerGas =
      feeData.maxPriorityFeePerGas || ethers.BigNumber.from(0);

    // Apply caps if set
    if (payment.maxFeePerGasCap) {
      const cap = ethers.BigNumber.from(payment.maxFeePerGasCap);
      if (maxFeePerGas.gt(cap)) {
        console.log(`JobRunner: Capping maxFeePerGas to ${cap.toString()}`);
        maxFeePerGas = cap;
      }
    }

    if (payment.maxPriorityFeePerGasCap) {
      const cap = ethers.BigNumber.from(payment.maxPriorityFeePerGasCap);
      if (maxPriorityFeePerGas.gt(cap)) {
        console.log(
          `JobRunner: Capping maxPriorityFeePerGas to ${cap.toString()}`
        );
        maxPriorityFeePerGas = cap;
      }
    }

    return { maxFeePerGas, maxPriorityFeePerGas };
  }

  /**
   * Send transaction
   */
  private async sendTransaction(
    payment: ScheduledPayment,
    gasFees: {
      maxFeePerGas: ethers.BigNumber;
      maxPriorityFeePerGas: ethers.BigNumber;
    }
  ): Promise<ExecutionResult> {
    const { asset, to, amountHuman } = payment;

    // ETH transfer
    if (asset.type === 'ETH') {
      if (!this.sendNative) {
        throw new Error('sendNative not configured');
      }

      const tx = await this.sendNative({
        to,
        amount: amountHuman,
        chainId: payment.chainId,
        maxFeePerGas: gasFees.maxFeePerGas.toString(),
        maxPriorityFeePerGas: gasFees.maxPriorityFeePerGas.toString(),
      });

      return {
        success: true,
        txHash: tx.hash,
        timestamp: Date.now(),
      };
    }

    // ERC20 transfer
    if (asset.type === 'ERC20') {
      if (!this.sendErc20) {
        throw new Error('sendErc20 not configured');
      }

      // TODO: Add callStatic check for ERC20
      // const provider = this.getProviderForChain(payment.chainId);
      // const tokenContract = new ethers.Contract(
      //   asset.tokenAddress!,
      //   ['function transfer(address to, uint256 amount) returns (bool)'],
      //   provider
      // );
      // await tokenContract.callStatic.transfer(to, amount);

      const tx = await this.sendErc20({
        tokenAddress: asset.tokenAddress,
        to,
        amount: amountHuman,
        chainId: payment.chainId,
        maxFeePerGas: gasFees.maxFeePerGas.toString(),
        maxPriorityFeePerGas: gasFees.maxPriorityFeePerGas.toString(),
      });

      return {
        success: true,
        txHash: tx.hash,
        timestamp: Date.now(),
      };
    }

    throw new Error(`Unsupported asset type: ${asset.type}`);
  }

  /**
   * Wait for transaction confirmations
   */
  private async waitForConfirmations(
    txHash: string,
    provider: ethers.providers.Provider
  ): Promise<void> {
    console.log(
      `JobRunner: Waiting for ${MIN_CONFIRMATIONS} confirmations...`
    );

    const receipt = await provider.waitForTransaction(
      txHash,
      MIN_CONFIRMATIONS
    );

    if (receipt.status !== 1) {
      throw new Error('Transaction failed');
    }

    console.log(`JobRunner: Transaction confirmed in block ${receipt.blockNumber}`);
  }

  /**
   * Handle successful execution
   */
  private async handleSuccess(
    payment: ScheduledPayment,
    result: ExecutionResult,
    now: number
  ): Promise<void> {
    const store = useScheduledPayments.getState();

    // One-time: mark as completed
    if (payment.kind === 'one_time') {
      store._updatePaymentStatus(payment.id, {
        status: 'completed',
        lastRunAt: now,
        runCount: payment.runCount + 1,
        nextRunAt: undefined,
      });

      this.emitEvent({
        paymentId: payment.id,
        status: 'completed',
        txHash: result.txHash,
        timestamp: now,
      });

      return;
    }

    // Recurring: compute next run
    if (payment.kind === 'recurring') {
      const updated = {
        ...payment,
        status: 'scheduled' as PaymentStatus,
        lastRunAt: now,
        runCount: payment.runCount + 1,
        failCount: 0, // Reset fail count on success
        consecutiveInsufficientFunds: 0, // Reset consecutive insufficient funds
        lastError: undefined,
      };

      updated.nextRunAt = computeNextRunAt(updated);

      store._updatePaymentStatus(payment.id, updated);

      this.emitEvent({
        paymentId: payment.id,
        status: 'scheduled',
        txHash: result.txHash,
        timestamp: now,
      });
    }
  }

  /**
   * Handle failed execution
   * 
   * Handles:
   * - Exponential backoff
   * - Insufficient funds detection
   * - Auto-pause after 3 consecutive insufficient funds errors
   */
  private async handleFailure(
    payment: ScheduledPayment,
    error: Error,
    now: number
  ): Promise<void> {
    const store = useScheduledPayments.getState();
    const failCount = payment.failCount + 1;

    // Sanitize error
    const sanitizedError = sanitizeError(error.message);

    // Check if error is "insufficient funds"
    const isInsufficientFunds = this.isInsufficientFundsError(error);

    // Track consecutive insufficient funds errors
    const consecutiveInsufficientFunds = isInsufficientFunds
      ? (payment.consecutiveInsufficientFunds || 0) + 1
      : 0;

    // Auto-pause after 3 consecutive insufficient funds errors
    const shouldAutoPause = consecutiveInsufficientFunds >= 3;

    if (shouldAutoPause) {
      console.log(
        `JobRunner: Auto-pausing payment ${payment.id} due to insufficient funds (${consecutiveInsufficientFunds} consecutive failures)`
      );

      store._updatePaymentStatus(payment.id, {
        status: 'paused',
        failCount,
        lastError: sanitizedError,
        consecutiveInsufficientFunds,
        autoPausedAt: now,
        nextRunAt: undefined, // Clear next run
      });

      this.emitEvent({
        paymentId: payment.id,
        status: 'paused',
        error: `Auto-paused: ${sanitizedError}`,
        timestamp: now,
      });

      return;
    }

    // Compute backoff
    const backoffMs = Math.min(
      Math.pow(2, failCount) * BASE_BACKOFF_MS,
      MAX_BACKOFF_MS
    );

    const nextRunAt = now + backoffMs;

    console.log(`JobRunner: Scheduling retry in ${backoffMs / 1000}s`);

    store._updatePaymentStatus(payment.id, {
      status: 'failed',
      failCount,
      lastError: sanitizedError,
      consecutiveInsufficientFunds,
      nextRunAt,
    });

    this.emitEvent({
      paymentId: payment.id,
      status: 'failed',
      error: sanitizedError,
      timestamp: now,
    });
  }

  /**
   * Check if error is "insufficient funds"
   */
  private isInsufficientFundsError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('insufficient funds') ||
      message.includes('insufficient balance') ||
      message.includes('not enough') ||
      message.includes('exceeds balance') ||
      message.includes('underpriced')
    );
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  /**
   * Update payment status
   */
  private updatePaymentStatus(id: string, status: PaymentStatus): void {
    useScheduledPayments.getState()._updatePaymentStatus(id, { status });
  }

  /**
   * Emit event to listeners
   */
  private emitEvent(event: JobStatusEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('JobRunner: Listener error:', error);
      }
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let jobRunnerInstance: JobRunner | null = null;

/**
 * Get or create job runner instance
 */
export function getJobRunner(): JobRunner {
  if (!jobRunnerInstance) {
    // Lazy import to avoid circular dependencies
    const { sendETH } = require('../../services/blockchain/transactionService');
    const { getProvider } = require('../../services/blockchain/ethereumProvider');
    
    // Wrap sendETH to match expected interface
    const sendNative = async (params: any) => {
      const { to, amount, chainId } = params;
      // amount is already in ETH string format from JobRunner
      const network = chainId === 1 ? 'mainnet' : chainId === 11155111 ? 'sepolia' : 'holesky';
      const result = await sendETH(to, amount, network as any);
      
      // Return expected format with hash property
      return {
        hash: result.txHash || result.hash,
        ...result
      };
    };
    
    jobRunnerInstance = new JobRunner({
      sendNative,
      getProvider: (chainId: number) => {
        const network = chainId === 1 ? 'mainnet' : chainId === 11155111 ? 'sepolia' : 'holesky';
        return getProvider(network as any);
      },
    });
  }
  return jobRunnerInstance;
}

/**
 * Set job runner instance (for testing)
 */
export function setJobRunner(instance: JobRunner): void {
  jobRunnerInstance = instance;
}
