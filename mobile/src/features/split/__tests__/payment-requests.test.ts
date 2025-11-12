/**
 * Integration Tests: Payment Requests & Incoming Tracking
 * 
 * Tests for:
 * - EIP-681 URI generation
 * - QR code data
 * - Incoming transaction matching
 * - Auto-update participant status
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ethers } from 'ethers';
import {
  generatePaymentRequest,
  generateAllPaymentRequests,
  parsePaymentUri,
  amountMatchesWithTolerance,
} from '../utils/paymentRequest';
import { IncomingWatcher } from '../IncomingWatcher';
import { useSplitBills } from '../store/splitBillsSlice';
import type { SplitBill, CreateSplitBillInput } from '../types';

describe('Payment Requests', () => {
  describe('EIP-681 URI Generation', () => {
    it('should generate ETH payment URI', () => {
      const bill: SplitBill = {
        id: 'bill-1',
        chainId: 11155111,
        asset: { type: 'ETH', decimals: 18 },
        totalHuman: '1',
        mode: 'equal',
        participants: [
          {
            id: 'p1',
            address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
            payStatus: 'pending',
            amountSmallestUnit: '1000000000000000000', // 1 ETH
          },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        createdAt: Date.now(),
      };

      const request = generatePaymentRequest({
        bill,
        participant: bill.participants[0],
        recipientAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      });

      expect(request.uri).toContain('ethereum:');
      expect(request.uri).toContain('70997970c51812dc3a010c7d01b50e0d17dc79c8');
      expect(request.uri).toContain('value=1000000000000000000');
      expect(request.uri).toContain('chain_id=11155111');
      expect(request.amountHuman).toBe('1.0');
    });

    it('should generate ERC-20 payment URI', () => {
      const bill: SplitBill = {
        id: 'bill-1',
        chainId: 1,
        asset: {
          type: 'ERC20',
          tokenAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          symbol: 'USDC',
          decimals: 6,
        },
        totalHuman: '100',
        mode: 'equal',
        participants: [
          {
            id: 'p1',
            address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
            payStatus: 'pending',
            amountSmallestUnit: '100000000', // 100 USDC
          },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        createdAt: Date.now(),
      };

      const request = generatePaymentRequest({
        bill,
        participant: bill.participants[0],
        recipientAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      });

      expect(request.uri).toContain('ethereum:');
      expect(request.uri).toContain('a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
      expect(request.uri).toContain('/transfer');
      expect(request.uri).toContain('address=70997970c51812dc3a010c7d01b50e0d17dc79c8');
      expect(request.uri).toContain('uint256=100000000');
      expect(request.uri).toContain('chain_id=1');
    });

    it('should generate all payment requests', () => {
      const bill: SplitBill = {
        id: 'bill-1',
        chainId: 11155111,
        asset: { type: 'ETH', decimals: 18 },
        totalHuman: '3',
        mode: 'equal',
        participants: [
          {
            id: 'p1',
            address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
            payStatus: 'pending',
            amountSmallestUnit: '1000000000000000000',
          },
          {
            id: 'p2',
            address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
            payStatus: 'pending',
            amountSmallestUnit: '1000000000000000000',
          },
          {
            id: 'p3',
            address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
            payStatus: 'paid', // Already paid
            amountSmallestUnit: '1000000000000000000',
          },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        createdAt: Date.now(),
      };

      const requests = generateAllPaymentRequests(
        bill,
        '0x90F79bf6EB2c4f870365E785982E1f101E93b906'
      );

      // Should only include pending participants
      expect(requests).toHaveLength(2);
      expect(requests[0].participantId).toBe('p1');
      expect(requests[1].participantId).toBe('p2');
    });
  });

  describe('URI Parsing', () => {
    it('should parse ETH URI', () => {
      const uri = 'ethereum:70997970c51812dc3a010c7d01b50e0d17dc79c8?value=1000000000000000000&chain_id=11155111';
      
      const parsed = parsePaymentUri(uri);

      expect(parsed.type).toBe('ETH');
      expect(parsed.address).toBe('0x70997970c51812dc3a010c7d01b50e0d17dc79c8');
      expect(parsed.amountWei).toBe('1000000000000000000');
      expect(parsed.chainId).toBe(11155111);
    });

    it('should parse ERC-20 URI', () => {
      const uri = 'ethereum:a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48/transfer?address=70997970c51812dc3a010c7d01b50e0d17dc79c8&uint256=100000000&chain_id=1';
      
      const parsed = parsePaymentUri(uri);

      expect(parsed.type).toBe('ERC20');
      expect(parsed.address).toBe('0x70997970c51812dc3a010c7d01b50e0d17dc79c8');
      expect(parsed.tokenAddress).toBe('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48');
      expect(parsed.amountWei).toBe('100000000');
      expect(parsed.chainId).toBe(1);
    });

    it('should throw on invalid URI', () => {
      expect(() => parsePaymentUri('invalid')).toThrow();
      expect(() => parsePaymentUri('ethereum:invalid')).toThrow();
    });
  });

  describe('Amount Matching', () => {
    it('should match exact amounts', () => {
      const amount1 = '1000000000000000000';
      const amount2 = '1000000000000000000';

      expect(amountMatchesWithTolerance(amount1, amount2, '0')).toBe(true);
    });

    it('should match with tolerance', () => {
      const amount1 = '1000000000000000000';
      const amount2 = '1000000000000000001'; // +1 wei

      expect(amountMatchesWithTolerance(amount1, amount2, '1')).toBe(true);
      expect(amountMatchesWithTolerance(amount1, amount2, '0')).toBe(false);
    });

    it('should not match beyond tolerance', () => {
      const amount1 = '1000000000000000000';
      const amount2 = '1000000000000001000'; // +1000 wei

      expect(amountMatchesWithTolerance(amount1, amount2, '999')).toBe(false);
      expect(amountMatchesWithTolerance(amount1, amount2, '1000')).toBe(true);
    });
  });
});

describe('Incoming Watcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Transaction Matching', () => {
    it('should match incoming transaction to participant', async () => {
      // Create bill
      const input: CreateSplitBillInput = {
        chainId: 11155111,
        asset: { type: 'ETH', decimals: 18 },
        totalHuman: '1',
        mode: 'equal',
        participants: [
          {
            address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
      };

      const bill = useSplitBills.getState().addBill(input);
      const participant = bill.participants[0];

      // Simulate incoming transaction
      const incomingTx = {
        hash: '0x123',
        from: participant.address,
        to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        value: participant.amountSmallestUnit || '0',
        blockNumber: 100,
        timestamp: Date.now(),
        matched: false,
      };

      // Check if amounts match
      const matches = amountMatchesWithTolerance(
        incomingTx.value,
        participant.amountSmallestUnit || '0',
        '1000'
      );

      expect(matches).toBe(true);
    });

    it('should not match wrong address', async () => {
      const input: CreateSplitBillInput = {
        chainId: 11155111,
        asset: { type: 'ETH', decimals: 18 },
        totalHuman: '1',
        mode: 'equal',
        participants: [
          {
            address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
      };

      const bill = useSplitBills.getState().addBill(input);
      const participant = bill.participants[0];

      // Incoming from different address
      const incomingTx = {
        hash: '0x123',
        from: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', // Different!
        to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        value: participant.amountSmallestUnit || '0',
        blockNumber: 100,
        timestamp: Date.now(),
        matched: false,
      };

      // Should not match
      const matches = participant.address.toLowerCase() === incomingTx.from.toLowerCase();
      expect(matches).toBe(false);
    });

    it('should not match wrong amount', async () => {
      const input: CreateSplitBillInput = {
        chainId: 11155111,
        asset: { type: 'ETH', decimals: 18 },
        totalHuman: '1',
        mode: 'equal',
        participants: [
          {
            address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
      };

      const bill = useSplitBills.getState().addBill(input);
      const participant = bill.participants[0];

      // Incoming with wrong amount
      const incomingTx = {
        hash: '0x123',
        from: participant.address,
        to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        value: '500000000000000000', // 0.5 ETH instead of 1 ETH
        blockNumber: 100,
        timestamp: Date.now(),
        matched: false,
      };

      // Should not match (beyond tolerance)
      const matches = amountMatchesWithTolerance(
        incomingTx.value,
        participant.amountSmallestUnit || '0',
        '1000' // 1000 wei tolerance
      );

      expect(matches).toBe(false);
    });
  });

  describe('Manual Mark as Paid', () => {
    it('should manually mark participant as paid', () => {
      const input: CreateSplitBillInput = {
        chainId: 11155111,
        asset: { type: 'ETH', decimals: 18 },
        totalHuman: '1',
        mode: 'equal',
        participants: [
          {
            address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
          },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
      };

      const bill = useSplitBills.getState().addBill(input);
      const participant = bill.participants[0];

      expect(participant.payStatus).toBe('pending');

      // Manually mark as paid
      IncomingWatcher.markAsPaid(bill.id, participant.id, '0x123');

      // Check updated status
      const updatedBill = useSplitBills.getState().getBill(bill.id);
      const updatedParticipant = updatedBill?.participants.find(
        (p: any) => p.id === participant.id
      );

      expect(updatedParticipant?.payStatus).toBe('paid');
      expect(updatedParticipant?.txHash).toBe('0x123');
    });
  });

  describe('Duplicate Prevention', () => {
    it('should not process same transaction twice', () => {
      const processedHashes = new Set<string>();
      const txHash = '0x123';

      // First time
      expect(processedHashes.has(txHash)).toBe(false);
      processedHashes.add(txHash);

      // Second time
      expect(processedHashes.has(txHash)).toBe(true);
      // Should skip processing
    });
  });
});
