/**
 * Validators for Scheduled Payments
 * 
 * Validates addresses, amounts, networks, and payment configurations
 */

import { ethers } from 'ethers';
import type {
  CreateScheduledPaymentInput,
  UpdateScheduledPaymentInput,
  ValidationResult,
  Asset,
} from '../types';
import { validateSchedule } from './time-helpers';

// ============================================================================
// Supported Networks
// ============================================================================

const SUPPORTED_CHAIN_IDS = [
  1,          // Mainnet
  11155111,   // Sepolia
  17000,      // Holesky
];

// ============================================================================
// Address Validation
// ============================================================================

/**
 * Validate Ethereum address
 * 
 * @param address - Address to validate
 * @returns True if valid EIP-55 checksum address
 */
export function isValidAddress(address: string): boolean {
  try {
    // Check if valid address
    if (!ethers.utils.isAddress(address)) {
      return false;
    }

    // Check checksum
    const checksumAddress = ethers.utils.getAddress(address);
    return checksumAddress === address;
  } catch {
    return false;
  }
}

/**
 * Convert address to checksum format
 * 
 * @param address - Address to convert
 * @returns Checksum address or null if invalid
 */
export function toChecksumAddress(address: string): string | null {
  try {
    return ethers.utils.getAddress(address);
  } catch {
    return null;
  }
}

// ============================================================================
// Amount Validation
// ============================================================================

/**
 * Validate amount string
 * 
 * @param amountHuman - Human-readable amount
 * @returns True if valid positive number
 */
export function isValidAmount(amountHuman: string): boolean {
  try {
    // Parse as float
    const amount = parseFloat(amountHuman);

    // Check if valid number
    if (isNaN(amount) || !isFinite(amount)) {
      return false;
    }

    // Check if positive
    if (amount <= 0) {
      return false;
    }

    // Check if reasonable (not too many decimals)
    const parts = amountHuman.split('.');
    if (parts.length > 1 && parts[1].length > 18) {
      return false; // Max 18 decimals (wei precision)
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Parse amount to BigNumber
 * 
 * @param amountHuman - Human-readable amount
 * @param decimals - Token decimals (18 for ETH)
 * @returns BigNumber or null if invalid
 */
export function parseAmount(
  amountHuman: string,
  decimals: number = 18
): ethers.BigNumber | null {
  try {
    return ethers.utils.parseUnits(amountHuman, decimals);
  } catch {
    return null;
  }
}

// ============================================================================
// Network Validation
// ============================================================================

/**
 * Check if chain ID is supported
 * 
 * @param chainId - Chain ID
 * @returns True if supported
 */
export function isSupportedChainId(chainId: number): boolean {
  return SUPPORTED_CHAIN_IDS.includes(chainId);
}

/**
 * Get network name
 * 
 * @param chainId - Chain ID
 * @returns Network name
 */
export function getNetworkName(chainId: number): string {
  switch (chainId) {
    case 1:
      return 'Mainnet';
    case 11155111:
      return 'Sepolia';
    case 17000:
      return 'Holesky';
    default:
      return `Unknown (${chainId})`;
  }
}

// ============================================================================
// Asset Validation
// ============================================================================

/**
 * Validate asset configuration
 * 
 * @param asset - Asset to validate
 * @returns Validation errors (empty if valid)
 */
export function validateAsset(asset: Asset): string[] {
  const errors: string[] = [];

  // Check asset type
  if (asset.type !== 'ETH' && asset.type !== 'ERC20') {
    errors.push(`Invalid asset type: ${asset.type}`);
  }

  // ERC20 must have token address
  if (asset.type === 'ERC20') {
    if (!asset.tokenAddress) {
      errors.push('tokenAddress is required for ERC20 assets');
    } else if (!isValidAddress(asset.tokenAddress)) {
      errors.push('Invalid tokenAddress (must be EIP-55 checksum)');
    }
  }

  // ETH should not have token address
  if (asset.type === 'ETH' && asset.tokenAddress) {
    errors.push('tokenAddress should not be set for ETH');
  }

  return errors;
}

// ============================================================================
// Gas Cap Validation
// ============================================================================

/**
 * Validate gas cap string
 * 
 * @param gasCap - Gas cap in wei (as string)
 * @returns True if valid
 */
export function isValidGasCap(gasCap: string): boolean {
  try {
    const bn = ethers.BigNumber.from(gasCap);
    return bn.gt(0);
  } catch {
    return false;
  }
}

// ============================================================================
// Create Input Validation
// ============================================================================

/**
 * Validate create scheduled payment input
 * 
 * @param input - Create input
 * @returns Validation result
 */
export function validateCreateInput(
  input: CreateScheduledPaymentInput
): ValidationResult {
  const errors: string[] = [];

  // Validate kind
  if (input.kind !== 'one_time' && input.kind !== 'recurring') {
    errors.push(`Invalid kind: ${input.kind}`);
  }

  // Validate chain ID
  if (!isSupportedChainId(input.chainId)) {
    errors.push(`Unsupported chain ID: ${input.chainId}`);
  }

  // Validate asset
  errors.push(...validateAsset(input.asset));

  // Validate recipient address
  if (!isValidAddress(input.to)) {
    errors.push('Invalid recipient address (must be EIP-55 checksum)');
  }

  // Validate amount
  if (!isValidAmount(input.amountHuman)) {
    errors.push('Invalid amount (must be positive number)');
  }

  // Validate schedule
  errors.push(
    ...validateSchedule(
      input.kind,
      input.scheduleAt,
      input.rrule,
      input.tz
    )
  );

  // Validate gas caps (if provided)
  if (input.maxFeePerGasCap && !isValidGasCap(input.maxFeePerGasCap)) {
    errors.push('Invalid maxFeePerGasCap');
  }

  if (input.maxPriorityFeePerGasCap && !isValidGasCap(input.maxPriorityFeePerGasCap)) {
    errors.push('Invalid maxPriorityFeePerGasCap');
  }

  // Validate note length
  if (input.note && input.note.length > 500) {
    errors.push('Note too long (max 500 characters)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Update Input Validation
// ============================================================================

/**
 * Validate update scheduled payment input
 * 
 * @param input - Update input
 * @returns Validation result
 */
export function validateUpdateInput(
  input: UpdateScheduledPaymentInput
): ValidationResult {
  const errors: string[] = [];

  // ID is required
  if (!input.id) {
    errors.push('ID is required');
  }

  // Validate amount (if provided)
  if (input.amountHuman !== undefined && !isValidAmount(input.amountHuman)) {
    errors.push('Invalid amount (must be positive number)');
  }

  // Validate gas caps (if provided)
  if (input.maxFeePerGasCap && !isValidGasCap(input.maxFeePerGasCap)) {
    errors.push('Invalid maxFeePerGasCap');
  }

  if (input.maxPriorityFeePerGasCap && !isValidGasCap(input.maxPriorityFeePerGasCap)) {
    errors.push('Invalid maxPriorityFeePerGasCap');
  }

  // Validate note length (if provided)
  if (input.note && input.note.length > 500) {
    errors.push('Note too long (max 500 characters)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Sanitization
// ============================================================================

/**
 * Sanitize error message (remove private data)
 * 
 * @param error - Error message
 * @returns Sanitized error message
 */
export function sanitizeError(error: string): string {
  // Remove private keys
  let sanitized = error.replace(/0x[a-fA-F0-9]{64}/g, '0x***');

  // Remove full addresses (keep first 10 chars)
  sanitized = sanitized.replace(
    /0x[a-fA-F0-9]{40}/g,
    (match) => match.slice(0, 10) + '...'
  );

  // Remove large numbers that might be balances
  sanitized = sanitized.replace(/\d{15,}/g, '***');

  return sanitized;
}

/**
 * Sanitize payment for logging
 * 
 * @param payment - Payment to sanitize
 * @returns Sanitized payment (safe for logs)
 */
export function sanitizePaymentForLog(payment: any): any {
  return {
    id: payment.id,
    kind: payment.kind,
    chainId: payment.chainId,
    asset: payment.asset,
    to: payment.to ? payment.to.slice(0, 10) + '...' : undefined,
    amountHuman: payment.amountHuman,
    status: payment.status,
    nextRunAt: payment.nextRunAt,
    runCount: payment.runCount,
    failCount: payment.failCount,
    // Omit: fromAccountId, rrule details, error messages
  };
}
