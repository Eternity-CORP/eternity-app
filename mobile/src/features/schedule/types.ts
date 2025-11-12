/**
 * Scheduled Payments Domain Model
 * 
 * Types for one-time and recurring payments
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Payment schedule type
 */
export type ScheduledKind = 'one_time' | 'recurring';

/**
 * Asset type for payment
 */
export type AssetType = 'ETH' | 'ERC20';

/**
 * Payment status
 */
export type PaymentStatus = 
  | 'scheduled'   // Waiting to run
  | 'running'     // Currently executing
  | 'paused'      // Temporarily paused by user
  | 'failed'      // Last execution failed
  | 'completed';  // Finished (one-time only)

/**
 * Asset information
 */
export interface Asset {
  type: AssetType;
  tokenAddress?: string; // Required for ERC20
}

/**
 * Scheduled Payment
 * 
 * Represents a one-time or recurring payment
 */
export interface ScheduledPayment {
  // Identity
  id: string;                        // UUID
  kind: ScheduledKind;
  
  // Network & Asset
  chainId: number;                   // Network to execute on (1=mainnet, 11155111=sepolia)
  asset: Asset;
  
  // Accounts
  fromAccountId: string;             // Source wallet ID
  to: string;                        // EIP-55 checksum address
  
  // Amount
  amountHuman: string;               // Human-readable amount (e.g., "1.5")
  
  // Timing
  createdAt: number;                 // Unix timestamp (ms)
  scheduleAt?: number;               // Unix timestamp (ms) for one_time
  rrule?: string;                    // RFC5545 RRULE for recurring
  tz: string;                        // IANA timezone (e.g., "Europe/Moscow")
  exDates?: number[];                // Excluded dates (Unix ms) - skip these occurrences
  
  // Gas Limits (optional safety caps)
  maxFeePerGasCap?: string;          // Max total fee per gas (wei)
  maxPriorityFeePerGasCap?: string;  // Max priority fee per gas (wei)
  
  // Metadata
  note?: string;                     // User note
  
  // Execution State
  status: PaymentStatus;
  lastRunAt?: number;                // Last execution timestamp (ms)
  nextRunAt?: number;                // Next scheduled execution (ms)
  runCount: number;                  // Total successful executions
  failCount: number;                 // Total failed executions
  lastError?: string;                // Last error message (sanitized)
  consecutiveInsufficientFunds?: number; // Consecutive "insufficient funds" failures
  autoPausedAt?: number;             // Timestamp when auto-paused due to insufficient funds
}

// ============================================================================
// Creation Types
// ============================================================================

/**
 * Input for creating a new scheduled payment
 */
export interface CreateScheduledPaymentInput {
  kind: ScheduledKind;
  chainId: number;
  asset: Asset;
  fromAccountId: string;
  to: string;
  amountHuman: string;
  scheduleAt?: number;               // Required for one_time
  rrule?: string;                    // Required for recurring
  tz: string;
  exDates?: number[];                // Optional excluded dates
  maxFeePerGasCap?: string;
  maxPriorityFeePerGasCap?: string;
  note?: string;
}

/**
 * Input for updating a scheduled payment
 */
export interface UpdateScheduledPaymentInput {
  id: string;
  amountHuman?: string;
  scheduleAt?: number;
  rrule?: string;
  tz?: string;
  exDates?: number[];
  maxFeePerGasCap?: string;
  maxPriorityFeePerGasCap?: string;
  note?: string;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validation error
 */
export class ScheduledPaymentValidationError extends Error {
  constructor(
    message: string,
    public errors: string[]
  ) {
    super(message);
    this.name = 'ScheduledPaymentValidationError';
  }
}

// ============================================================================
// Query Types
// ============================================================================

/**
 * Filter for querying scheduled payments
 */
export interface ScheduledPaymentFilter {
  kind?: ScheduledKind;
  status?: PaymentStatus;
  chainId?: number;
  fromAccountId?: string;
  dueBefore?: number;                // Find payments due before timestamp
}

/**
 * Sort options
 */
export type ScheduledPaymentSortBy = 
  | 'createdAt'
  | 'nextRunAt'
  | 'lastRunAt';

export interface ScheduledPaymentSort {
  by: ScheduledPaymentSortBy;
  order: 'asc' | 'desc';
}

// ============================================================================
// Execution Types
// ============================================================================

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  gasUsed?: string;
  timestamp: number;
}

/**
 * Execution context
 */
export interface ExecutionContext {
  payment: ScheduledPayment;
  dryRun?: boolean;                  // If true, don't actually send transaction
}

// ============================================================================
// Statistics Types
// ============================================================================

/**
 * Payment statistics
 */
export interface PaymentStatistics {
  total: number;
  byStatus: Record<PaymentStatus, number>;
  byKind: Record<ScheduledKind, number>;
  totalExecutions: number;
  totalFailures: number;
  successRate: number;
}

// All types are already exported inline above
