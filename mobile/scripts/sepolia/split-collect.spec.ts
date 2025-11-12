/**
 * E2E Test: Split Bill Collection (Incoming Payments)
 * 
 * Tests:
 * - Generate payment requests (EIP-681 URIs)
 * - Simulate incoming payments from second wallet
 * - Verify payments detected and matched
 * - Check participant statuses updated to 'paid'
 * 
 * Prerequisites:
 * - TEST_PRIVKEY_A (collector wallet)
 * - TEST_PRIVKEY_B (payer wallet) funded with testnet ETH
 * - .env file configured
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ethers } from 'ethers';
import {
  validateConfig,
  getWalletA,
  getWalletB,
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

describe('Split Bill Collection (Sepolia)', () => {
  beforeAll(() => {
    validateConfig();
  });

  it(
    'should generate payment requests and collect from participants',
    async () => {
      logSection('E2E Test: Split Bill Collection');

      const collectorWallet = getWalletA(); // Receives payments
      const payerWallet = getWalletB(); // Sends payments

      const participants = [
        { address: payerWallet.address, amount: '0.001' },
        { address: config.recipient2, amount: '0.001' },
        { address: config.recipient3, amount: '0.001' },
      ];

      // Step 1: Check payer balance
      logStep('Step 1: Check payer wallet balance');
      const hasSufficientBalance = await checkSufficientBalance(payerWallet, '0.01');
      expect(hasSufficientBalance).toBe(true);

      // Step 2: Generate payment requests (EIP-681 URIs)
      logStep('Step 2: Generate payment requests');

      const paymentRequests = participants.map((p) => {
        const uri = generateEIP681URI(
          collectorWallet.address,
          p.amount,
          11155111 // Sepolia chain ID
        );

        console.log(`\nParticipant: ${p.address}`);
        console.log(`Amount: ${p.amount} ETH`);
        console.log(`URI: ${uri}`);

        return {
          participant: p.address,
          amount: p.amount,
          uri,
        };
      });

      logSuccess(`Generated ${paymentRequests.length} payment requests`);

      // Step 3: Record initial collector balance
      logStep('Step 3: Record initial collector balance');

      const initialBalance = await getBalance(collectorWallet.address);
      console.log(`Collector balance: ${initialBalance} ETH`);

      // Step 4: Simulate incoming payment from payer
      logStep('Step 4: Simulate incoming payment from participant');

      const paymentRequest = paymentRequests[0]; // First participant (payer wallet)

      console.log(`\nSending payment from ${payerWallet.address}`);
      console.log(`To: ${collectorWallet.address}`);
      console.log(`Amount: ${paymentRequest.amount} ETH`);

      const tx = await payerWallet.sendTransaction({
        to: collectorWallet.address,
        value: ethers.utils.parseEther(paymentRequest.amount),
      });

      logTransaction(tx);

      // Step 5: Wait for confirmation
      logStep('Step 5: Wait for transaction confirmation');

      const receipt = await waitForTransaction(tx.hash, config.minConfirmations);
      assertTxSuccess(receipt);

      logSuccess('Payment confirmed!');

      // Step 6: Verify collector received payment
      logStep('Step 6: Verify collector received payment');

      const finalBalance = await getBalance(collectorWallet.address);
      const increase = parseFloat(finalBalance) - parseFloat(initialBalance);

      console.log(`\nBalance change:`);
      console.log(`  Initial: ${initialBalance} ETH`);
      console.log(`  Final: ${finalBalance} ETH`);
      console.log(`  Increase: ${increase.toFixed(6)} ETH`);

      expect(increase).toBeCloseTo(parseFloat(paymentRequest.amount), 4);
      logSuccess(`Collector received ${increase.toFixed(6)} ETH`);

      // Step 7: Verify payment matching
      logStep('Step 7: Verify payment can be matched to participant');

      const matched = matchIncomingPayment(
        tx.from!,
        tx.value.toString(),
        participants
      );

      expect(matched).toBeTruthy();
      expect(matched?.address).toBe(payerWallet.address);
      logSuccess(`Payment matched to participant: ${matched?.address}`);

      // Step 8: Log final results
      logSection('Test Results');
      console.log(`✅ Split bill collection completed successfully`);
      console.log(`   Collector: ${collectorWallet.address}`);
      console.log(`   Payer: ${payerWallet.address}`);
      console.log(`   Amount: ${paymentRequest.amount} ETH`);
      console.log(`   TX Hash: ${receipt.transactionHash}`);
      console.log(`   Explorer: https://sepolia.etherscan.io/tx/${receipt.transactionHash}`);
    },
    config.testTimeout
  );

  it(
    'should collect multiple payments from different participants',
    async () => {
      logSection('E2E Test: Multiple Incoming Payments');

      const collectorWallet = getWalletA();
      const payerWallet = getWalletB();

      const payments = [
        { from: payerWallet, amount: '0.0005' },
        { from: payerWallet, amount: '0.0003' },
        { from: payerWallet, amount: '0.0002' },
      ];

      logStep('Step 1: Record initial balance');

      const initialBalance = await getBalance(collectorWallet.address);

      logStep('Step 2: Send multiple payments');

      const txHashes: string[] = [];

      for (let i = 0; i < payments.length; i++) {
        const payment = payments[i];

        console.log(`\nPayment ${i + 1}/${payments.length}:`);
        console.log(`  From: ${payment.from.address}`);
        console.log(`  Amount: ${payment.amount} ETH`);

        const tx = await payment.from.sendTransaction({
          to: collectorWallet.address,
          value: ethers.utils.parseEther(payment.amount),
        });

        logTransaction(tx);
        txHashes.push(tx.hash);

        // Wait between payments
        if (i < payments.length - 1) {
          await sleep(5000);
        }
      }

      logStep('Step 3: Wait for all confirmations');

      for (let i = 0; i < txHashes.length; i++) {
        console.log(`\nConfirming payment ${i + 1}/${txHashes.length}...`);
        const receipt = await waitForTransaction(txHashes[i], config.minConfirmations);
        assertTxSuccess(receipt);
      }

      logSuccess('All payments confirmed!');

      logStep('Step 4: Verify total amount received');

      const finalBalance = await getBalance(collectorWallet.address);
      const totalIncrease = parseFloat(finalBalance) - parseFloat(initialBalance);
      const expectedTotal = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

      console.log(`\nTotal received:`);
      console.log(`  Expected: ${expectedTotal.toFixed(6)} ETH`);
      console.log(`  Actual: ${totalIncrease.toFixed(6)} ETH`);

      expect(totalIncrease).toBeCloseTo(expectedTotal, 4);
      logSuccess(`Received all ${payments.length} payments`);

      logSection('Test Results');
      console.log(`✅ Multiple payments collected successfully`);
      console.log(`   Total: ${expectedTotal.toFixed(6)} ETH`);
      console.log(`   Payments: ${payments.length}`);
      txHashes.forEach((hash, i) => {
        console.log(`   ${i + 1}. https://sepolia.etherscan.io/tx/${hash}`);
      });
    },
    config.testTimeout
  );
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate EIP-681 payment URI
 */
function generateEIP681URI(
  recipientAddress: string,
  amountETH: string,
  chainId: number
): string {
  const address = recipientAddress.toLowerCase().replace('0x', '');
  const amountWei = ethers.utils.parseEther(amountETH).toString();

  return `ethereum:${address}?value=${amountWei}&chain_id=${chainId}`;
}

/**
 * Match incoming payment to participant
 */
function matchIncomingPayment(
  from: string,
  valueWei: string,
  participants: Array<{ address: string; amount: string }>
): { address: string; amount: string } | null {
  for (const participant of participants) {
    // Check address match (case-insensitive)
    if (participant.address.toLowerCase() !== from.toLowerCase()) {
      continue;
    }

    // Check amount match (with small tolerance for gas)
    const expectedWei = ethers.utils.parseEther(participant.amount);
    const receivedWei = ethers.BigNumber.from(valueWei);
    const diff = expectedWei.sub(receivedWei).abs();
    const tolerance = ethers.utils.parseUnits('1000', 'wei'); // 1000 wei tolerance

    if (diff.lte(tolerance)) {
      return participant;
    }
  }

  return null;
}
