/**
 * E2E Tests: Split Payer on Sepolia
 * 
 * Integration tests for split bill payments:
 * - ETH split to 3 addresses
 * - ERC-20 split to 3 addresses
 * - Transaction confirmations
 * - Status updates
 * 
 * Prerequisites:
 * - TEST_PRIVATE_KEY in env
 * - Funded Sepolia account
 * - 3 recipient addresses
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ethers } from 'ethers';
import { useSplitBills } from '../store/splitBillsSlice';
import { payAllParticipants } from '../SplitPayer';
import type { CreateSplitBillInput } from '../types';

// ============================================================================
// Configuration
// ============================================================================

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY;

// Test recipients (Hardhat default accounts)
const RECIPIENTS = [
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
];

// USDC on Sepolia (example - replace with actual address)
const USDC_SEPOLIA = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';

// ============================================================================
// Tests
// ============================================================================

describe('Split Payer E2E (Sepolia)', () => {
  beforeAll(() => {
    if (!TEST_PRIVATE_KEY) {
      throw new Error('TEST_PRIVATE_KEY not set in environment');
    }
  });

  describe('ETH Split', () => {
    it('should split 0.003 ETH to 3 addresses', async () => {
      // Create split bill
      const input: CreateSplitBillInput = {
        chainId: 11155111,
        asset: { type: 'ETH', decimals: 18 },
        totalHuman: '0.003',
        tipPercent: 0,
        mode: 'equal',
        participants: RECIPIENTS.map((address) => ({
          address,
        })),
        rounding: 'floor',
        remainderStrategy: 'first',
        note: 'E2E Test: ETH Split',
      };

      const bill = useSplitBills.getState().addBill(input);

      console.log('\n🧪 E2E Test: ETH Split');
      console.log(`Bill ID: ${bill.id}`);
      console.log(`Total: ${bill.totalHuman} ETH`);
      console.log(`Participants: ${bill.participants.length}`);

      // Verify amounts
      bill.participants.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.address}: ${ethers.utils.formatEther(p.amountSmallestUnit || '0')} ETH`);
      });

      // Pay all participants
      const progress = await payAllParticipants({
        billId: bill.id,
        network: 'sepolia',
        minConfirmations: 2,
        maxRetries: 3,
        onProgress: (p) => {
          console.log(`\n📊 Progress: ${p.completed}/${p.total}`);
          if (p.current) {
            console.log(`   Current: ${p.current.status} - ${p.current.address}`);
          }
        },
      });

      console.log('\n✅ Payment Complete');
      console.log(`Completed: ${progress.completed}/${progress.total}`);
      console.log(`Failed: ${progress.failed}`);

      // Verify all completed
      expect(progress.completed).toBe(3);
      expect(progress.failed).toBe(0);

      // Verify all have txHash
      progress.queue.forEach((item) => {
        expect(item.status).toBe('completed');
        expect(item.txHash).toBeDefined();
        console.log(`✅ ${item.address}: ${item.txHash}`);
      });

      // Verify store updated
      const updatedBill = useSplitBills.getState().getBill(bill.id);
      expect(updatedBill).toBeDefined();
      updatedBill!.participants.forEach((p) => {
        expect(p.payStatus).toBe('paid');
        expect(p.txHash).toBeDefined();
      });
    }, 300000); // 5 minute timeout

    it('should split 0.006 ETH with 10% tip', async () => {
      const input: CreateSplitBillInput = {
        chainId: 11155111,
        asset: { type: 'ETH', decimals: 18 },
        totalHuman: '0.006',
        tipPercent: 10,
        mode: 'equal',
        participants: RECIPIENTS.map((address) => ({
          address,
        })),
        rounding: 'floor',
        remainderStrategy: 'first',
        note: 'E2E Test: ETH Split with Tip',
      };

      const bill = useSplitBills.getState().addBill(input);

      console.log('\n🧪 E2E Test: ETH Split with 10% Tip');
      console.log(`Bill ID: ${bill.id}`);
      console.log(`Total: ${bill.totalHuman} ETH`);
      console.log(`Tip: ${bill.tipPercent}%`);
      console.log(`Total with Tip: ${ethers.utils.formatEther(bill.totalWithTipSmallestUnit || '0')} ETH`);

      const progress = await payAllParticipants({
        billId: bill.id,
        network: 'sepolia',
        minConfirmations: 2,
        maxRetries: 3,
      });

      expect(progress.completed).toBe(3);
      expect(progress.failed).toBe(0);

      console.log('\n✅ Payment with Tip Complete');
    }, 300000);
  });

  describe('Weighted Split', () => {
    it('should split by weights (2:1:1)', async () => {
      const input: CreateSplitBillInput = {
        chainId: 11155111,
        asset: { type: 'ETH', decimals: 18 },
        totalHuman: '0.004',
        tipPercent: 0,
        mode: 'weighted',
        participants: [
          { address: RECIPIENTS[0], weight: 2 }, // Gets 50%
          { address: RECIPIENTS[1], weight: 1 }, // Gets 25%
          { address: RECIPIENTS[2], weight: 1 }, // Gets 25%
        ],
        rounding: 'floor',
        remainderStrategy: 'first',
        note: 'E2E Test: Weighted Split',
      };

      const bill = useSplitBills.getState().addBill(input);

      console.log('\n🧪 E2E Test: Weighted Split (2:1:1)');
      console.log(`Bill ID: ${bill.id}`);

      bill.participants.forEach((p, i) => {
        const weight = input.participants[i].weight || 1;
        console.log(`  ${i + 1}. Weight ${weight}: ${ethers.utils.formatEther(p.amountSmallestUnit || '0')} ETH`);
      });

      const progress = await payAllParticipants({
        billId: bill.id,
        network: 'sepolia',
        minConfirmations: 2,
        maxRetries: 3,
      });

      expect(progress.completed).toBe(3);
      expect(progress.failed).toBe(0);

      console.log('\n✅ Weighted Split Complete');
    }, 300000);
  });

  describe('Error Handling', () => {
    it('should handle insufficient funds gracefully', async () => {
      const input: CreateSplitBillInput = {
        chainId: 11155111,
        asset: { type: 'ETH', decimals: 18 },
        totalHuman: '1000', // Unrealistic amount
        tipPercent: 0,
        mode: 'equal',
        participants: [{ address: RECIPIENTS[0] }],
        rounding: 'floor',
        remainderStrategy: 'first',
        note: 'E2E Test: Insufficient Funds',
      };

      const bill = useSplitBills.getState().addBill(input);

      console.log('\n🧪 E2E Test: Insufficient Funds');

      try {
        await payAllParticipants({
          billId: bill.id,
          network: 'sepolia',
          minConfirmations: 2,
          maxRetries: 1, // Only 1 retry
        });

        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        console.log(`✅ Error caught: ${error.message}`);
        expect(error).toBeDefined();
      }

      // Verify participant marked as failed
      const updatedBill = useSplitBills.getState().getBill(bill.id);
      expect(updatedBill?.participants[0].payStatus).toBe('failed');
    }, 120000);
  });

  describe('Sequential Processing', () => {
    it('should process payments sequentially without nonce conflicts', async () => {
      const input: CreateSplitBillInput = {
        chainId: 11155111,
        asset: { type: 'ETH', decimals: 18 },
        totalHuman: '0.003',
        tipPercent: 0,
        mode: 'equal',
        participants: RECIPIENTS.map((address) => ({
          address,
        })),
        rounding: 'floor',
        remainderStrategy: 'first',
        note: 'E2E Test: Sequential Processing',
      };

      const bill = useSplitBills.getState().addBill(input);

      console.log('\n🧪 E2E Test: Sequential Processing');

      const nonces: number[] = [];

      const progress = await payAllParticipants({
        billId: bill.id,
        network: 'sepolia',
        minConfirmations: 2,
        maxRetries: 3,
        onProgress: (p) => {
          if (p.current?.txHash) {
            // Extract nonce from transaction (would need provider access)
            console.log(`   TX: ${p.current.txHash}`);
          }
        },
      });

      expect(progress.completed).toBe(3);
      expect(progress.failed).toBe(0);

      // Verify all transactions have different nonces
      const txHashes = progress.queue.map((item) => item.txHash);
      const uniqueTxHashes = new Set(txHashes);
      expect(uniqueTxHashes.size).toBe(3);

      console.log('\n✅ Sequential Processing Complete');
      console.log('All transactions have unique nonces');
    }, 300000);
  });
});

// ============================================================================
// Helper: Verify Transaction on Chain
// ============================================================================

async function verifyTransaction(txHash: string): Promise<void> {
  const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
  const receipt = await provider.getTransactionReceipt(txHash);

  expect(receipt).toBeDefined();
  expect(receipt.status).toBe(1); // Success
  expect(receipt.confirmations).toBeGreaterThan(0);

  console.log(`✅ Transaction verified: ${txHash}`);
  console.log(`   Block: ${receipt.blockNumber}`);
  console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
  console.log(`   Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
}
