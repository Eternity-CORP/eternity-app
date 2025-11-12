/**
 * Unit Tests: Validators
 * 
 * Tests for validation functions:
 * - EIP-55 address validation
 * - Amount validation
 * - Participant validation
 * - Error sanitization
 */

import { describe, it, expect } from 'vitest';
import {
  isValidAddress,
  getChecksumAddress,
  validateAmount,
  validateParticipant,
  validateParticipants,
  validateCreateSplitBillInput,
  sanitizeError,
} from '../utils/validators';
import type { CreateSplitBillInput } from '../types';

describe('Address Validation', () => {
  describe('isValidAddress', () => {
    it('should accept valid checksummed address', () => {
      const address = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      expect(isValidAddress(address)).toBe(true);
    });

    it('should accept valid lowercase address', () => {
      const address = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
      expect(isValidAddress(address)).toBe(true);
    });

    it('should accept valid uppercase address', () => {
      const address = '0xF39FD6E51AAD88F6F4CE6AB8827279CFFFB92266';
      expect(isValidAddress(address)).toBe(true);
    });

    it('should reject invalid checksum', () => {
      // Wrong checksum (lowercase 'f' should be uppercase 'F')
      const address = '0xf39fd6e51aad88F6F4ce6aB8827279cffFb92266';
      expect(isValidAddress(address)).toBe(false);
    });

    it('should reject invalid length', () => {
      const address = '0x123';
      expect(isValidAddress(address)).toBe(false);
    });

    it('should reject non-hex characters', () => {
      const address = '0xg39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
      expect(isValidAddress(address)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidAddress('')).toBe(false);
    });
  });

  describe('getChecksumAddress', () => {
    it('should return checksummed address', () => {
      const address = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
      const checksummed = getChecksumAddress(address);
      expect(checksummed).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    });

    it('should throw on invalid address', () => {
      const address = 'invalid';
      expect(() => getChecksumAddress(address)).toThrow();
    });
  });
});

describe('Amount Validation', () => {
  describe('validateAmount', () => {
    it('should accept valid amount', () => {
      const result = validateAmount('100.50', 18);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept integer amount', () => {
      const result = validateAmount('100', 18);
      expect(result.valid).toBe(true);
    });

    it('should accept very small amount', () => {
      const result = validateAmount('0.000001', 18);
      expect(result.valid).toBe(true);
    });

    it('should reject empty amount', () => {
      const result = validateAmount('', 18);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Amount is required');
    });

    it('should reject zero amount', () => {
      const result = validateAmount('0', 18);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Amount must be greater than zero');
    });

    it('should reject negative amount', () => {
      const result = validateAmount('-10', 18);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Amount must be greater than zero');
    });

    it('should reject non-numeric amount', () => {
      const result = validateAmount('abc', 18);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Amount must be a valid number');
    });

    it('should reject too many decimals', () => {
      // 19 decimals, but token only has 18
      const result = validateAmount('1.0000000000000000001', 18);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Amount has too many decimal places');
    });

    it('should accept amount with exact decimals', () => {
      // Exactly 18 decimals
      const result = validateAmount('1.000000000000000000', 18);
      expect(result.valid).toBe(true);
    });

    it('should handle 6 decimals (USDC)', () => {
      const result = validateAmount('100.123456', 6);
      expect(result.valid).toBe(true);
    });

    it('should reject 7 decimals for USDC', () => {
      const result = validateAmount('100.1234567', 6);
      expect(result.valid).toBe(false);
    });
  });
});

describe('Participant Validation', () => {
  describe('validateParticipant', () => {
    it('should accept valid participant', () => {
      const result = validateParticipant({
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        weight: 1,
      });
      expect(result.valid).toBe(true);
    });

    it('should accept participant without weight', () => {
      const result = validateParticipant({
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid address', () => {
      const result = validateParticipant({
        address: 'invalid',
        weight: 1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid Ethereum address');
    });

    it('should reject zero weight', () => {
      const result = validateParticipant({
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        weight: 0,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Weight must be greater than zero');
    });

    it('should reject negative weight', () => {
      const result = validateParticipant({
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        weight: -1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Weight must be greater than zero');
    });

    it('should reject infinite weight', () => {
      const result = validateParticipant({
        address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        weight: Infinity,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Weight must be a finite number');
    });
  });

  describe('validateParticipants', () => {
    it('should accept valid participants', () => {
      const result = validateParticipants([
        { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', weight: 1 },
        { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', weight: 2 },
      ]);
      expect(result.valid).toBe(true);
    });

    it('should reject empty participants', () => {
      const result = validateParticipants([]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one participant is required');
    });

    it('should reject duplicate addresses', () => {
      const result = validateParticipants([
        { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', weight: 1 },
        { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', weight: 2 },
      ]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate participant addresses found');
    });

    it('should detect duplicate addresses case-insensitively', () => {
      const result = validateParticipants([
        { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', weight: 1 },
        { address: '0xF39FD6E51AAD88F6F4CE6AB8827279CFFFB92266', weight: 2 },
      ]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate participant addresses found');
    });
  });
});

describe('Split Bill Input Validation', () => {
  const validInput: CreateSplitBillInput = {
    chainId: 11155111,
    asset: { type: 'ETH', decimals: 18 },
    totalHuman: '100',
    tipPercent: 10,
    mode: 'equal',
    participants: [
      { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' },
      { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' },
    ],
    rounding: 'floor',
    remainderStrategy: 'first',
  };

  it('should accept valid input', () => {
    const result = validateCreateSplitBillInput(validInput);
    expect(result.valid).toBe(true);
  });

  it('should reject unsupported chain', () => {
    const input = { ...validInput, chainId: 999 };
    const result = validateCreateSplitBillInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Unsupported chain ID');
  });

  it('should reject ERC20 without token address', () => {
    const input = {
      ...validInput,
      asset: { type: 'ERC20' as const, decimals: 6 },
    };
    const result = validateCreateSplitBillInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Token address required for ERC20');
  });

  it('should reject invalid token address', () => {
    const input = {
      ...validInput,
      asset: { type: 'ERC20' as const, tokenAddress: 'invalid', decimals: 6 },
    };
    const result = validateCreateSplitBillInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid token address');
  });

  it('should reject invalid tip percent', () => {
    const input = { ...validInput, tipPercent: 150 };
    const result = validateCreateSplitBillInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Tip percent must be between 0 and 100');
  });

  it('should reject weighted mode without weights', () => {
    const input = {
      ...validInput,
      mode: 'weighted' as const,
      // participants don't have weights
    };
    const result = validateCreateSplitBillInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('All participants must have weights in weighted mode');
  });

  it('should accept weighted mode with weights', () => {
    const input = {
      ...validInput,
      mode: 'weighted' as const,
      participants: [
        { address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', weight: 2 },
        { address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', weight: 1 },
      ],
    };
    const result = validateCreateSplitBillInput(input);
    expect(result.valid).toBe(true);
  });

  it('should reject topN strategy without remainderTopN', () => {
    const input = {
      ...validInput,
      remainderStrategy: 'topN' as const,
      // missing remainderTopN
    };
    const result = validateCreateSplitBillInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('remainderTopN must be at least 1 for topN strategy');
  });

  it('should reject topN greater than participants', () => {
    const input = {
      ...validInput,
      remainderStrategy: 'topN' as const,
      remainderTopN: 5, // but only 2 participants
    };
    const result = validateCreateSplitBillInput(input);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('remainderTopN cannot exceed number of participants');
  });
});

describe('Error Sanitization', () => {
  it('should sanitize addresses', () => {
    const message = 'Error with address 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const sanitized = sanitizeError(message);
    expect(sanitized).toBe('Error with address 0x...');
  });

  it('should sanitize multiple addresses', () => {
    const message = 'Transfer from 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    const sanitized = sanitizeError(message);
    expect(sanitized).toBe('Transfer from 0x... to 0x...');
  });

  it('should sanitize transaction hashes', () => {
    const message = 'TX hash: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const sanitized = sanitizeError(message);
    expect(sanitized).toBe('TX hash: 0x...');
  });

  it('should not modify messages without sensitive data', () => {
    const message = 'Invalid amount';
    const sanitized = sanitizeError(message);
    expect(sanitized).toBe('Invalid amount');
  });
});
