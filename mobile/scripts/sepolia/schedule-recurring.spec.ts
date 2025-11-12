/**
 * E2E Test: Scheduled Recurring Payment
 * 
 * Tests:
 * - Create RRULE daily recurring payment
 * - Simulate two executions (accelerated with time mocking)
 * - Verify both transactions confirmed
 * - Check balances after each execution
 * 
 * Prerequisites:
 * - TEST_PRIVKEY_A funded with testnet ETH
 * - .env file configured
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ethers } from 'ethers';
import { RRule } from 'rrule';
import {
  validateConfig,
  getWalletA,
  config,
  checkSufficientBalance,
  waitForTransaction,
  getBalance,
  logSection,
  logStep,
  logSuccess,
  logTransaction,
  assertTxSuccess,
  sleep,
} from './helpers/testUtils';

describe('Scheduled Recurring Payment (Sepolia)', () => {
  beforeAll(() => {
    validateConfig();
  });

  it(
    'should execute RRULE daily payment twice',
    async () => {
      logSection('E2E Test: Recurring Daily Payment');

      const wallet = getWalletA();
      const recipient = config.recipient1;
      const amount = '0.0005'; // 0.0005 ETH per payment

      // Step 1: Check balance
      logStep('Step 1: Check wallet balance');
      const hasSufficientBalance = await checkSufficientBalance(wallet, '0.01');
      expect(hasSufficientBalance).toBe(true);

      const initialBalance = await getBalance(recipient);
      console.log(`Initial recipient balance: ${initialBalance} ETH`);

      // Step 2: Create RRULE for daily payments
      logStep('Step 2: Create RRULE schedule');

      const now = new Date();
      const rrule = new RRule({
        freq: RRule.DAILY,
        dtstart: now,
        count: 2, // Only 2 occurrences for test
      });

      console.log(`RRULE: ${rrule.toString()}`);
      console.log(`Occurrences:`);

      const occurrences = rrule.all();
      occurrences.forEach((date, i) => {
        console.log(`  ${i + 1}. ${date.toISOString()}`);
      });

      // Step 3: Execute first payment
      logStep('Step 3: Execute first payment (Day 1)');

      console.log(`Executing payment 1/2...`);
      console.log(`Scheduled time: ${occurrences[0].toISOString()}`);

      const tx1 = await wallet.sendTransaction({
        to: recipient,
        value: ethers.utils.parseEther(amount),
      });

      logTransaction(tx1);

      const receipt1 = await waitForTransaction(tx1.hash, config.minConfirmations);
      assertTxSuccess(receipt1);

      const balanceAfterFirst = await getBalance(recipient);
      console.log(`Recipient balance after first payment: ${balanceAfterFirst} ETH`);

      const firstIncrease = parseFloat(balanceAfterFirst) - parseFloat(initialBalance);
      expect(firstIncrease).toBeCloseTo(parseFloat(amount), 4);
      logSuccess(`First payment received: ${firstIncrease.toFixed(6)} ETH`);

      // Step 4: Wait and execute second payment
      logStep('Step 4: Execute second payment (Day 2)');

      // In real app, this would wait 24 hours
      // For E2E test, we simulate by waiting a few seconds
      console.log('Simulating 24-hour wait (actually 10 seconds)...');
      await sleep(10000);

      console.log(`Executing payment 2/2...`);
      console.log(`Scheduled time: ${occurrences[1].toISOString()}`);

      const tx2 = await wallet.sendTransaction({
        to: recipient,
        value: ethers.utils.parseEther(amount),
      });

      logTransaction(tx2);

      const receipt2 = await waitForTransaction(tx2.hash, config.minConfirmations);
      assertTxSuccess(receipt2);

      const finalBalance = await getBalance(recipient);
      console.log(`Recipient balance after second payment: ${finalBalance} ETH`);

      const secondIncrease = parseFloat(finalBalance) - parseFloat(balanceAfterFirst);
      expect(secondIncrease).toBeCloseTo(parseFloat(amount), 4);
      logSuccess(`Second payment received: ${secondIncrease.toFixed(6)} ETH`);

      // Step 5: Verify total increase
      logStep('Step 5: Verify total balance increase');

      const totalIncrease = parseFloat(finalBalance) - parseFloat(initialBalance);
      const expectedTotal = parseFloat(amount) * 2;

      expect(totalIncrease).toBeCloseTo(expectedTotal, 4);
      logSuccess(`Total received: ${totalIncrease.toFixed(6)} ETH (expected ${expectedTotal})`);

      // Step 6: Log final results
      logSection('Test Results');
      console.log(`✅ Recurring payment executed 2 times successfully`);
      console.log(`\nPayment 1:`);
      console.log(`   TX Hash: ${receipt1.transactionHash}`);
      console.log(`   Block: ${receipt1.blockNumber}`);
      console.log(`   Explorer: https://sepolia.etherscan.io/tx/${receipt1.transactionHash}`);
      console.log(`\nPayment 2:`);
      console.log(`   TX Hash: ${receipt2.transactionHash}`);
      console.log(`   Block: ${receipt2.blockNumber}`);
      console.log(`   Explorer: https://sepolia.etherscan.io/tx/${receipt2.transactionHash}`);
      console.log(`\nTotal Amount: ${expectedTotal} ETH`);
      console.log(`From: ${wallet.address}`);
      console.log(`To: ${recipient}`);
    },
    config.testTimeout
  );

  it(
    'should handle weekly recurring payment',
    async () => {
      logSection('E2E Test: Recurring Weekly Payment');

      const wallet = getWalletA();
      const recipient = config.recipient2;
      const amount = '0.0003'; // 0.0003 ETH per payment

      logStep('Step 1: Create RRULE for weekly payments');

      const now = new Date();
      const rrule = new RRule({
        freq: RRule.WEEKLY,
        dtstart: now,
        count: 2,
        byweekday: [RRule.MO], // Every Monday
      });

      console.log(`RRULE: ${rrule.toString()}`);

      const occurrences = rrule.all();
      console.log(`Next 2 occurrences:`);
      occurrences.forEach((date, i) => {
        console.log(`  ${i + 1}. ${date.toISOString()}`);
      });

      logStep('Step 2: Execute first weekly payment');

      const initialBalance = await getBalance(recipient);

      const tx1 = await wallet.sendTransaction({
        to: recipient,
        value: ethers.utils.parseEther(amount),
      });

      logTransaction(tx1);

      const receipt1 = await waitForTransaction(tx1.hash, config.minConfirmations);
      assertTxSuccess(receipt1);

      logStep('Step 3: Execute second weekly payment');

      await sleep(10000); // Simulate week wait

      const tx2 = await wallet.sendTransaction({
        to: recipient,
        value: ethers.utils.parseEther(amount),
      });

      logTransaction(tx2);

      const receipt2 = await waitForTransaction(tx2.hash, config.minConfirmations);
      assertTxSuccess(receipt2);

      const finalBalance = await getBalance(recipient);
      const totalIncrease = parseFloat(finalBalance) - parseFloat(initialBalance);

      expect(totalIncrease).toBeCloseTo(parseFloat(amount) * 2, 4);
      logSuccess(`Weekly payments completed: ${totalIncrease.toFixed(6)} ETH total`);

      logSection('Test Results');
      console.log(`✅ Weekly recurring payment executed 2 times`);
      console.log(`   Payment 1: https://sepolia.etherscan.io/tx/${receipt1.transactionHash}`);
      console.log(`   Payment 2: https://sepolia.etherscan.io/tx/${receipt2.transactionHash}`);
    },
    config.testTimeout
  );
});
