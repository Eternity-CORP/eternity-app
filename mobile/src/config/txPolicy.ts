/**
 * Transaction Policy Configuration
 * 
 * Centralized retry policies and error handling for:
 * - Scheduled payments
 * - Split bill payments
 * - Regular transactions
 */

import { BigNumber } from 'ethers';

// ============================================================================
// Types
// ============================================================================

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'exponential' | 'linear' | 'fixed';
  baseDelayMs: number;
  maxDelayMs: number;
  feeBumpMultiplier?: number;      // For fee-related retries
  retryableErrors: string[];       // Error codes to retry
}

export interface ScheduledPaymentRetryPolicy extends RetryPolicy {
  pauseAfterFailures: number;      // Pause job after N consecutive failures
  notifyOnFailure: boolean;        // Send notification on failure
}

export interface SplitPaymentRetryPolicy extends RetryPolicy {
  maxRetriesPerParticipant: number;
  feeBumpMultiplier: number;       // Increase fee on retry
}

// ============================================================================
// Retry Policies
// ============================================================================

/**
 * Scheduled Payment Retry Policy
 * 
 * - Exponential backoff
 * - Up to 5 attempts
 * - Pause after 3 consecutive failures
 */
export const SCHEDULED_PAYMENT_RETRY_POLICY: ScheduledPaymentRetryPolicy = {
  maxAttempts: 5,
  backoffStrategy: 'exponential',
  baseDelayMs: 60000,              // 1 minute
  maxDelayMs: 3600000,             // 1 hour
  pauseAfterFailures: 3,
  notifyOnFailure: true,
  retryableErrors: [
    'INSUFFICIENT_FUNDS',
    'NONCE_TOO_LOW',
    'REPLACEMENT_UNDERPRICED',
    'NETWORK_ERROR',
    'TIMEOUT',
    'GAS_PRICE_TOO_LOW',
  ],
};

/**
 * Split Payment Retry Policy
 * 
 * - Up to 2 retries per participant
 * - Fee bump by 12.5% on retry
 * - Fixed delay between retries
 */
export const SPLIT_PAYMENT_RETRY_POLICY: SplitPaymentRetryPolicy = {
  maxAttempts: 3,                  // 1 initial + 2 retries
  maxRetriesPerParticipant: 2,
  backoffStrategy: 'fixed',
  baseDelayMs: 5000,               // 5 seconds
  maxDelayMs: 10000,               // 10 seconds
  feeBumpMultiplier: 1.125,        // 12.5% increase
  retryableErrors: [
    'INSUFFICIENT_FUNDS',
    'NONCE_TOO_LOW',
    'REPLACEMENT_UNDERPRICED',
    'NETWORK_ERROR',
    'TIMEOUT',
  ],
};

/**
 * Regular Transaction Retry Policy
 * 
 * - Up to 3 attempts
 * - Linear backoff
 */
export const REGULAR_TRANSACTION_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoffStrategy: 'linear',
  baseDelayMs: 2000,               // 2 seconds
  maxDelayMs: 10000,               // 10 seconds
  feeBumpMultiplier: 1.1,          // 10% increase
  retryableErrors: [
    'NONCE_TOO_LOW',
    'REPLACEMENT_UNDERPRICED',
    'NETWORK_ERROR',
    'TIMEOUT',
  ],
};

// ============================================================================
// Backoff Calculation
// ============================================================================

/**
 * Calculate retry delay based on backoff strategy
 */
export function calculateRetryDelay(
  attempt: number,
  policy: RetryPolicy
): number {
  let delay: number;
  
  switch (policy.backoffStrategy) {
    case 'exponential':
      // 2^attempt * baseDelay
      delay = Math.pow(2, attempt - 1) * policy.baseDelayMs;
      break;
      
    case 'linear':
      // attempt * baseDelay
      delay = attempt * policy.baseDelayMs;
      break;
      
    case 'fixed':
      // Always baseDelay
      delay = policy.baseDelayMs;
      break;
      
    default:
      delay = policy.baseDelayMs;
  }
  
  // Cap at maxDelay
  return Math.min(delay, policy.maxDelayMs);
}

/**
 * Calculate fee bump for retry
 */
export function calculateFeeBump(
  originalFee: BigNumber,
  attempt: number,
  multiplier: number = 1.125
): BigNumber {
  // Compound fee bump: fee * (multiplier ^ attempt)
  const bumpFactor = Math.pow(multiplier, attempt);
  const bumpFactorScaled = Math.floor(bumpFactor * 1000);
  
  return originalFee.mul(bumpFactorScaled).div(1000);
}

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Check if error is retryable
 */
export function isRetryableError(
  errorCode: string,
  policy: RetryPolicy
): boolean {
  return policy.retryableErrors.includes(errorCode);
}

/**
 * Check if should retry based on attempt count
 */
export function shouldRetry(
  attempt: number,
  errorCode: string,
  policy: RetryPolicy
): boolean {
  if (attempt >= policy.maxAttempts) {
    return false;
  }
  
  return isRetryableError(errorCode, policy);
}

// ============================================================================
// Retry History
// ============================================================================

export interface RetryAttempt {
  attempt: number;
  timestamp: number;
  errorCode: string;
  errorMessage: string;
  delayMs: number;
  feeBump?: string;                // Fee bump applied (if any)
}

export interface RetryHistory {
  totalAttempts: number;
  attempts: RetryAttempt[];
  lastAttempt?: RetryAttempt;
  nextRetryAt?: number;            // Timestamp of next retry
}

/**
 * Create retry history tracker
 */
export function createRetryHistory(): RetryHistory {
  return {
    totalAttempts: 0,
    attempts: [],
  };
}

/**
 * Record retry attempt
 */
export function recordRetryAttempt(
  history: RetryHistory,
  attempt: RetryAttempt
): RetryHistory {
  return {
    ...history,
    totalAttempts: history.totalAttempts + 1,
    attempts: [...history.attempts, attempt],
    lastAttempt: attempt,
    nextRetryAt: Date.now() + attempt.delayMs,
  };
}

// ============================================================================
// Policy Helpers
// ============================================================================

/**
 * Get retry policy for context
 */
export function getRetryPolicy(
  context: 'scheduled' | 'split' | 'regular'
): RetryPolicy {
  switch (context) {
    case 'scheduled':
      return SCHEDULED_PAYMENT_RETRY_POLICY;
    case 'split':
      return SPLIT_PAYMENT_RETRY_POLICY;
    case 'regular':
      return REGULAR_TRANSACTION_RETRY_POLICY;
  }
}

/**
 * Format retry delay for display
 */
export function formatRetryDelay(delayMs: number): string {
  const seconds = Math.floor(delayMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
