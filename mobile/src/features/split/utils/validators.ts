/**
 * Split Bill Validators
 * 
 * Validation functions for split bills:
 * - EIP-55 address validation
 * - Amount validation
 * - Participant validation
 * - No private data in errors
 */

import { ethers } from 'ethers';
import type {
  CreateSplitBillInput,
  ValidationResult,
  SplitBillValidationError,
} from '../types';

// ============================================================================
// Address Validation
// ============================================================================

/**
 * Validate Ethereum address (EIP-55 checksum)
 * 
 * @param address - Address to validate
 * @returns True if valid
 */
export function isValidAddress(address: string): boolean {
  try {
    // Check if valid address format
    if (!ethers.utils.isAddress(address)) {
      return false;
    }

    // Check EIP-55 checksum
    const checksummed = ethers.utils.getAddress(address);
    
    // If address has mixed case, verify checksum
    if (address !== address.toLowerCase() && address !== address.toUpperCase()) {
      return address === checksummed;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get checksummed address (EIP-55)
 * 
 * @param address - Address to checksum
 * @returns Checksummed address
 */
export function getChecksumAddress(address: string): string {
  try {
    return ethers.utils.getAddress(address);
  } catch (error) {
    throw new Error('Invalid address format');
  }
}

// ============================================================================
// Amount Validation
// ============================================================================

/**
 * Validate amount string
 * 
 * @param amount - Amount in human format
 * @param decimals - Token decimals
 * @returns Validation result
 */
export function validateAmount(
  amount: string,
  decimals: number = 18
): ValidationResult {
  const errors: string[] = [];

  // Check if empty
  if (!amount || amount.trim() === '') {
    errors.push('Amount is required');
    return { valid: false, errors };
  }

  // Check if valid number
  if (isNaN(Number(amount))) {
    errors.push('Amount must be a valid number');
    return { valid: false, errors };
  }

  // Check if positive
  if (Number(amount) <= 0) {
    errors.push('Amount must be greater than zero');
    return { valid: false, errors };
  }

  // Check if parseable to smallest units
  try {
    ethers.utils.parseUnits(amount, decimals);
  } catch {
    errors.push('Amount has too many decimal places');
    return { valid: false, errors };
  }

  return { valid: true, errors: [] };
}

// ============================================================================
// Participant Validation
// ============================================================================

/**
 * Validate participant
 * 
 * @param participant - Participant to validate
 * @returns Validation result
 */
export function validateParticipant(participant: {
  address: string;
  weight?: number;
}): ValidationResult {
  const errors: string[] = [];

  // Validate address
  if (!isValidAddress(participant.address)) {
    errors.push('Invalid Ethereum address');
  }

  // Validate weight
  if (participant.weight !== undefined) {
    if (participant.weight <= 0) {
      errors.push('Weight must be greater than zero');
    }
    if (!Number.isFinite(participant.weight)) {
      errors.push('Weight must be a finite number');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate all participants
 * 
 * @param participants - Participants to validate
 * @returns Validation result
 */
export function validateParticipants(
  participants: Array<{ address: string; weight?: number }>
): ValidationResult {
  const errors: string[] = [];

  // Check if empty
  if (participants.length === 0) {
    errors.push('At least one participant is required');
    return { valid: false, errors };
  }

  // Validate each participant
  participants.forEach((p, index) => {
    const result = validateParticipant(p);
    if (!result.valid) {
      errors.push(`Participant ${index + 1}: ${result.errors.join(', ')}`);
    }
  });

  // Check for duplicate addresses
  const addresses = participants.map((p) => p.address.toLowerCase());
  const uniqueAddresses = new Set(addresses);
  if (addresses.length !== uniqueAddresses.size) {
    errors.push('Duplicate participant addresses found');
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// Split Bill Validation
// ============================================================================

/**
 * Validate create split bill input
 * 
 * @param input - Input to validate
 * @returns Validation result
 */
export function validateCreateSplitBillInput(
  input: CreateSplitBillInput
): ValidationResult {
  const errors: string[] = [];

  // Validate chain ID
  if (![1, 11155111, 17000].includes(input.chainId)) {
    errors.push('Unsupported chain ID');
  }

  // Validate asset
  if (input.asset.type === 'ERC20' && !input.asset.tokenAddress) {
    errors.push('Token address required for ERC20');
  }

  if (input.asset.type === 'ERC20' && input.asset.tokenAddress) {
    if (!isValidAddress(input.asset.tokenAddress)) {
      errors.push('Invalid token address');
    }
  }

  // Validate total amount
  const decimals = input.asset.decimals || 18;
  const amountResult = validateAmount(input.totalHuman, decimals);
  if (!amountResult.valid) {
    errors.push(...amountResult.errors);
  }

  // Validate tip
  if (input.tipPercent !== undefined) {
    if (input.tipPercent < 0 || input.tipPercent > 100) {
      errors.push('Tip percent must be between 0 and 100');
    }
  }

  // Validate participants
  const participantsResult = validateParticipants(input.participants);
  if (!participantsResult.valid) {
    errors.push(...participantsResult.errors);
  }

  // Validate weights for weighted mode
  if (input.mode === 'weighted') {
    const hasWeights = input.participants.every((p) => p.weight !== undefined);
    if (!hasWeights) {
      errors.push('All participants must have weights in weighted mode');
    }
  }

  // Validate remainder strategy
  if (input.remainderStrategy === 'topN') {
    if (!input.remainderTopN || input.remainderTopN < 1) {
      errors.push('remainderTopN must be at least 1 for topN strategy');
    } else if (input.remainderTopN > input.participants.length) {
      errors.push('remainderTopN cannot exceed number of participants');
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate and throw if invalid
 * 
 * @param input - Input to validate
 * @throws SplitBillValidationError if invalid
 */
export function validateAndThrow(input: CreateSplitBillInput): void {
  const result = validateCreateSplitBillInput(input);
  if (!result.valid) {
    const error = new Error('Validation failed') as SplitBillValidationError;
    error.name = 'SplitBillValidationError';
    error.errors = result.errors;
    throw error;
  }
}

// ============================================================================
// Error Sanitization
// ============================================================================

/**
 * Sanitize error message (remove private data)
 * 
 * @param message - Error message
 * @returns Sanitized message
 */
export function sanitizeError(message: string): string {
  // Remove addresses (0x...)
  let sanitized = message.replace(/0x[a-fA-F0-9]{40}/g, '0x...');
  
  // Remove private keys (if accidentally logged)
  sanitized = sanitized.replace(/0x[a-fA-F0-9]{64}/g, '0x...');
  
  // Remove transaction hashes
  sanitized = sanitized.replace(/0x[a-fA-F0-9]{64}/g, '0x...');
  
  return sanitized;
}

/**
 * Sanitize validation errors
 * 
 * @param errors - Error messages
 * @returns Sanitized errors
 */
export function sanitizeErrors(errors: string[]): string[] {
  return errors.map(sanitizeError);
}
