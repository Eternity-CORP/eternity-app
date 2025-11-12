/**
 * E2E Test: Send ETH on Sepolia
 * 
 * Real transactions on testnet without mocks
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
const TEST_PRIVKEY = process.env.TEST_PRIVKEY;
const TEST_RECIPIENT = process.env.TEST_RECIPIENT;
const MIN_CONFIRMATIONS = parseInt(process.env.MIN_CONFIRMATIONS || '2', 10);
const RATE_LIMIT_MS = parseInt(process.env.RPC_RATE_LIMIT_MS || '1000', 10);

// Test amount (small to conserve testnet ETH)
const TEST_AMOUNT_ETH = '0.001';

// Helper: Wait with rate limiting
async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: Retry with exponential backoff
async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.log(`   ⚠️  Attempt ${attempt}/${maxAttempts} failed: ${(error as Error).message}`);

      if (attempt < maxAttempts) {
        const waitTime = delayMs * Math.pow(2, attempt - 1);
        console.log(`   ⏳ Waiting ${waitTime}ms before retry...`);
        await sleep(waitTime);
      }
    }
  }

  throw lastError;
}

describe('E2E: Send ETH on Sepolia', () => {
  let provider: ethers.providers.JsonRpcProvider;
  let wallet: ethers.Wallet;

  beforeAll(() => {
    if (!TEST_PRIVKEY) {
      throw new Error('TEST_PRIVKEY not set in .env');
    }
    if (!TEST_RECIPIENT) {
      throw new Error('TEST_RECIPIENT not set in .env');
    }

    provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
    wallet = new ethers.Wallet(TEST_PRIVKEY, provider);

    console.log('\n🔧 Test Configuration:');
    console.log(`   Network: Sepolia`);
    console.log(`   RPC: ${SEPOLIA_RPC}`);
    console.log(`   Sender: ${wallet.address}`);
    console.log(`   Recipient: ${TEST_RECIPIENT}`);
    console.log(`   Amount: ${TEST_AMOUNT_ETH} ETH`);
    console.log(`   Min Confirmations: ${MIN_CONFIRMATIONS}`);
    console.log(`   Rate Limit: ${RATE_LIMIT_MS}ms\n`);
  });

  it('should have sufficient balance', async () => {
    console.log('💰 Checking balance...');

    const balance = await retry(() => provider.getBalance(wallet.address));
    const balanceETH = ethers.utils.formatEther(balance);

    console.log(`   Balance: ${balanceETH} ETH`);

    const requiredAmount = ethers.utils.parseEther(TEST_AMOUNT_ETH);
    const estimatedGas = ethers.utils.parseEther('0.001'); // ~0.001 ETH for gas
    const totalRequired = requiredAmount.add(estimatedGas);

    expect(balance.gte(totalRequired)).toBe(true);
    console.log('   ✅ Sufficient balance\n');

    await sleep(RATE_LIMIT_MS);
  }, 30000);

  it('should send ETH and wait for confirmations', async () => {
    console.log('📤 Sending ETH transaction...');

    const amountWei = ethers.utils.parseEther(TEST_AMOUNT_ETH);

    // Get balances before
    const senderBalanceBefore = await retry(() => provider.getBalance(wallet.address));
    const recipientBalanceBefore = await retry(() => provider.getBalance(TEST_RECIPIENT!));

    console.log(`   Sender balance (before): ${ethers.utils.formatEther(senderBalanceBefore)} ETH`);
    console.log(`   Recipient balance (before): ${ethers.utils.formatEther(recipientBalanceBefore)} ETH`);

    await sleep(RATE_LIMIT_MS);

    // Send transaction
    const tx = await retry(() =>
      wallet.sendTransaction({
        to: TEST_RECIPIENT,
        value: amountWei,
      })
    );

    console.log(`\n   ✅ Transaction sent!`);
    console.log(`   Hash: ${tx.hash}`);
    console.log(`   Nonce: ${tx.nonce}`);
    console.log(`   Explorer: https://sepolia.etherscan.io/tx/${tx.hash}\n`);

    expect(tx.hash).toBeDefined();
    expect(tx.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);

    await sleep(RATE_LIMIT_MS);

    // Wait for confirmations
    console.log(`   ⏳ Waiting for ${MIN_CONFIRMATIONS} confirmations...`);

    const receipt = await retry(
      () => tx.wait(MIN_CONFIRMATIONS),
      5,
      2000
    );

    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
    console.log(`   Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`   Effective gas price: ${ethers.utils.formatUnits(receipt.effectiveGasPrice, 'gwei')} Gwei`);

    const gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);
    console.log(`   Gas cost: ${ethers.utils.formatEther(gasCost)} ETH\n`);

    expect(receipt.status).toBe(1);
    expect(receipt.blockNumber).toBeGreaterThan(0);
    expect(receipt.confirmations).toBeGreaterThanOrEqual(MIN_CONFIRMATIONS);

    await sleep(RATE_LIMIT_MS);

    // Check balances after
    const senderBalanceAfter = await retry(() => provider.getBalance(wallet.address));
    const recipientBalanceAfter = await retry(() => provider.getBalance(TEST_RECIPIENT));

    console.log(`   💰 Sender balance (after): ${ethers.utils.formatEther(senderBalanceAfter)} ETH`);
    console.log(`   💰 Recipient balance (after): ${ethers.utils.formatEther(recipientBalanceAfter)} ETH`);

    const senderDecrease = senderBalanceBefore.sub(senderBalanceAfter);
    const recipientIncrease = recipientBalanceAfter.sub(recipientBalanceBefore);

    console.log(`\n   📊 Changes:`);
    console.log(`   Sender: -${ethers.utils.formatEther(senderDecrease)} ETH (amount + gas)`);
    console.log(`   Recipient: +${ethers.utils.formatEther(recipientIncrease)} ETH`);

    // Verify recipient received the amount
    expect(recipientIncrease.toString()).toBe(amountWei.toString());

    // Verify sender paid amount + gas
    const expectedDecrease = amountWei.add(gasCost);
    expect(senderDecrease.toString()).toBe(expectedDecrease.toString());

    console.log('\n   ✅ Transaction verified!\n');
  }, 120000); // 2 minutes timeout

  it('should handle insufficient funds error', async () => {
    console.log('🧪 Testing insufficient funds error...');

    const balance = await retry(() => provider.getBalance(wallet.address));
    const tooMuchAmount = balance.add(ethers.utils.parseEther('1')); // More than balance

    console.log(`   Balance: ${ethers.utils.formatEther(balance)} ETH`);
    console.log(`   Trying to send: ${ethers.utils.formatEther(tooMuchAmount)} ETH`);

    await sleep(RATE_LIMIT_MS);

    await expect(
      wallet.sendTransaction({
        to: TEST_RECIPIENT!,
        value: tooMuchAmount,
      })
    ).rejects.toThrow(/insufficient funds/i);

    console.log('   ✅ Error handled correctly\n');
  }, 30000);

  it('should handle invalid address error', async () => {
    console.log('🧪 Testing invalid address error...');

    const invalidAddress = '0xinvalid';
    const amount = ethers.utils.parseEther('0.001');

    console.log(`   Invalid address: ${invalidAddress}`);

    await expect(
      wallet.sendTransaction({
        to: invalidAddress,
        value: amount,
      })
    ).rejects.toThrow();

    console.log('   ✅ Error handled correctly\n');
  }, 30000);

  it('should estimate gas correctly', async () => {
    console.log('⛽ Testing gas estimation...');

    const amount = ethers.utils.parseEther(TEST_AMOUNT_ETH);

    const gasEstimate = await retry(() =>
      provider.estimateGas({
        from: wallet.address,
        to: TEST_RECIPIENT,
        value: amount,
      })
    );

    console.log(`   Estimated gas: ${gasEstimate.toString()}`);

    expect(gasEstimate.toNumber()).toBeGreaterThan(0);
    expect(gasEstimate.toNumber()).toBeLessThan(100000); // Reasonable limit for simple transfer

    console.log('   ✅ Gas estimation successful\n');

    await sleep(RATE_LIMIT_MS);
  }, 30000);

  it('should get current gas price', async () => {
    console.log('⛽ Testing gas price retrieval...');

    const gasPrice = await retry(() => provider.getGasPrice());
    const gasPriceGwei = ethers.utils.formatUnits(gasPrice, 'gwei');

    console.log(`   Gas price: ${gasPriceGwei} Gwei`);

    expect(gasPrice.toNumber()).toBeGreaterThan(0);

    console.log('   ✅ Gas price retrieved\n');

    await sleep(RATE_LIMIT_MS);
  }, 30000);

  it('should get block with base fee (EIP-1559)', async () => {
    console.log('📦 Testing block retrieval...');

    const block = await retry(() => provider.getBlock('latest'));

    console.log(`   Block number: ${block.number}`);
    console.log(`   Block hash: ${block.hash}`);
    console.log(`   Timestamp: ${new Date(block.timestamp * 1000).toISOString()}`);

    if (block.baseFeePerGas) {
      const baseFeeGwei = ethers.utils.formatUnits(block.baseFeePerGas, 'gwei');
      console.log(`   Base fee: ${baseFeeGwei} Gwei`);
      expect(block.baseFeePerGas.toNumber()).toBeGreaterThan(0);
    }

    expect(block.number).toBeGreaterThan(0);
    expect(block.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);

    console.log('   ✅ Block retrieved\n');

    await sleep(RATE_LIMIT_MS);
  }, 30000);
});
