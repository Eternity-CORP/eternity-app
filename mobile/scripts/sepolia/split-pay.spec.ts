/**
 * E2E Test: Split Bill Payment
 * 
 * Tests:
 * - Create split bill for 3 participants
 * - Pay all participants (ETH)
 * - Pay all participants (ERC-20 tokens)
 * - Verify all transactions confirmed
 * - Check all recipients received correct amounts
 * 
 * Prerequisites:
 * - TEST_PRIVKEY_A funded with testnet ETH and tokens
 * - .env file configured
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ethers } from 'ethers';
import {
  validateConfig,
  getWalletA,
  config,
  checkSufficientBalance,
  checkSufficientTokenBalance,
  waitForTransaction,
  getBalance,
  getTokenBalance,
  getTokenContract,
  logSection,
  logStep,
  logSuccess,
  logTransaction,
  assertTxSuccess,
  sleep,
} from './helpers/testUtils';

describe('Split Bill Payment (Sepolia)', () => {
  beforeAll(() => {
    validateConfig();
  });

  it(
    'should split ETH payment to 3 participants',
    async () => {
      logSection('E2E Test: Split ETH Payment (3 participants)');

      const wallet = getWalletA();
      const participants = [
        config.recipient1,
        config.recipient2,
        config.recipient3,
      ];
      const totalAmount = '0.003'; // 0.003 ETH total
      const perParticipant = '0.001'; // 0.001 ETH each

      // Step 1: Check balance
      logStep('Step 1: Check wallet balance');
      const hasSufficientBalance = await checkSufficientBalance(wallet, '0.01');
      expect(hasSufficientBalance).toBe(true);

      // Step 2: Get initial balances
      logStep('Step 2: Record initial balances');

      const initialBalances: Record<string, string> = {};

      for (const participant of participants) {
        const balance = await getBalance(participant);
        initialBalances[participant] = balance;
        console.log(`${participant}: ${balance} ETH`);
      }

      // Step 3: Execute split payments
      logStep('Step 3: Pay all participants');

      const txHashes: string[] = [];

      for (let i = 0; i < participants.length; i++) {
        const participant = participants[i];

        console.log(`\nPayment ${i + 1}/${participants.length} to ${participant}`);

        const tx = await wallet.sendTransaction({
          to: participant,
          value: ethers.utils.parseEther(perParticipant),
        });

        logTransaction(tx);
        txHashes.push(tx.hash);

        // Wait between transactions to avoid nonce conflicts
        if (i < participants.length - 1) {
          await sleep(5000);
        }
      }

      // Step 4: Wait for all confirmations
      logStep('Step 4: Wait for all confirmations');

      const receipts: ethers.providers.TransactionReceipt[] = [];

      for (let i = 0; i < txHashes.length; i++) {
        console.log(`\nConfirming payment ${i + 1}/${txHashes.length}...`);
        const receipt = await waitForTransaction(txHashes[i], config.minConfirmations);
        assertTxSuccess(receipt);
        receipts.push(receipt);
      }

      logSuccess('All payments confirmed!');

      // Step 5: Verify balances
      logStep('Step 5: Verify all recipients received funds');

      for (const participant of participants) {
        const initialBalance = parseFloat(initialBalances[participant]);
        const finalBalance = parseFloat(await getBalance(participant));
        const increase = finalBalance - initialBalance;

        console.log(`\n${participant}:`);
        console.log(`  Initial: ${initialBalance.toFixed(6)} ETH`);
        console.log(`  Final: ${finalBalance.toFixed(6)} ETH`);
        console.log(`  Increase: ${increase.toFixed(6)} ETH`);

        expect(increase).toBeCloseTo(parseFloat(perParticipant), 4);
        logSuccess(`Received ${increase.toFixed(6)} ETH`);
      }

      // Step 6: Log final results
      logSection('Test Results');
      console.log(`✅ Split payment completed successfully`);
      console.log(`   Total Amount: ${totalAmount} ETH`);
      console.log(`   Per Participant: ${perParticipant} ETH`);
      console.log(`   Participants: ${participants.length}`);
      console.log(`\nTransactions:`);
      receipts.forEach((receipt, i) => {
        console.log(`   ${i + 1}. https://sepolia.etherscan.io/tx/${receipt.transactionHash}`);
      });
    },
    config.testTimeout
  );

  it(
    'should split ERC-20 payment to 3 participants',
    async () => {
      logSection('E2E Test: Split ERC-20 Payment (3 participants)');

      const wallet = getWalletA();
      const participants = [
        config.recipient1,
        config.recipient2,
        config.recipient3,
      ];
      const totalAmount = '3'; // 3 tokens total
      const perParticipant = '1'; // 1 token each

      // Step 1: Check token balance
      logStep('Step 1: Check token balance');
      const hasSufficientTokens = await checkSufficientTokenBalance(wallet, totalAmount);
      expect(hasSufficientTokens).toBe(true);

      // Step 2: Get initial token balances
      logStep('Step 2: Record initial token balances');

      const initialBalances: Record<string, string> = {};

      for (const participant of participants) {
        const balance = await getTokenBalance(participant);
        initialBalances[participant] = balance;
        console.log(`${participant}: ${balance} tokens`);
      }

      // Step 3: Execute token transfers
      logStep('Step 3: Transfer tokens to all participants');

      const tokenContract = getTokenContract(wallet);
      const txHashes: string[] = [];

      for (let i = 0; i < participants.length; i++) {
        const participant = participants[i];

        console.log(`\nTransfer ${i + 1}/${participants.length} to ${participant}`);

        const tx = await tokenContract.transfer(
          participant,
          ethers.utils.parseUnits(perParticipant, 6) // Assuming 6 decimals (USDC)
        );

        console.log(`📤 Token transfer sent:`);
        console.log(`   Hash: ${tx.hash}`);
        console.log(`   To: ${participant}`);
        console.log(`   Amount: ${perParticipant} tokens`);
        console.log(`   Explorer: https://sepolia.etherscan.io/tx/${tx.hash}`);

        txHashes.push(tx.hash);

        // Wait between transactions
        if (i < participants.length - 1) {
          await sleep(5000);
        }
      }

      // Step 4: Wait for all confirmations
      logStep('Step 4: Wait for all confirmations');

      const receipts: ethers.providers.TransactionReceipt[] = [];

      for (let i = 0; i < txHashes.length; i++) {
        console.log(`\nConfirming transfer ${i + 1}/${txHashes.length}...`);
        const receipt = await waitForTransaction(txHashes[i], config.minConfirmations);
        assertTxSuccess(receipt);
        receipts.push(receipt);
      }

      logSuccess('All token transfers confirmed!');

      // Step 5: Verify token balances
      logStep('Step 5: Verify all recipients received tokens');

      for (const participant of participants) {
        const initialBalance = parseFloat(initialBalances[participant]);
        const finalBalance = parseFloat(await getTokenBalance(participant));
        const increase = finalBalance - initialBalance;

        console.log(`\n${participant}:`);
        console.log(`  Initial: ${initialBalance.toFixed(2)} tokens`);
        console.log(`  Final: ${finalBalance.toFixed(2)} tokens`);
        console.log(`  Increase: ${increase.toFixed(2)} tokens`);

        expect(increase).toBeCloseTo(parseFloat(perParticipant), 2);
        logSuccess(`Received ${increase.toFixed(2)} tokens`);
      }

      // Step 6: Log final results
      logSection('Test Results');
      console.log(`✅ Split token payment completed successfully`);
      console.log(`   Total Amount: ${totalAmount} tokens`);
      console.log(`   Per Participant: ${perParticipant} tokens`);
      console.log(`   Participants: ${participants.length}`);
      console.log(`   Token: ${config.tokenAddress}`);
      console.log(`\nTransactions:`);
      receipts.forEach((receipt, i) => {
        console.log(`   ${i + 1}. https://sepolia.etherscan.io/tx/${receipt.transactionHash}`);
      });
    },
    config.testTimeout
  );

  it(
    'should handle weighted split (2:1:1)',
    async () => {
      logSection('E2E Test: Weighted Split (2:1:1)');

      const wallet = getWalletA();
      const participants = [
        { address: config.recipient1, weight: 2 }, // Gets 50%
        { address: config.recipient2, weight: 1 }, // Gets 25%
        { address: config.recipient3, weight: 1 }, // Gets 25%
      ];
      const totalAmount = 0.004; // 0.004 ETH total

      // Calculate weighted amounts
      const totalWeight = participants.reduce((sum, p) => sum + p.weight, 0);
      const amounts = participants.map(
        (p) => ((totalAmount * p.weight) / totalWeight).toFixed(6)
      );

      logStep('Weighted amounts:');
      participants.forEach((p, i) => {
        console.log(`  ${p.address} (weight ${p.weight}): ${amounts[i]} ETH`);
      });

      logStep('Execute weighted split');

      const txHashes: string[] = [];

      for (let i = 0; i < participants.length; i++) {
        const tx = await wallet.sendTransaction({
          to: participants[i].address,
          value: ethers.utils.parseEther(amounts[i]),
        });

        logTransaction(tx);
        txHashes.push(tx.hash);

        if (i < participants.length - 1) {
          await sleep(5000);
        }
      }

      logStep('Wait for confirmations');

      for (const hash of txHashes) {
        const receipt = await waitForTransaction(hash, config.minConfirmations);
        assertTxSuccess(receipt);
      }

      logSuccess('Weighted split completed!');

      logSection('Test Results');
      console.log(`✅ Weighted split (2:1:1) completed`);
      console.log(`   Total: ${totalAmount} ETH`);
      txHashes.forEach((hash, i) => {
        console.log(`   ${i + 1}. https://sepolia.etherscan.io/tx/${hash}`);
      });
    },
    config.testTimeout
  );
});
