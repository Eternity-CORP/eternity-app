/**
 * Wallet Transaction Functions
 *
 * High-level transaction API for sending native ETH with:
 * - Address validation (EIP-55)
 * - Balance checking
 * - Automatic gas estimation
 * - Nonce management
 * - Transaction confirmation tracking
 * - Human-readable error messages
 *
 * Uses ethers v5.7.2 API
 */

import { ethers, BigNumber } from 'ethers';
import type { Network } from '../config/env';
import { getSigner } from '../services/walletService';
import { getETHBalance } from '../services/blockchain/balanceService';
import { getAddress } from './account';
import {
  estimateGasForETH,
  validateGasEstimate,
  createCustomGasEstimate,
  type GasEstimate,
  type GasFeeLevel,
} from '../services/blockchain/gasEstimatorService';
import {
  sendETHAdvanced,
  waitForTransaction,
  getDetailedTransactionStatus,
  TransactionStatus,
  type SendTransactionResult,
} from '../services/blockchain/transactionService';

// ============================================================================
// Types
// ============================================================================

export interface SendNativeParams {
  /** Recipient address (will be validated with EIP-55 checksum) */
  to: string;
  
  /** Amount in ETH (e.g., "0.001") */
  amountEther: string;
  
  /** Optional: Max fee per gas (EIP-1559). If not provided, will be estimated */
  maxFeePerGas?: BigNumber;
  
  /** Optional: Max priority fee per gas (EIP-1559). If not provided, will be estimated */
  maxPriorityFeePerGas?: BigNumber;
  
  /** Optional: Gas limit. If not provided, will be estimated */
  gasLimit?: BigNumber;
  
  /** Optional: Legacy gas price (for non-EIP-1559 networks) */
  gasPrice?: BigNumber;
  
  /** Optional: Gas fee level (low/medium/high). Default: medium */
  feeLevel?: GasFeeLevel;
  
  /** Optional: Network to send on */
  network?: Network;
}

export interface SendNativeResult {
  /** Transaction hash */
  hash: string;
  
  /** Transaction nonce */
  nonce: number;
  
  /** Sender address */
  from: string;
  
  /** Recipient address */
  to: string;
  
  /** Amount sent in ETH */
  value: string;
  
  /** Gas estimate used */
  gasEstimate: GasEstimate;
  
  /** Current transaction status */
  status: TransactionStatus;
  
  /** Timestamp when transaction was sent */
  timestamp: number;
  
  /** Full transaction response from provider */
  response: ethers.providers.TransactionResponse;
}

export interface WaitForConfirmationsParams {
  /** Transaction hash to monitor */
  hash: string;
  
  /** Minimum confirmations required (default: 2) */
  minConfirms?: number;
  
  /** Timeout in milliseconds (default: 120000 = 2 minutes) */
  timeoutMs?: number;
  
  /** Optional: Network */
  network?: Network;
  
  /** Optional: Callback for status updates */
  onStatusUpdate?: (status: {
    confirmations: number;
    status: TransactionStatus;
    blockNumber: number | null;
  }) => void;
}

export interface ConfirmationResult {
  /** Transaction receipt */
  receipt: ethers.providers.TransactionReceipt;
  
  /** Final status */
  status: TransactionStatus;
  
  /** Number of confirmations */
  confirmations: number;
  
  /** Block number where transaction was mined */
  blockNumber: number;
  
  /** Gas used */
  gasUsed: string;
  
  /** Effective gas price */
  effectiveGasPrice?: string;
}

// ============================================================================
// Error Classes
// ============================================================================

export class TransactionError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

export class InsufficientFundsError extends TransactionError {
  constructor(required: string, available: string) {
    super(
      `Insufficient funds. Required: ${required} ETH, Available: ${available} ETH`,
      'INSUFFICIENT_FUNDS',
      { required, available }
    );
    this.name = 'InsufficientFundsError';
  }
}

export class InvalidAddressError extends TransactionError {
  constructor(address: string) {
    super(
      `Invalid Ethereum address: ${address}`,
      'INVALID_ADDRESS',
      { address }
    );
    this.name = 'InvalidAddressError';
  }
}

export class InvalidAmountError extends TransactionError {
  constructor(amount: string, reason: string) {
    super(
      `Invalid amount: ${amount}. ${reason}`,
      'INVALID_AMOUNT',
      { amount, reason }
    );
    this.name = 'InvalidAmountError';
  }
}

export class TransactionTimeoutError extends TransactionError {
  constructor(hash: string, timeoutMs: number) {
    super(
      `Transaction ${hash} timed out after ${timeoutMs}ms`,
      'TRANSACTION_TIMEOUT',
      { hash, timeoutMs }
    );
    this.name = 'TransactionTimeoutError';
  }
}

export class TransactionFailedError extends TransactionError {
  constructor(hash: string, reason?: string) {
    super(
      `Transaction ${hash} failed${reason ? `: ${reason}` : ''}`,
      'TRANSACTION_FAILED',
      { hash, reason }
    );
    this.name = 'TransactionFailedError';
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate Ethereum address with EIP-55 checksum
 * @throws InvalidAddressError if address is invalid
 */
function validateAddress(address: string, network?: Network): string {
  try {
    return ethers.utils.getAddress(address);
  } catch (error) {
    throw new InvalidAddressError(address);
  }
}

/**
 * Validate and parse amount
 * @throws InvalidAmountError if amount is invalid
 */
function validateAmount(amountEther: string): BigNumber {
  try {
    const amount = ethers.utils.parseEther(amountEther);
    
    if (amount.lte(0)) {
      throw new InvalidAmountError(amountEther, 'Amount must be greater than 0');
    }
    
    return amount;
  } catch (error: any) {
    if (error instanceof InvalidAmountError) {
      throw error;
    }
    throw new InvalidAmountError(amountEther, 'Invalid number format');
  }
}

/**
 * Parse RPC error and return human-readable message
 */
function parseRpcError(error: any): TransactionError {
  const message = error.message || error.toString();
  
  // Insufficient funds
  if (
    error.code === 'INSUFFICIENT_FUNDS' ||
    message.includes('insufficient funds') ||
    message.includes('insufficient balance')
  ) {
    return new TransactionError(
      'Insufficient funds for transaction + gas',
      'INSUFFICIENT_FUNDS',
      error
    );
  }
  
  // Nonce too low
  if (
    error.code === 'NONCE_EXPIRED' ||
    message.includes('nonce too low') ||
    message.includes('nonce has already been used')
  ) {
    return new TransactionError(
      'Transaction nonce too low. Another transaction may have been sent.',
      'NONCE_TOO_LOW',
      error
    );
  }
  
  // Replacement underpriced
  if (
    error.code === 'REPLACEMENT_UNDERPRICED' ||
    message.includes('replacement transaction underpriced') ||
    message.includes('transaction underpriced')
  ) {
    return new TransactionError(
      'Gas price too low. Try increasing the gas price.',
      'UNDERPRICED',
      error
    );
  }
  
  // Gas limit too low
  if (
    message.includes('intrinsic gas too low') ||
    message.includes('gas limit too low')
  ) {
    return new TransactionError(
      'Gas limit too low for this transaction',
      'GAS_LIMIT_TOO_LOW',
      error
    );
  }
  
  // Network error
  if (
    error.code === 'NETWORK_ERROR' ||
    message.includes('network') ||
    message.includes('timeout')
  ) {
    return new TransactionError(
      'Network error. Please check your connection and try again.',
      'NETWORK_ERROR',
      error
    );
  }
  
  // Generic error
  return new TransactionError(
    message || 'Transaction failed',
    error.code || 'UNKNOWN_ERROR',
    error
  );
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Send native ETH with comprehensive validation and error handling
 * 
 * @example
 * ```typescript
 * const result = await sendNative({
 *   to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
 *   amountEther: "0.001",
 *   feeLevel: "medium"
 * });
 * 
 * console.log(`Transaction sent: ${result.hash}`);
 * ```
 */
export async function sendNative(params: SendNativeParams): Promise<SendNativeResult> {
  const {
    to,
    amountEther,
    maxFeePerGas,
    maxPriorityFeePerGas,
    gasLimit,
    gasPrice,
    feeLevel = 'medium',
    network,
  } = params;
  
  console.log('📤 Sending native ETH transaction...');
  console.log(`  To: ${to}`);
  console.log(`  Amount: ${amountEther} ETH`);
  console.log(`  Fee Level: ${feeLevel}`);
  
  // Step 1: Validate recipient address (EIP-55)
  const validatedTo = validateAddress(to);
  console.log(`✅ Address validated: ${validatedTo}`);
  
  // Step 2: Validate amount
  const amountWei = validateAmount(amountEther);
  console.log(`✅ Amount validated: ${ethers.utils.formatEther(amountWei)} ETH`);
  
  // Step 3: Get sender address
  const from = await getAddress();
  if (!from) {
    throw new TransactionError('No wallet address available', 'NO_ADDRESS');
  }
  console.log(`  From: ${from}`);
  
  // Step 4: Check balance
  const balance = await getETHBalance(from, network);
  console.log(`  Balance: ${ethers.utils.formatEther(balance)} ETH`);
  
  // Step 5: Estimate gas or use provided values
  let gasEstimate: GasEstimate;
  
  if (gasLimit && (maxFeePerGas || gasPrice)) {
    // Use custom gas parameters
    console.log('⚙️  Using custom gas parameters');
    gasEstimate = createCustomGasEstimate(
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      gasPrice
    );
  } else {
    // Estimate gas automatically
    console.log('⚙️  Estimating gas...');
    const feeOptions = await estimateGasForETH(validatedTo, amountEther, network);
    
    // Use specified fee level or default to medium
    // Note: 'custom' is not available in auto-estimation, use medium instead
    const selectedLevel = feeLevel === 'custom' ? 'medium' : feeLevel;
    gasEstimate = feeOptions[selectedLevel];
    
    console.log(`  Gas Limit: ${gasEstimate.gasLimit.toString()}`);
    console.log(`  Total Fee: ${gasEstimate.totalFeeTH} ETH`);
  }
  
  // Step 6: Validate balance is sufficient
  const validation = await validateGasEstimate(
    gasEstimate,
    ethers.utils.formatEther(balance),
    amountEther,
    network
  );
  
  if (!validation.isValid || !validation.hasEnoughBalance) {
    const totalRequired = amountWei.add(ethers.utils.parseEther(gasEstimate.totalFeeTH));
    throw new InsufficientFundsError(
      ethers.utils.formatEther(totalRequired),
      ethers.utils.formatEther(balance)
    );
  }
  
  if (validation.warning) {
    console.warn(`⚠️  ${validation.warning}`);
  }
  
  // Step 7: Send transaction
  try {
    console.log('🚀 Sending transaction...');
    const result = await sendETHAdvanced(validatedTo, amountEther, gasEstimate, network);
    
    console.log(`✅ Transaction sent successfully!`);
    console.log(`  Hash: ${result.hash}`);
    console.log(`  Nonce: ${result.nonce}`);
    
    return result;
  } catch (error: any) {
    console.error('❌ Transaction failed:', error);
    throw parseRpcError(error);
  }
}

/**
 * Wait for transaction confirmations with status updates
 * 
 * @example
 * ```typescript
 * const confirmation = await waitForConfirmations({
 *   hash: "0x123...",
 *   minConfirms: 2,
 *   timeoutMs: 120000,
 *   onStatusUpdate: (status) => {
 *     console.log(`Confirmations: ${status.confirmations}`);
 *   }
 * });
 * 
 * console.log(`Transaction confirmed in block ${confirmation.blockNumber}`);
 * ```
 */
export async function waitForConfirmations(
  params: WaitForConfirmationsParams
): Promise<ConfirmationResult> {
  const {
    hash,
    minConfirms = 2,
    timeoutMs = 120000, // 2 minutes default
    network,
    onStatusUpdate,
  } = params;
  
  console.log(`⏳ Waiting for ${minConfirms} confirmation(s) for ${hash}...`);
  
  const startTime = Date.now();
  const checkInterval = 3000; // Check every 3 seconds
  
  while (true) {
    // Check timeout
    const elapsed = Date.now() - startTime;
    if (elapsed > timeoutMs) {
      throw new TransactionTimeoutError(hash, timeoutMs);
    }
    
    try {
      // Get transaction status
      const status = await getDetailedTransactionStatus(hash, network);
      
      // Call status update callback
      if (onStatusUpdate) {
        onStatusUpdate({
          confirmations: status.confirmations,
          status: status.status,
          blockNumber: status.blockNumber,
        });
      }
      
      console.log(
        `  Status: ${status.status}, Confirmations: ${status.confirmations}/${minConfirms}`
      );
      
      // Check if transaction failed
      if (status.status === TransactionStatus.FAILED) {
        throw new TransactionFailedError(hash, 'Transaction reverted');
      }
      
      // Check if we have enough confirmations
      if (status.confirmations >= minConfirms && status.receipt) {
        console.log(`✅ Transaction confirmed with ${status.confirmations} confirmation(s)`);
        
        return {
          receipt: status.receipt,
          status: status.status,
          confirmations: status.confirmations,
          blockNumber: status.blockNumber!,
          gasUsed: status.gasUsed!,
          effectiveGasPrice: status.effectiveGasPrice,
        };
      }
      
      // Wait before next check
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    } catch (error: any) {
      // If it's our custom error, rethrow
      if (
        error instanceof TransactionTimeoutError ||
        error instanceof TransactionFailedError
      ) {
        throw error;
      }
      
      // Otherwise, log and continue polling
      console.warn('Error checking transaction status, will retry:', error.message);
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }
  }
}

/**
 * Send native ETH and wait for confirmations in one call
 * Convenience function that combines sendNative + waitForConfirmations
 * 
 * @example
 * ```typescript
 * const { result, confirmation } = await sendNativeAndWait({
 *   to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
 *   amountEther: "0.001",
 *   minConfirms: 2,
 *   onStatusUpdate: (status) => {
 *     console.log(`Status: ${status.status}, Confirmations: ${status.confirmations}`);
 *   }
 * });
 * ```
 */
export async function sendNativeAndWait(
  params: SendNativeParams & Omit<WaitForConfirmationsParams, 'hash'>
): Promise<{
  result: SendNativeResult;
  confirmation: ConfirmationResult;
}> {
  // Send transaction
  const result = await sendNative(params);
  
  // Wait for confirmations
  const confirmation = await waitForConfirmations({
    hash: result.hash,
    minConfirms: params.minConfirms,
    timeoutMs: params.timeoutMs,
    network: params.network,
    onStatusUpdate: params.onStatusUpdate,
  });
  
  return { result, confirmation };
}

// Export types
export type { GasEstimate, GasFeeLevel };
export { TransactionStatus };
