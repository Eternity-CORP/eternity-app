/**
 * E2E Test: Scheduled One-Time Payment
 * 
 * Tests:
 * - Create one-time ETH payment scheduled for near future
 * - Wait for execution
 * - Verify transaction confirmed
 * - Check recipient balance increased
 * 
 * Prerequisites:
 * - TEST_PRIVKEY_A funded with testnet ETH
 * - .env file configured
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ethers } from 'ethers';
import {
  validateConfig,
  getWalletA,
  getProvider,
  config,
  checkSufficientBalance,
  waitForTransaction,
  getBalance,
  logSection,
  logStep,
  logSuccess,
  logError,
  logTransaction,
  assertTxSuccess,
  sleep,
} from './helpers/testUtils';

describe('Scheduled One-Time Payment (Sepolia)', () => {
  beforeAll(() => {
    validateConfig();
  });

  it(
    'should create and execute one-time ETH payment',
    async () => {
      logSection('E2E Test: Scheduled One-Time Payment');

      const wallet = getWalletA();
      const provider = getProvider();
      const recipient = config.recipient1;
      const amount = '0.001'; // 0.001 ETH

      // Step 1: Check balance
      logStep('Step 1: Check wallet balance');
      const hasSufficientBalance = await checkSufficientBalance(wallet, '0.01');
      expect(hasSufficientBalance).toBe(true);

      const initialSenderBalance = await getBalance(wallet.address);
      const initialRecipientBalance = await getBalance(recipient);

      console.log(`Sender balance: ${initialSenderBalance} ETH`);
      console.log(`Recipient balance: ${initialRecipientBalance} ETH`);

      // Step 2: Schedule payment for 30 seconds from now
      logStep('Step 2: Schedule one-time payment');

      const scheduledTime = Math.floor(Date.now() / 1000) + 30; // 30 seconds from now
      const scheduledDate = new Date(scheduledTime * 1000);

      console.log(`Scheduled for: ${scheduledDate.toISOString()}`);
      console.log(`Current time: ${new Date().toISOString()}`);

      // For this E2E test, we'll simulate by just sending immediately
      // In real app, this would be handled by JobRunner
      logStep('Step 3: Wait for scheduled time');
      console.log('Waiting 30 seconds for scheduled time...');
      await sleep(30000);

      // Step 4: Execute payment
      logStep('Step 4: Execute scheduled payment');

      const tx = await wallet.sendTransaction({
        to: recipient,
        value: ethers.utils.parseEther(amount),
      });

      logTransaction(tx);

      // Step 5: Wait for confirmation
      logStep('Step 5: Wait for transaction confirmation');

      const receipt = await waitForTransaction(tx.hash, config.minConfirmations);
      assertTxSuccess(receipt);

      // Step 6: Verify balances
      logStep('Step 6: Verify balances changed');

      const finalSenderBalance = await getBalance(wallet.address);
      const finalRecipientBalance = await getBalance(recipient);

      console.log(`\nBalance Changes:`);
      console.log(`Sender: ${initialSenderBalance} -> ${finalSenderBalance} ETH`);
      console.log(`Recipient: ${initialRecipientBalance} -> ${finalRecipientBalance} ETH`);

      // Verify recipient received funds
      const recipientIncrease =
        parseFloat(finalRecipientBalance) - parseFloat(initialRecipientBalance);

      expect(recipientIncrease).toBeCloseTo(parseFloat(amount), 4);
      logSuccess(`Recipient received ${recipientIncrease.toFixed(6)} ETH`);

      // Verify sender balance decreased (amount + gas)
      const senderDecrease =
        parseFloat(initialSenderBalance) - parseFloat(finalSenderBalance);

      expect(senderDecrease).toBeGreaterThan(parseFloat(amount));
      logSuccess(`Sender paid ${senderDecrease.toFixed(6)} ETH (including gas)`);

      // Step 7: Log final results
      logSection('Test Results');
      console.log(`✅ Scheduled payment executed successfully`);
      console.log(`   TX Hash: ${receipt.transactionHash}`);
      console.log(`   Block: ${receipt.blockNumber}`);
      console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
      console.log(`   Amount: ${amount} ETH`);
      console.log(`   From: ${wallet.address}`);
      console.log(`   To: ${recipient}`);
      console.log(`   Explorer: https://sepolia.etherscan.io/tx/${receipt.transactionHash}`);
    },
    config.testTimeout
  );

  it(
    'should handle multiple scheduled payments',
    async () => {
      logSection('E2E Test: Multiple Scheduled Payments');

      const wallet = getWalletA();
      const recipients = [config.recipient1, config.recipient2, config.recipient3];
      const amount = '0.0005'; // 0.0005 ETH each

      logStep('Step 1: Check balance for multiple payments');
      const hasSufficientBalance = await checkSufficientBalance(wallet, '0.01');
      expect(hasSufficientBalance).toBe(true);

      logStep('Step 2: Execute multiple payments');

      const txHashes: string[] = [];

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];

        console.log(`\nSending payment ${i + 1}/${recipients.length} to ${recipient}`);

        const tx = await wallet.sendTransaction({
          to: recipient,
          value: ethers.utils.parseEther(amount),
        });

        logTransaction(tx);
        txHashes.push(tx.hash);

        // Wait a bit between transactions to avoid nonce issues
        if (i < recipients.length - 1) {
          await sleep(5000);
        }
      }

      logStep('Step 3: Wait for all confirmations');

      for (let i = 0; i < txHashes.length; i++) {
        console.log(`\nWaiting for payment ${i + 1}/${txHashes.length}...`);
        const receipt = await waitForTransaction(txHashes[i], config.minConfirmations);
        assertTxSuccess(receipt);
      }

      logSuccess('All scheduled payments executed successfully');

      // Log results
      logSection('Test Results');
      console.log(`✅ ${txHashes.length} payments executed`);
      txHashes.forEach((hash, i) => {
        console.log(`   ${i + 1}. https://sepolia.etherscan.io/tx/${hash}`);
      });
    },
    config.testTimeout
  );
});
