/**
 * Split Bill Types
 * 
 * Domain model for splitting bills with equal/weighted shares,
 * tips, and rounding strategies.
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Split mode
 */
export type SplitMode = 'equal' | 'weighted';

/**
 * Rounding strategy for smallest units
 */
export type RoundingMode = 'floor' | 'ceil' | 'bankers';

/**
 * Payment status for participant
 */
export type PayStatus = 'pending' | 'paid' | 'failed';

/**
 * Asset type
 */
export interface Asset {
  type: 'ETH' | 'ERC20';
  tokenAddress?: string;
  symbol?: string;
  decimals?: number;
}

/**
 * Split participant
 */
export interface SplitParticipant {
  id: string;                    // Unique ID
  address: string;               // EIP-55 checksum address
  weight?: number;               // Weight for weighted mode (default: 1)
  payStatus: PayStatus;          // Payment status
  txHash?: string;               // Transaction hash if paid
  amountSmallestUnit?: string;   // Calculated amount in smallest units (wei/token units)
  note?: string;                 // Optional note (e.g., contact name)
}

/**
 * Split bill
 */
export interface SplitBill {
  // Identity
  id: string;
  
  // Network & Asset
  chainId: number;
  asset: Asset;
  
  // Amounts
  totalHuman: string;            // Total amount in human-readable format (e.g., "100.50")
  tipPercent?: number;           // Tip percentage (0-100)
  
  // Split Configuration
  mode: SplitMode;
  participants: SplitParticipant[];
  rounding: RoundingMode;
  
  // Remainder Distribution
  remainderStrategy: 'first' | 'topN' | 'none';
  remainderTopN?: number;        // For 'topN' strategy
  
  // Metadata
  createdAt: number;
  updatedAt?: number;
  note?: string;
  
  // Computed (cached)
  totalWithTipSmallestUnit?: string;  // Total + tip in smallest units
  remainderSmallestUnit?: string;     // Remainder after rounding
}

// ============================================================================
// Input Types
// ============================================================================

/**
 * Input for creating a split bill
 */
export interface CreateSplitBillInput {
  chainId: number;
  asset: Asset;
  totalHuman: string;
  tipPercent?: number;
  mode: SplitMode;
  participants: Array<{
    address: string;
    weight?: number;
    note?: string;
  }>;
  rounding?: RoundingMode;
  remainderStrategy?: 'first' | 'topN' | 'none';
  remainderTopN?: number;
  note?: string;
}

/**
 * Input for updating participant status
 */
export interface UpdateParticipantStatusInput {
  billId: string;
  participantId: string;
  payStatus: PayStatus;
  txHash?: string;
}

// ============================================================================
// Calculation Types
// ============================================================================

/**
 * Split calculation result
 */
export interface SplitCalculation {
  // Per-participant amounts
  participantAmounts: Array<{
    participantId: string;
    amountSmallestUnit: string;
    amountHuman: string;
  }>;
  
  // Totals
  totalWithTipSmallestUnit: string;
  totalWithTipHuman: string;
  
  // Rounding
  remainderSmallestUnit: string;
  remainderRecipients: string[];  // Participant IDs who received remainder
  
  // Validation
  sumMatches: boolean;  // Sum of shares + remainder = total with tip
}

/**
 * Calculation config
 */
export interface CalculationConfig {
  totalHuman: string;
  tipPercent: number;
  mode: SplitMode;
  participants: Array<{
    id: string;
    weight?: number;
  }>;
  rounding: RoundingMode;
  remainderStrategy: 'first' | 'topN' | 'none';
  remainderTopN?: number;
  decimals: number;  // Token decimals (18 for ETH)
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
export class SplitBillValidationError extends Error {
  constructor(
    message: string,
    public errors: string[]
  ) {
    super(message);
    this.name = 'SplitBillValidationError';
  }
}

// ============================================================================
// Store Types
// ============================================================================

/**
 * Split bills store state
 */
export interface SplitBillsState {
  // Data
  bills: Record<string, SplitBill>;
  
  // Actions
  addBill: (input: CreateSplitBillInput) => SplitBill;
  updateParticipantStatus: (input: UpdateParticipantStatusInput) => void;
  deleteBill: (billId: string) => void;
  getBill: (billId: string) => SplitBill | undefined;
  getAllBills: () => SplitBill[];
  getPendingBills: () => SplitBill[];
  
  // Internal
  _hydrate: (bills: Record<string, SplitBill>) => void;
}

// All types are already exported inline, no need for re-export
