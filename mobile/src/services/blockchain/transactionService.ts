import { ethers, BigNumber } from 'ethers';
import { getProvider, getProviderWithFallback } from './ethereumProvider';
import type { Network } from '../../constants/rpcUrls';
import { getSigner, getActiveAccount, getAddress } from '../walletService';
import { markAccountPending, clearAccountPending } from '../state/transactionState';
import type { GasEstimate } from './gasEstimatorService';
import {
  getNextNonce,
  trackTransaction,
  canReplaceTransaction,
  createCancelTransactionData,
  createSpeedUpTransactionData,
  updateTransactionStatus,
  getPendingTransactions,
  type PendingTransaction,
} from './nonceManagerService';

export async function sendETH(to: string, amountEth: string, network?: Network): Promise<{ txHash: string; response: ethers.providers.TransactionResponse; receipt?: ethers.providers.TransactionReceipt }> {
  const signer = await getSigner(network);
  const active = await getActiveAccount();
  const acctIndex = active?.index ?? 0;
  const value = ethers.utils.parseEther(amountEth);
  try {
    markAccountPending(acctIndex);
    const tx = await signer.sendTransaction({ to, value });
    // Optional: wait for one confirmation
    let receipt: ethers.providers.TransactionReceipt | undefined;
    try {
      receipt = await tx.wait(1);
    } catch (e) {
      // If wait fails or times out, return without receipt
      console.warn('Waiting for confirmation failed or timed out:', e);
    }
    return { txHash: tx.hash, response: tx, receipt };
  } finally {
    clearAccountPending(acctIndex);
  }
}

export async function estimateGas(to: string, amountEth: string, network?: Network): Promise<{ gasLimit: BigNumber; gasPrice: BigNumber; feeEth: string }> {
  const signer = await getSigner(network);
  const value = ethers.utils.parseEther(amountEth || '0');
  const tx = { to, value };
  const gasLimit = await signer.estimateGas(tx);
  const gasPrice = await signer.getGasPrice();
  const feeWei = gasLimit.mul(gasPrice);
  const feeEth = ethers.utils.formatEther(feeWei);
  return { gasLimit, gasPrice, feeEth };
}

export async function getTransactionStatus(txHash: string, network?: Network): Promise<{ confirmed: boolean; receipt: ethers.providers.TransactionReceipt | null }> {
  try {
    const provider = getProvider(network);
    const receipt = await provider.getTransactionReceipt(txHash);
    return { confirmed: !!receipt && receipt.status === 1, receipt: receipt ?? null };
  } catch (error) {
    console.warn('Failed with cached provider, trying fallback...');
    const provider = await getProviderWithFallback(network);
    const receipt = await provider.getTransactionReceipt(txHash);
    return { confirmed: !!receipt && receipt.status === 1, receipt: receipt ?? null };
  }
}

// ============================================================================
// Advanced Transaction Functions with Nonce Management and Retry Logic
// ============================================================================

/**
 * Transaction status enumeration
 */
export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMING = 'confirming',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  REPLACED = 'replaced',
  CANCELLED = 'cancelled',
}

/**
 * Send transaction result with enhanced metadata
 */
export interface SendTransactionResult {
  hash: string;
  nonce: number;
  from: string;
  to: string;
  value: string; // in ETH
  gasEstimate: GasEstimate;
  status: TransactionStatus;
  timestamp: number;
  response: ethers.providers.TransactionResponse;
}

/**
 * Exponential backoff retry configuration
 */
interface RetryConfig {
  maxAttempts: number;
  initialDelay: number; // in ms
  maxDelay: number; // in ms
  backoffFactor: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
};

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute function with exponential backoff retry
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: Error | null = null;
  let delay = config.initialDelay;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      console.log(`[${operationName}] Attempt ${attempt}/${config.maxAttempts}`);
      return await fn();
    } catch (error: any) {
      lastError = error;
      console.warn(
        `[${operationName}] Attempt ${attempt} failed: ${error.message}`
      );

      // Don't retry on certain errors
      if (
        error.code === 'INSUFFICIENT_FUNDS' ||
        error.code === 'NONCE_EXPIRED' ||
        error.code === 'REPLACEMENT_UNDERPRICED' ||
        error.message?.includes('insufficient funds') ||
        error.message?.includes('nonce too low')
      ) {
        console.error(`[${operationName}] Non-retryable error, aborting`);
        throw error;
      }

      // If not last attempt, wait before retrying
      if (attempt < config.maxAttempts) {
        console.log(`[${operationName}] Retrying in ${delay}ms...`);
        await sleep(delay);
        delay = Math.min(delay * config.backoffFactor, config.maxDelay);
      }
    }
  }

  console.error(
    `[${operationName}] All ${config.maxAttempts} attempts failed`
  );
  throw lastError || new Error(`${operationName} failed after ${config.maxAttempts} attempts`);
}

/**
 * Send ETH with advanced features:
 * - Nonce management
 * - Gas estimation integration
 * - Retry with exponential backoff
 * - Transaction tracking
 */
export async function sendETHAdvanced(
  to: string,
  amountEth: string,
  gasEstimate: GasEstimate,
  network?: Network
): Promise<SendTransactionResult> {
  const signer = await getSigner(network);
  const from = await getAddress();
  if (!from) throw new Error('No address available');

  const active = await getActiveAccount();
  const acctIndex = active?.index ?? 0;

  // Get next nonce
  const nonce = await getNextNonce(from, network);

  const value = ethers.utils.parseEther(amountEth);

  // Prepare transaction
  const txRequest: ethers.providers.TransactionRequest = {
    to,
    value,
    nonce,
    gasLimit: gasEstimate.gasLimit,
  };

  // Add gas price (EIP-1559 or legacy)
  if (gasEstimate.isEIP1559 && gasEstimate.maxFeePerGas && gasEstimate.maxPriorityFeePerGas) {
    txRequest.maxFeePerGas = gasEstimate.maxFeePerGas;
    txRequest.maxPriorityFeePerGas = gasEstimate.maxPriorityFeePerGas;
    txRequest.type = 2; // EIP-1559
  } else if (gasEstimate.gasPrice) {
    txRequest.gasPrice = gasEstimate.gasPrice;
    txRequest.type = 0; // Legacy
  } else {
    throw new Error('Invalid gas estimate: no gas price provided');
  }

  try {
    markAccountPending(acctIndex);

    // Send transaction with retry
    const response = await withRetry(
      async () => await signer.sendTransaction(txRequest),
      DEFAULT_RETRY_CONFIG,
      'sendETHAdvanced'
    );

    // Track transaction in nonce manager
    await trackTransaction(
      response.hash,
      nonce,
      from,
      to,
      value,
      gasEstimate.gasLimit,
      network || 'sepolia',
      gasEstimate.gasPrice,
      gasEstimate.maxFeePerGas,
      gasEstimate.maxPriorityFeePerGas
    );

    console.log(`✅ Transaction sent: ${response.hash}`);

    return {
      hash: response.hash,
      nonce,
      from,
      to,
      value: amountEth,
      gasEstimate,
      status: TransactionStatus.PENDING,
      timestamp: Date.now(),
      response,
    };
  } finally {
    clearAccountPending(acctIndex);
  }
}

/**
 * Cancel a pending transaction by replacing it with 0 ETH to self
 * with higher gas price
 */
export async function cancelTransaction(
  txHash: string,
  network?: Network
): Promise<SendTransactionResult> {
  // Check if transaction can be replaced
  const { canReplace, reason, transaction } = await canReplaceTransaction(txHash);

  if (!canReplace || !transaction) {
    throw new Error(reason || 'Cannot replace transaction');
  }

  const signer = await getSigner(network);
  const from = await getAddress();
  if (!from) throw new Error('No address available');

  // Create cancellation transaction data
  const cancelData = createCancelTransactionData(transaction);

  // Prepare transaction
  const txRequest: ethers.providers.TransactionRequest = {
    to: cancelData.to,
    value: cancelData.value,
    nonce: cancelData.nonce,
    gasLimit: cancelData.gasLimit,
  };

  // Add gas price
  if (cancelData.maxFeePerGas && cancelData.maxPriorityFeePerGas) {
    txRequest.maxFeePerGas = cancelData.maxFeePerGas;
    txRequest.maxPriorityFeePerGas = cancelData.maxPriorityFeePerGas;
    txRequest.type = 2;
  } else if (cancelData.gasPrice) {
    txRequest.gasPrice = cancelData.gasPrice;
    txRequest.type = 0;
  } else {
    throw new Error('No gas price data available');
  }

  const active = await getActiveAccount();
  const acctIndex = active?.index ?? 0;

  try {
    markAccountPending(acctIndex);

    // Send cancellation transaction with retry
    const response = await withRetry(
      async () => await signer.sendTransaction(txRequest),
      DEFAULT_RETRY_CONFIG,
      'cancelTransaction'
    );

    // Update original transaction status
    await updateTransactionStatus(txHash, 'replaced', response.hash);

    // Track cancellation transaction
    await trackTransaction(
      response.hash,
      cancelData.nonce,
      from,
      cancelData.to,
      cancelData.value,
      cancelData.gasLimit,
      network || 'sepolia',
      cancelData.gasPrice,
      cancelData.maxFeePerGas,
      cancelData.maxPriorityFeePerGas
    );

    console.log(`✅ Transaction cancelled: ${response.hash} (replaced ${txHash})`);

    // Create gas estimate for display
    const gasEstimate: GasEstimate = {
      gasLimit: cancelData.gasLimit,
      gasPrice: cancelData.gasPrice,
      maxFeePerGas: cancelData.maxFeePerGas,
      maxPriorityFeePerGas: cancelData.maxPriorityFeePerGas,
      totalFeeTH: ethers.utils.formatEther(
        cancelData.gasLimit.mul(cancelData.maxFeePerGas || cancelData.gasPrice || 0)
      ),
      isEIP1559: !!(cancelData.maxFeePerGas && cancelData.maxPriorityFeePerGas),
      level: 'custom',
    };

    return {
      hash: response.hash,
      nonce: cancelData.nonce,
      from,
      to: cancelData.to,
      value: '0',
      gasEstimate,
      status: TransactionStatus.PENDING,
      timestamp: Date.now(),
      response,
    };
  } finally {
    clearAccountPending(acctIndex);
  }
}

/**
 * Speed up a pending transaction by replacing it with same transaction
 * but higher gas price
 */
export async function speedUpTransaction(
  txHash: string,
  network?: Network
): Promise<SendTransactionResult> {
  // Check if transaction can be replaced
  const { canReplace, reason, transaction } = await canReplaceTransaction(txHash);

  if (!canReplace || !transaction) {
    throw new Error(reason || 'Cannot replace transaction');
  }

  const signer = await getSigner(network);
  const from = await getAddress();
  if (!from) throw new Error('No address available');

  // Create speed-up transaction data
  const speedUpData = createSpeedUpTransactionData(transaction);

  // Prepare transaction
  const txRequest: ethers.providers.TransactionRequest = {
    to: speedUpData.to,
    value: speedUpData.value,
    nonce: speedUpData.nonce,
    gasLimit: speedUpData.gasLimit,
  };

  // Add gas price
  if (speedUpData.maxFeePerGas && speedUpData.maxPriorityFeePerGas) {
    txRequest.maxFeePerGas = speedUpData.maxFeePerGas;
    txRequest.maxPriorityFeePerGas = speedUpData.maxPriorityFeePerGas;
    txRequest.type = 2;
  } else if (speedUpData.gasPrice) {
    txRequest.gasPrice = speedUpData.gasPrice;
    txRequest.type = 0;
  } else {
    throw new Error('No gas price data available');
  }

  const active = await getActiveAccount();
  const acctIndex = active?.index ?? 0;

  try {
    markAccountPending(acctIndex);

    // Send speed-up transaction with retry
    const response = await withRetry(
      async () => await signer.sendTransaction(txRequest),
      DEFAULT_RETRY_CONFIG,
      'speedUpTransaction'
    );

    // Update original transaction status
    await updateTransactionStatus(txHash, 'replaced', response.hash);

    // Track speed-up transaction
    await trackTransaction(
      response.hash,
      speedUpData.nonce,
      from,
      speedUpData.to,
      speedUpData.value,
      speedUpData.gasLimit,
      network || 'sepolia',
      speedUpData.gasPrice,
      speedUpData.maxFeePerGas,
      speedUpData.maxPriorityFeePerGas
    );

    console.log(`✅ Transaction sped up: ${response.hash} (replaced ${txHash})`);

    // Create gas estimate for display
    const gasEstimate: GasEstimate = {
      gasLimit: speedUpData.gasLimit,
      gasPrice: speedUpData.gasPrice,
      maxFeePerGas: speedUpData.maxFeePerGas,
      maxPriorityFeePerGas: speedUpData.maxPriorityFeePerGas,
      totalFeeTH: ethers.utils.formatEther(
        speedUpData.gasLimit.mul(speedUpData.maxFeePerGas || speedUpData.gasPrice || 0)
      ),
      isEIP1559: !!(speedUpData.maxFeePerGas && speedUpData.maxPriorityFeePerGas),
      level: 'custom',
    };

    return {
      hash: response.hash,
      nonce: speedUpData.nonce,
      from,
      to: speedUpData.to,
      value: transaction.value,
      gasEstimate,
      status: TransactionStatus.PENDING,
      timestamp: Date.now(),
      response,
    };
  } finally {
    clearAccountPending(acctIndex);
  }
}

/**
 * Get detailed transaction status with retry
 */
export async function getDetailedTransactionStatus(
  txHash: string,
  network?: Network
): Promise<{
  status: TransactionStatus;
  receipt: ethers.providers.TransactionReceipt | null;
  confirmations: number;
  blockNumber: number | null;
  gasUsed?: string;
  effectiveGasPrice?: string;
}> {
  try {
    const provider = getProvider(network);

    const receipt = await withRetry(
      async () => await provider.getTransactionReceipt(txHash),
      DEFAULT_RETRY_CONFIG,
      'getTransactionReceipt'
    );

    if (!receipt) {
      // Transaction not mined yet
      return {
        status: TransactionStatus.PENDING,
        receipt: null,
        confirmations: 0,
        blockNumber: null,
      };
    }

    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber + 1;

    let status: TransactionStatus;
    if (receipt.status === 0) {
      status = TransactionStatus.FAILED;
    } else if (confirmations >= 1) {
      status = TransactionStatus.CONFIRMED;
    } else {
      status = TransactionStatus.CONFIRMING;
    }

    // Update local transaction status
    await updateTransactionStatus(
      txHash,
      status === TransactionStatus.CONFIRMED ? 'confirmed' :
      status === TransactionStatus.FAILED ? 'failed' : 'pending'
    );

    return {
      status,
      receipt,
      confirmations,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
    };
  } catch (error) {
    console.warn('Failed with cached provider, trying fallback...');

    const provider = await getProviderWithFallback(network);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      return {
        status: TransactionStatus.PENDING,
        receipt: null,
        confirmations: 0,
        blockNumber: null,
      };
    }

    const currentBlock = await provider.getBlockNumber();
    const confirmations = currentBlock - receipt.blockNumber + 1;

    const status = receipt.status === 0 ? TransactionStatus.FAILED :
      confirmations >= 1 ? TransactionStatus.CONFIRMED : TransactionStatus.CONFIRMING;

    return {
      status,
      receipt,
      confirmations,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
    };
  }
}

/**
 * Get all pending transactions for current user
 */
export async function getUserPendingTransactions(
  network?: Network
): Promise<PendingTransaction[]> {
  const address = await getAddress();
  if (!address) return [];

  return getPendingTransactions(address, network);
}

/**
 * Monitor transaction until confirmed or failed
 * Returns a promise that resolves when transaction is mined
 */
export async function waitForTransaction(
  txHash: string,
  network?: Network,
  confirmations: number = 1,
  timeoutMs: number = 60000
): Promise<ethers.providers.TransactionReceipt> {
  const provider = getProvider(network);
  const startTime = Date.now();

  while (true) {
    // Check timeout
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Transaction ${txHash} timeout after ${timeoutMs}ms`);
    }

    try {
      const receipt = await provider.getTransactionReceipt(txHash);

      if (receipt) {
        const currentBlock = await provider.getBlockNumber();
        const currentConfirmations = currentBlock - receipt.blockNumber + 1;

        if (currentConfirmations >= confirmations) {
          // Update status
          await updateTransactionStatus(
            txHash,
            receipt.status === 1 ? 'confirmed' : 'failed'
          );

          if (receipt.status === 0) {
            throw new Error(`Transaction ${txHash} failed`);
          }

          return receipt;
        }
      }

      // Wait 3 seconds before checking again
      await sleep(3000);
    } catch (error: any) {
      // If error is transaction failed, throw it
      if (error.message?.includes('failed')) {
        throw error;
      }

      // Otherwise, continue polling
      console.warn('Error checking transaction, will retry:', error.message);
      await sleep(3000);
    }
  }
}
