/**
 * Unit Tests: Split Payer
 * 
 * Tests for payment queue and nonce manager:
 * - Sequential payment processing
 * - Nonce lock/unlock
 * - Retry logic
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SplitPayer, getNonceManagerStatus } from '../SplitPayer';
import type { SplitBill } from '../types';

// Mock dependencies
vi.mock('../../wallet/transactions', () => ({
  sendNative: vi.fn(),
  waitForConfirmations: vi.fn(),
}));

vi.mock('../store/splitBillsSlice', () => ({
  useSplitBills: {
    getState: vi.fn(() => ({
      getBill: vi.fn(),
      updateParticipantStatus: vi.fn(),
    })),
  },
}));

import { sendNative, waitForConfirmations } from '../../wallet/transactions';
import { useSplitBills } from '../store/splitBillsSlice';

describe('SplitPayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Nonce Manager', () => {
    it('should start unlocked', () => {
      const status = getNonceManagerStatus();
      expect(status.isLocked).toBe(false);
    });

    it('should lock during payment processing', async () => {
      const mockBill: SplitBill = {
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
            amountSmallestUnit: '500000000000000000', // 0.5 ETH
          },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        createdAt: Date.now(),
      };

      (useSplitBills.getState as any).mockReturnValue({
        getBill: vi.fn(() => mockBill),
        updateParticipantStatus: vi.fn(),
      });

      (sendNative as any).mockImplementation(async () => {
        // Check lock during send
        const status = getNonceManagerStatus();
        expect(status.isLocked).toBe(true);

        return {
          hash: '0x123',
          nonce: 1,
          from: '0xSender',
          to: mockBill.participants[0].address,
          value: '0.5',
          gasEstimate: {},
          status: 'pending',
          timestamp: Date.now(),
          response: {},
        };
      });

      (waitForConfirmations as any).mockResolvedValue({
        receipt: {},
        status: 'confirmed',
        confirmations: 2,
        blockNumber: 100,
        gasUsed: '21000',
      });

      await SplitPayer.payAll({
        billId: 'bill-1',
        minConfirmations: 1,
        maxRetries: 1,
      });

      // Should be unlocked after completion
      const finalStatus = getNonceManagerStatus();
      expect(finalStatus.isLocked).toBe(false);
    });
  });

  describe('Payment Queue', () => {
    it('should process payments sequentially', async () => {
      const mockBill: SplitBill = {
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
            amountSmallestUnit: '1000000000000000000', // 1 ETH
          },
          {
            id: 'p2',
            address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
            payStatus: 'pending',
            amountSmallestUnit: '1000000000000000000', // 1 ETH
          },
          {
            id: 'p3',
            address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
            payStatus: 'pending',
            amountSmallestUnit: '1000000000000000000', // 1 ETH
          },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        createdAt: Date.now(),
      };

      (useSplitBills.getState as any).mockReturnValue({
        getBill: vi.fn(() => mockBill),
        updateParticipantStatus: vi.fn(),
      });

      const sendOrder: string[] = [];

      (sendNative as any).mockImplementation(async (params: any) => {
        sendOrder.push(params.to);
        return {
          hash: `0x${sendOrder.length}`,
          nonce: sendOrder.length,
          from: '0xSender',
          to: params.to,
          value: params.amountEther,
          gasEstimate: {},
          status: 'pending',
          timestamp: Date.now(),
          response: {},
        };
      });

      (waitForConfirmations as any).mockResolvedValue({
        receipt: {},
        status: 'confirmed',
        confirmations: 2,
        blockNumber: 100,
        gasUsed: '21000',
      });

      const result = await SplitPayer.payAll({
        billId: 'bill-1',
        minConfirmations: 1,
        maxRetries: 1,
      });

      // All 3 should be sent in order
      expect(sendOrder).toHaveLength(3);
      expect(sendOrder[0]).toBe(mockBill.participants[0].address);
      expect(sendOrder[1]).toBe(mockBill.participants[1].address);
      expect(sendOrder[2]).toBe(mockBill.participants[2].address);

      // All completed
      expect(result.completed).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('should skip already paid participants', async () => {
      const mockBill: SplitBill = {
        id: 'bill-1',
        chainId: 11155111,
        asset: { type: 'ETH', decimals: 18 },
        totalHuman: '2',
        mode: 'equal',
        participants: [
          {
            id: 'p1',
            address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
            payStatus: 'paid', // Already paid
            amountSmallestUnit: '1000000000000000000',
            txHash: '0xOld',
          },
          {
            id: 'p2',
            address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
            payStatus: 'pending',
            amountSmallestUnit: '1000000000000000000',
          },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        createdAt: Date.now(),
      };

      (useSplitBills.getState as any).mockReturnValue({
        getBill: vi.fn(() => mockBill),
        updateParticipantStatus: vi.fn(),
      });

      (sendNative as any).mockResolvedValue({
        hash: '0x123',
        nonce: 1,
        from: '0xSender',
        to: mockBill.participants[1].address,
        value: '1',
        gasEstimate: {},
        status: 'pending',
        timestamp: Date.now(),
        response: {},
      });

      (waitForConfirmations as any).mockResolvedValue({
        receipt: {},
        status: 'confirmed',
        confirmations: 2,
        blockNumber: 100,
        gasUsed: '21000',
      });

      const result = await SplitPayer.payAll({
        billId: 'bill-1',
        minConfirmations: 1,
        maxRetries: 1,
      });

      // Only 1 payment sent (p2)
      expect(sendNative).toHaveBeenCalledTimes(1);
      expect(result.total).toBe(1);
      expect(result.completed).toBe(1);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on failure', async () => {
      const mockBill: SplitBill = {
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
            amountSmallestUnit: '1000000000000000000',
          },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        createdAt: Date.now(),
      };

      (useSplitBills.getState as any).mockReturnValue({
        getBill: vi.fn(() => mockBill),
        updateParticipantStatus: vi.fn(),
      });

      let attempts = 0;
      (sendNative as any).mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Network error');
        }
        return {
          hash: '0x123',
          nonce: 1,
          from: '0xSender',
          to: mockBill.participants[0].address,
          value: '1',
          gasEstimate: {},
          status: 'pending',
          timestamp: Date.now(),
          response: {},
        };
      });

      (waitForConfirmations as any).mockResolvedValue({
        receipt: {},
        status: 'confirmed',
        confirmations: 2,
        blockNumber: 100,
        gasUsed: '21000',
      });

      const result = await SplitPayer.payAll({
        billId: 'bill-1',
        minConfirmations: 1,
        maxRetries: 3,
      });

      // Should succeed on 3rd attempt
      expect(attempts).toBe(3);
      expect(result.completed).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should mark as failed after max retries', async () => {
      const mockBill: SplitBill = {
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
            amountSmallestUnit: '1000000000000000000',
          },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        createdAt: Date.now(),
      };

      (useSplitBills.getState as any).mockReturnValue({
        getBill: vi.fn(() => mockBill),
        updateParticipantStatus: vi.fn(),
      });

      (sendNative as any).mockRejectedValue(new Error('Insufficient funds'));

      const result = await SplitPayer.payAll({
        billId: 'bill-1',
        minConfirmations: 1,
        maxRetries: 2,
      });

      // Should fail after 2 attempts
      expect(sendNative).toHaveBeenCalledTimes(2);
      expect(result.completed).toBe(0);
      expect(result.failed).toBe(1);
    });
  });

  describe('Pay Selected', () => {
    it('should pay only selected participants', async () => {
      const mockBill: SplitBill = {
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
            payStatus: 'pending',
            amountSmallestUnit: '1000000000000000000',
          },
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        createdAt: Date.now(),
      };

      (useSplitBills.getState as any).mockReturnValue({
        getBill: vi.fn(() => mockBill),
        updateParticipantStatus: vi.fn(),
      });

      const sentTo: string[] = [];

      (sendNative as any).mockImplementation(async (params: any) => {
        sentTo.push(params.to);
        return {
          hash: `0x${sentTo.length}`,
          nonce: sentTo.length,
          from: '0xSender',
          to: params.to,
          value: params.amountEther,
          gasEstimate: {},
          status: 'pending',
          timestamp: Date.now(),
          response: {},
        };
      });

      (waitForConfirmations as any).mockResolvedValue({
        receipt: {},
        status: 'confirmed',
        confirmations: 2,
        blockNumber: 100,
        gasUsed: '21000',
      });

      const result = await SplitPayer.paySelected({
        billId: 'bill-1',
        participantIds: ['p1', 'p3'], // Only p1 and p3
        minConfirmations: 1,
        maxRetries: 1,
      });

      // Only 2 payments sent
      expect(sentTo).toHaveLength(2);
      expect(sentTo).toContain(mockBill.participants[0].address); // p1
      expect(sentTo).toContain(mockBill.participants[2].address); // p3
      expect(sentTo).not.toContain(mockBill.participants[1].address); // p2 not sent

      expect(result.total).toBe(2);
      expect(result.completed).toBe(2);
    });
  });

  describe('Progress Tracking', () => {
    it('should emit progress updates', async () => {
      const mockBill: SplitBill = {
        id: 'bill-1',
        chainId: 11155111,
        asset: { type: 'ETH', decimals: 18 },
        totalHuman: '2',
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
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        createdAt: Date.now(),
      };

      (useSplitBills.getState as any).mockReturnValue({
        getBill: vi.fn(() => mockBill),
        updateParticipantStatus: vi.fn(),
      });

      (sendNative as any).mockResolvedValue({
        hash: '0x123',
        nonce: 1,
        from: '0xSender',
        to: mockBill.participants[0].address,
        value: '1',
        gasEstimate: {},
        status: 'pending',
        timestamp: Date.now(),
        response: {},
      });

      (waitForConfirmations as any).mockResolvedValue({
        receipt: {},
        status: 'confirmed',
        confirmations: 2,
        blockNumber: 100,
        gasUsed: '21000',
      });

      const progressUpdates: any[] = [];

      await SplitPayer.payAll({
        billId: 'bill-1',
        minConfirmations: 1,
        maxRetries: 1,
        onProgress: (progress) => {
          progressUpdates.push({ ...progress });
        },
      });

      // Should have multiple progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Last update should show completion
      const lastUpdate = progressUpdates[progressUpdates.length - 1];
      expect(lastUpdate.completed).toBe(2);
      expect(lastUpdate.total).toBe(2);
    });
  });
});
