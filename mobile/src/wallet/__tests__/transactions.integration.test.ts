/**
 * Integration tests for wallet/transactions.ts
 * 
 * These tests run against Sepolia testnet and require:
 * - A funded test wallet (seed phrase in env)
 * - Working RPC connection
 * - Patience (transactions take time to confirm)
 * 
 * Run with: npm test -- transactions.integration.test.ts
 * 
 * NOTE: These tests are skipped by default. Set INTEGRATION_TESTS=true to run them.
 */

import { ethers } from 'ethers';
import {
  sendNative,
  waitForConfirmations,
  sendNativeAndWait,
  TransactionStatus,
} from '../transactions';

// Skip integration tests by default
const runIntegrationTests = process.env.INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegrationTests ? describe : describe.skip;

// Test configuration
const TEST_CONFIG = {
  // Recipient address for test transactions (can be same as sender for testing)
  recipientAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  
  // Small amount for testing (0.001 tETH)
  testAmount: '0.001',
  
  // Network
  network: 'sepolia' as const,
  
  // Timeout for confirmations (2 minutes)
  confirmationTimeout: 120000,
};

describeIntegration('wallet/transactions - Sepolia Integration', () => {
  // Increase timeout for blockchain operations
  jest.setTimeout(180000); // 3 minutes

  describe('sendNative', () => {
    it('should send ETH transaction on Sepolia', async () => {
      console.log('\n🚀 Sending test transaction on Sepolia...');
      console.log(`  To: ${TEST_CONFIG.recipientAddress}`);
      console.log(`  Amount: ${TEST_CONFIG.testAmount} tETH`);

      const result = await sendNative({
        to: TEST_CONFIG.recipientAddress,
        amountEther: TEST_CONFIG.testAmount,
        feeLevel: 'medium',
        network: TEST_CONFIG.network,
      });

      console.log(`✅ Transaction sent!`);
      console.log(`  Hash: ${result.hash}`);
      console.log(`  Nonce: ${result.nonce}`);
      console.log(`  From: ${result.from}`);
      console.log(`  Gas Estimate: ${result.gasEstimate.totalFeeTH} ETH`);

      // Verify result structure
      expect(result).toMatchObject({
        hash: expect.stringMatching(/^0x[a-fA-F0-9]{64}$/),
        nonce: expect.any(Number),
        from: expect.stringMatching(/^0x[a-fA-F0-9]{40}$/),
        to: TEST_CONFIG.recipientAddress,
        value: TEST_CONFIG.testAmount,
        status: TransactionStatus.PENDING,
        timestamp: expect.any(Number),
      });

      // Verify gas estimate
      expect(result.gasEstimate).toMatchObject({
        gasLimit: expect.any(Object), // BigNumber
        totalFeeTH: expect.any(String),
        isEIP1559: expect.any(Boolean),
        level: 'medium',
      });
    });

    it('should send transaction with low fee level', async () => {
      console.log('\n🚀 Sending transaction with LOW fee...');

      const result = await sendNative({
        to: TEST_CONFIG.recipientAddress,
        amountEther: TEST_CONFIG.testAmount,
        feeLevel: 'low',
        network: TEST_CONFIG.network,
      });

      console.log(`✅ Transaction sent with low fee: ${result.hash}`);
      console.log(`  Gas Fee: ${result.gasEstimate.totalFeeTH} ETH`);

      expect(result.gasEstimate.level).toBe('low');
      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });

    it('should send transaction with high fee level', async () => {
      console.log('\n🚀 Sending transaction with HIGH fee...');

      const result = await sendNative({
        to: TEST_CONFIG.recipientAddress,
        amountEther: TEST_CONFIG.testAmount,
        feeLevel: 'high',
        network: TEST_CONFIG.network,
      });

      console.log(`✅ Transaction sent with high fee: ${result.hash}`);
      console.log(`  Gas Fee: ${result.gasEstimate.totalFeeTH} ETH`);

      expect(result.gasEstimate.level).toBe('high');
      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });
  });

  describe('waitForConfirmations', () => {
    it('should wait for 2 confirmations', async () => {
      console.log('\n⏳ Testing confirmation waiting...');

      // First send a transaction
      const sendResult = await sendNative({
        to: TEST_CONFIG.recipientAddress,
        amountEther: TEST_CONFIG.testAmount,
        feeLevel: 'high', // Use high fee for faster confirmation
        network: TEST_CONFIG.network,
      });

      console.log(`  Transaction sent: ${sendResult.hash}`);
      console.log(`  Waiting for 2 confirmations...`);

      const statusUpdates: any[] = [];

      // Wait for confirmations
      const confirmation = await waitForConfirmations({
        hash: sendResult.hash,
        minConfirms: 2,
        timeoutMs: TEST_CONFIG.confirmationTimeout,
        network: TEST_CONFIG.network,
        onStatusUpdate: (status) => {
          statusUpdates.push(status);
          console.log(
            `  📊 Update: ${status.status}, Confirmations: ${status.confirmations}, Block: ${status.blockNumber}`
          );
        },
      });

      console.log(`✅ Transaction confirmed!`);
      console.log(`  Block: ${confirmation.blockNumber}`);
      console.log(`  Confirmations: ${confirmation.confirmations}`);
      console.log(`  Gas Used: ${confirmation.gasUsed}`);
      console.log(`  Status: ${confirmation.status}`);

      // Verify confirmation result
      expect(confirmation).toMatchObject({
        status: TransactionStatus.CONFIRMED,
        confirmations: expect.any(Number),
        blockNumber: expect.any(Number),
        gasUsed: expect.any(String),
      });

      expect(confirmation.confirmations).toBeGreaterThanOrEqual(2);
      expect(confirmation.receipt.status).toBe(1); // Success

      // Verify we received status updates
      expect(statusUpdates.length).toBeGreaterThan(0);
    });

    it('should handle already confirmed transaction', async () => {
      console.log('\n⏳ Testing already confirmed transaction...');

      // Send and wait for confirmation
      const sendResult = await sendNative({
        to: TEST_CONFIG.recipientAddress,
        amountEther: TEST_CONFIG.testAmount,
        feeLevel: 'high',
        network: TEST_CONFIG.network,
      });

      // Wait for first confirmation
      await waitForConfirmations({
        hash: sendResult.hash,
        minConfirms: 1,
        timeoutMs: TEST_CONFIG.confirmationTimeout,
        network: TEST_CONFIG.network,
      });

      console.log(`  Transaction already confirmed, checking again...`);

      // Check again - should return immediately
      const confirmation = await waitForConfirmations({
        hash: sendResult.hash,
        minConfirms: 1,
        timeoutMs: 10000, // Short timeout since it's already confirmed
        network: TEST_CONFIG.network,
      });

      expect(confirmation.status).toBe(TransactionStatus.CONFIRMED);
      expect(confirmation.confirmations).toBeGreaterThanOrEqual(1);
    });
  });

  describe('sendNativeAndWait', () => {
    it('should send and wait for confirmations in one call', async () => {
      console.log('\n🚀 Testing sendNativeAndWait...');

      const statusUpdates: any[] = [];

      const { result, confirmation } = await sendNativeAndWait({
        to: TEST_CONFIG.recipientAddress,
        amountEther: TEST_CONFIG.testAmount,
        feeLevel: 'high',
        network: TEST_CONFIG.network,
        minConfirms: 2,
        timeoutMs: TEST_CONFIG.confirmationTimeout,
        onStatusUpdate: (status) => {
          statusUpdates.push(status);
          console.log(
            `  📊 ${status.status}, Confirmations: ${status.confirmations}`
          );
        },
      });

      console.log(`✅ Transaction sent and confirmed!`);
      console.log(`  Hash: ${result.hash}`);
      console.log(`  Block: ${confirmation.blockNumber}`);
      console.log(`  Confirmations: ${confirmation.confirmations}`);

      // Verify both result and confirmation
      expect(result.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(confirmation.status).toBe(TransactionStatus.CONFIRMED);
      expect(confirmation.confirmations).toBeGreaterThanOrEqual(2);
      expect(statusUpdates.length).toBeGreaterThan(0);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle insufficient funds gracefully', async () => {
      console.log('\n❌ Testing insufficient funds error...');

      await expect(
        sendNative({
          to: TEST_CONFIG.recipientAddress,
          amountEther: '1000000', // Unrealistic amount
          feeLevel: 'medium',
          network: TEST_CONFIG.network,
        })
      ).rejects.toThrow(/insufficient/i);

      console.log(`✅ Insufficient funds error handled correctly`);
    });

    it('should handle invalid recipient address', async () => {
      console.log('\n❌ Testing invalid address error...');

      await expect(
        sendNative({
          to: '0xinvalid',
          amountEther: TEST_CONFIG.testAmount,
          feeLevel: 'medium',
          network: TEST_CONFIG.network,
        })
      ).rejects.toThrow(/invalid.*address/i);

      console.log(`✅ Invalid address error handled correctly`);
    });

    it('should handle zero amount', async () => {
      console.log('\n❌ Testing zero amount error...');

      await expect(
        sendNative({
          to: TEST_CONFIG.recipientAddress,
          amountEther: '0',
          feeLevel: 'medium',
          network: TEST_CONFIG.network,
        })
      ).rejects.toThrow(/amount.*greater than 0/i);

      console.log(`✅ Zero amount error handled correctly`);
    });
  });

  describe('Gas Estimation', () => {
    it('should estimate gas correctly for different amounts', async () => {
      console.log('\n⚙️  Testing gas estimation...');

      const amounts = ['0.001', '0.01', '0.1'];

      for (const amount of amounts) {
        const result = await sendNative({
          to: TEST_CONFIG.recipientAddress,
          amountEther: amount,
          feeLevel: 'medium',
          network: TEST_CONFIG.network,
        });

        console.log(`  Amount: ${amount} ETH, Gas: ${result.gasEstimate.totalFeeTH} ETH`);

        // Gas should be similar for all amounts (simple ETH transfer)
        const gasLimit = result.gasEstimate.gasLimit.toNumber();
        expect(gasLimit).toBeGreaterThanOrEqual(21000); // Minimum for ETH transfer
        expect(gasLimit).toBeLessThan(100000); // Should not be too high
      }
    });

    it('should have different gas fees for different fee levels', async () => {
      console.log('\n⚙️  Testing fee level differences...');

      const levels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
      const fees: number[] = [];

      for (const level of levels) {
        const result = await sendNative({
          to: TEST_CONFIG.recipientAddress,
          amountEther: TEST_CONFIG.testAmount,
          feeLevel: level,
          network: TEST_CONFIG.network,
        });

        const fee = parseFloat(result.gasEstimate.totalFeeTH);
        fees.push(fee);

        console.log(`  ${level.toUpperCase()}: ${result.gasEstimate.totalFeeTH} ETH`);
      }

      // Verify fees are in ascending order
      expect(fees[0]).toBeLessThan(fees[1]); // low < medium
      expect(fees[1]).toBeLessThan(fees[2]); // medium < high
    });
  });
});

// Export test config for manual testing
export { TEST_CONFIG };
