/**
 * E2E Tests: Scheduled Payments
 * 
 * End-to-end tests for scheduled payment creation and execution on Sepolia
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ethers } from 'ethers';
import { useScheduledPayments } from '../store/scheduledSlice';
import { JobRunner } from '../JobRunner';
import type { ScheduledPayment } from '../types';

// Test configuration
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
const TEST_PRIVATE_KEY = process.env.TEST_PRIVATE_KEY || '';
const TEST_RECIPIENT = process.env.TEST_RECIPIENT || '';
const TEST_TOKEN_ADDRESS = process.env.TEST_TOKEN_ADDRESS || '';

describe('Scheduled Payments E2E (Sepolia)', () => {
  let provider: ethers.providers.JsonRpcProvider;
  let wallet: ethers.Wallet;
  let jobRunner: JobRunner;

  beforeAll(() => {
    if (!TEST_PRIVATE_KEY || !TEST_RECIPIENT) {
      console.warn('Skipping E2E tests: TEST_PRIVATE_KEY or TEST_RECIPIENT not set');
      return;
    }

    // Setup provider and wallet
    provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
    wallet = new ethers.Wallet(TEST_PRIVATE_KEY, provider);

    // Setup job runner with real send functions
    jobRunner = new JobRunner({
      sendNative: async (params) => {
        const tx = await wallet.sendTransaction({
          to: params.to,
          value: ethers.utils.parseEther(params.amount),
          maxFeePerGas: params.maxFeePerGas,
          maxPriorityFeePerGas: params.maxPriorityFeePerGas,
        });
        return tx;
      },
      sendErc20: async (params) => {
        const tokenContract = new ethers.Contract(
          params.tokenAddress,
          [
            'function transfer(address to, uint256 amount) returns (bool)',
            'function decimals() view returns (uint8)',
          ],
          wallet
        );

        const decimals = await tokenContract.decimals();
        const amount = ethers.utils.parseUnits(params.amount, decimals);

        const tx = await tokenContract.transfer(params.to, amount, {
          maxFeePerGas: params.maxFeePerGas,
          maxPriorityFeePerGas: params.maxPriorityFeePerGas,
        });

        return tx;
      },
      getProvider: () => provider,
    });
  });

  describe('ETH Payment', () => {
    it('should create and execute ETH payment', async () => {
      if (!TEST_PRIVATE_KEY) {
        console.log('Skipping: TEST_PRIVATE_KEY not set');
        return;
      }

      // Clear store
      useScheduledPayments.getState().payments = {};

      // Create payment (due in 5 seconds)
      const payment = useScheduledPayments.getState().addPayment({
        kind: 'one_time',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: wallet.address,
        to: TEST_RECIPIENT,
        amountHuman: '0.0001', // Very small amount
        scheduleAt: Date.now() + 5000,
        tz: 'UTC',
      });

      expect(payment).toBeDefined();
      expect(payment.status).toBe('scheduled');
      expect(payment.nextRunAt).toBeDefined();

      // Wait for due time
      await new Promise((resolve) => setTimeout(resolve, 6000));

      // Execute tick
      await jobRunner.tick();

      // Check status
      const updated = useScheduledPayments.getState().getPayment(payment.id);
      expect(updated?.status).toBe('completed');
      expect(updated?.runCount).toBe(1);
      expect(updated?.failCount).toBe(0);

      console.log('✅ ETH payment executed successfully');
      console.log(`   TX: ${updated?.lastRunAt}`);
    }, 30000); // 30 second timeout
  });

  describe('ERC-20 Payment', () => {
    it('should create and execute ERC-20 payment', async () => {
      if (!TEST_PRIVATE_KEY || !TEST_TOKEN_ADDRESS) {
        console.log('Skipping: TEST_PRIVATE_KEY or TEST_TOKEN_ADDRESS not set');
        return;
      }

      // Clear store
      useScheduledPayments.getState().payments = {};

      // Create payment (due in 5 seconds)
      const payment = useScheduledPayments.getState().addPayment({
        kind: 'one_time',
        chainId: 11155111,
        asset: { type: 'ERC20', tokenAddress: TEST_TOKEN_ADDRESS },
        fromAccountId: wallet.address,
        to: TEST_RECIPIENT,
        amountHuman: '1', // 1 token
        scheduleAt: Date.now() + 5000,
        tz: 'UTC',
      });

      expect(payment).toBeDefined();
      expect(payment.status).toBe('scheduled');

      // Wait for due time
      await new Promise((resolve) => setTimeout(resolve, 6000));

      // Execute tick
      await jobRunner.tick();

      // Check status
      const updated = useScheduledPayments.getState().getPayment(payment.id);
      expect(updated?.status).toBe('completed');
      expect(updated?.runCount).toBe(1);

      console.log('✅ ERC-20 payment executed successfully');
    }, 30000);
  });

  describe('Recurring Payment', () => {
    it('should execute recurring payment multiple times', async () => {
      if (!TEST_PRIVATE_KEY) {
        console.log('Skipping: TEST_PRIVATE_KEY not set');
        return;
      }

      // Clear store
      useScheduledPayments.getState().payments = {};

      // Create recurring payment (every minute)
      const payment = useScheduledPayments.getState().addPayment({
        kind: 'recurring',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: wallet.address,
        to: TEST_RECIPIENT,
        amountHuman: '0.0001',
        rrule: 'FREQ=MINUTELY;DTSTART=20250111T000000Z',
        tz: 'UTC',
      });

      expect(payment).toBeDefined();
      expect(payment.status).toBe('scheduled');

      // Execute first run
      await jobRunner.tick();

      let updated = useScheduledPayments.getState().getPayment(payment.id);
      expect(updated?.status).toBe('scheduled'); // Still scheduled for next run
      expect(updated?.runCount).toBe(1);
      expect(updated?.nextRunAt).toBeDefined();

      // Wait for next run
      await new Promise((resolve) => setTimeout(resolve, 60000));

      // Execute second run
      await jobRunner.tick();

      updated = useScheduledPayments.getState().getPayment(payment.id);
      expect(updated?.runCount).toBe(2);

      console.log('✅ Recurring payment executed twice');
    }, 120000); // 2 minute timeout
  });

  describe('Error Handling', () => {
    it('should handle insufficient funds error', async () => {
      if (!TEST_PRIVATE_KEY) {
        console.log('Skipping: TEST_PRIVATE_KEY not set');
        return;
      }

      // Clear store
      useScheduledPayments.getState().payments = {};

      // Create payment with huge amount (will fail)
      const payment = useScheduledPayments.getState().addPayment({
        kind: 'one_time',
        chainId: 11155111,
        asset: { type: 'ETH' },
        fromAccountId: wallet.address,
        to: TEST_RECIPIENT,
        amountHuman: '1000', // Way too much
        scheduleAt: Date.now() + 5000,
        tz: 'UTC',
      });

      // Wait for due time
      await new Promise((resolve) => setTimeout(resolve, 6000));

      // Execute tick (will fail)
      await jobRunner.tick();

      // Check status
      const updated = useScheduledPayments.getState().getPayment(payment.id);
      expect(updated?.status).toBe('failed');
      expect(updated?.failCount).toBe(1);
      expect(updated?.lastError).toBeDefined();
      expect(updated?.nextRunAt).toBeDefined(); // Scheduled for retry

      console.log('✅ Error handled correctly');
      console.log(`   Error: ${updated?.lastError}`);
    }, 30000);
  });
});
