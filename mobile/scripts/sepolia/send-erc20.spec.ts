/**
 * E2E Test: Send ERC-20 on Sepolia
 * 
 * Real token transactions on testnet without mocks
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
const TEST_TOKEN_ADDRESS = process.env.TEST_TOKEN_ADDRESS;
const MIN_CONFIRMATIONS = parseInt(process.env.MIN_CONFIRMATIONS || '2', 10);
const RATE_LIMIT_MS = parseInt(process.env.RPC_RATE_LIMIT_MS || '1000', 10);

// Minimal ERC-20 ABI
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

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

describe('E2E: Send ERC-20 on Sepolia', () => {
  let provider: ethers.providers.JsonRpcProvider;
  let wallet: ethers.Wallet;
  let tokenContract: ethers.Contract;
  let tokenDecimals: number;
  let tokenSymbol: string;

  beforeAll(async () => {
    if (!TEST_PRIVKEY) {
      throw new Error('TEST_PRIVKEY not set in .env');
    }
    if (!TEST_RECIPIENT) {
      throw new Error('TEST_RECIPIENT not set in .env');
    }
    if (!TEST_TOKEN_ADDRESS) {
      throw new Error('TEST_TOKEN_ADDRESS not set in .env');
    }

    provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
    wallet = new ethers.Wallet(TEST_PRIVKEY, provider);
    tokenContract = new ethers.Contract(TEST_TOKEN_ADDRESS, ERC20_ABI, wallet);

    // Get token metadata
    tokenSymbol = await retry(() => tokenContract.symbol());
    tokenDecimals = await retry(() => tokenContract.decimals());

    console.log('\n🔧 Test Configuration:');
    console.log(`   Network: Sepolia`);
    console.log(`   RPC: ${SEPOLIA_RPC}`);
    console.log(`   Sender: ${wallet.address}`);
    console.log(`   Recipient: ${TEST_RECIPIENT}`);
    console.log(`   Token: ${TEST_TOKEN_ADDRESS}`);
    console.log(`   Symbol: ${tokenSymbol}`);
    console.log(`   Decimals: ${tokenDecimals}`);
    console.log(`   Min Confirmations: ${MIN_CONFIRMATIONS}`);
    console.log(`   Rate Limit: ${RATE_LIMIT_MS}ms\n`);

    await sleep(RATE_LIMIT_MS);
  });

  it('should get token metadata', async () => {
    console.log('📋 Getting token metadata...');

    const name = await retry(() => tokenContract.name());
    const symbol = await retry(() => tokenContract.symbol());
    const decimals = await retry(() => tokenContract.decimals());

    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Decimals: ${decimals}`);

    expect(name).toBeDefined();
    expect(symbol).toBeDefined();
    expect(decimals).toBeGreaterThan(0);

    console.log('   ✅ Metadata retrieved\n');

    await sleep(RATE_LIMIT_MS);
  }, 30000);

  it('should have token balance', async () => {
    console.log('💰 Checking token balance...');

    const balance = await retry(() => tokenContract.balanceOf(wallet.address));
    const balanceFormatted = ethers.utils.formatUnits(balance, tokenDecimals);

    console.log(`   Balance: ${balanceFormatted} ${tokenSymbol}`);

    expect(balance.gt(0)).toBe(true);
    console.log('   ✅ Has token balance\n');

    await sleep(RATE_LIMIT_MS);
  }, 30000);

  it('should send tokens and wait for confirmations', async () => {
    console.log(`📤 Sending ${tokenSymbol} tokens...`);

    // Get balances before
    const senderBalanceBefore = await retry(() => tokenContract.balanceOf(wallet.address));
    const recipientBalanceBefore = await retry(() => tokenContract.balanceOf(TEST_RECIPIENT!));

    console.log(`   Sender balance (before): ${ethers.utils.formatUnits(senderBalanceBefore, tokenDecimals)} ${tokenSymbol}`);
    console.log(`   Recipient balance (before): ${ethers.utils.formatUnits(recipientBalanceBefore, tokenDecimals)} ${tokenSymbol}`);

    // Send small amount (1% of balance or 1 token, whichever is smaller)
    const oneToken = ethers.utils.parseUnits('1', tokenDecimals);
    const onePercent = senderBalanceBefore.div(100);
    const amount = onePercent.lt(oneToken) ? onePercent : oneToken;

    if (amount.isZero()) {
      console.log('   ⚠️  Balance too small, using minimum amount');
      amount.add(1);
    }

    console.log(`   Amount to send: ${ethers.utils.formatUnits(amount, tokenDecimals)} ${tokenSymbol}`);

    await sleep(RATE_LIMIT_MS);

    // Send transaction
    const tx = await retry(() => tokenContract.transfer(TEST_RECIPIENT, amount));

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

    // Check for Transfer event
    const transferEvent = receipt.logs.find((log: any) => {
      try {
        const parsed = tokenContract.interface.parseLog(log);
        return parsed.name === 'Transfer';
      } catch {
        return false;
      }
    });

    expect(transferEvent).toBeDefined();
    console.log('   ✅ Transfer event found');

    await sleep(RATE_LIMIT_MS);

    // Check balances after
    const senderBalanceAfter = await retry(() => tokenContract.balanceOf(wallet.address));
    const recipientBalanceAfter = await retry(() => tokenContract.balanceOf(TEST_RECIPIENT!));

    console.log(`\n   💰 Sender balance (after): ${ethers.utils.formatUnits(senderBalanceAfter, tokenDecimals)} ${tokenSymbol}`);
    console.log(`   💰 Recipient balance (after): ${ethers.utils.formatUnits(recipientBalanceAfter, tokenDecimals)} ${tokenSymbol}`);

    const senderDecrease = senderBalanceBefore.sub(senderBalanceAfter);
    const recipientIncrease = recipientBalanceAfter.sub(recipientBalanceBefore);

    console.log(`\n   📊 Changes:`);
    console.log(`   Sender: -${ethers.utils.formatUnits(senderDecrease, tokenDecimals)} ${tokenSymbol}`);
    console.log(`   Recipient: +${ethers.utils.formatUnits(recipientIncrease, tokenDecimals)} ${tokenSymbol}`);

    // Verify amounts
    expect(senderDecrease.toString()).toBe(amount.toString());
    expect(recipientIncrease.toString()).toBe(amount.toString());

    console.log('\n   ✅ Transaction verified!\n');
  }, 120000); // 2 minutes timeout

  it('should handle insufficient token balance error', async () => {
    console.log('🧪 Testing insufficient token balance error...');

    const balance = await retry(() => tokenContract.balanceOf(wallet.address));
    const tooMuchAmount = balance.add(ethers.utils.parseUnits('1000', tokenDecimals));

    console.log(`   Balance: ${ethers.utils.formatUnits(balance, tokenDecimals)} ${tokenSymbol}`);
    console.log(`   Trying to send: ${ethers.utils.formatUnits(tooMuchAmount, tokenDecimals)} ${tokenSymbol}`);

    await sleep(RATE_LIMIT_MS);

    await expect(
      tokenContract.transfer(TEST_RECIPIENT!, tooMuchAmount)
    ).rejects.toThrow();

    console.log('   ✅ Error handled correctly\n');
  }, 30000);

  it('should estimate gas for token transfer', async () => {
    console.log('⛽ Testing gas estimation...');

    const amount = ethers.utils.parseUnits('1', tokenDecimals);

    const gasEstimate = await retry(() =>
      tokenContract.estimateGas.transfer(TEST_RECIPIENT, amount)
    );

    console.log(`   Estimated gas: ${gasEstimate.toString()}`);

    expect(gasEstimate.toNumber()).toBeGreaterThan(0);
    expect(gasEstimate.toNumber()).toBeLessThan(200000); // Reasonable limit for ERC-20 transfer

    console.log('   ✅ Gas estimation successful\n');

    await sleep(RATE_LIMIT_MS);
  }, 30000);

  it('should query Transfer events', async () => {
    console.log('📜 Testing Transfer event query...');

    const currentBlock = await retry(() => provider.getBlockNumber());
    const fromBlock = Math.max(0, currentBlock - 1000); // Last 1000 blocks

    console.log(`   Querying blocks ${fromBlock} to ${currentBlock}...`);

    await sleep(RATE_LIMIT_MS);

    const filter = tokenContract.filters.Transfer(wallet.address, null);
    const events = await retry(() =>
      tokenContract.queryFilter(filter, fromBlock, currentBlock)
    );

    console.log(`   Found ${events.length} Transfer events from sender`);

    if (events.length > 0) {
      const latestEvent = events[events.length - 1];
      console.log(`   Latest event:`);
      console.log(`     Block: ${latestEvent.blockNumber}`);
      console.log(`     Hash: ${latestEvent.transactionHash}`);
      console.log(`     From: ${latestEvent.args?.from}`);
      console.log(`     To: ${latestEvent.args?.to}`);
      console.log(`     Amount: ${ethers.utils.formatUnits(latestEvent.args?.value || 0, tokenDecimals)} ${tokenSymbol}`);
    }

    console.log('   ✅ Event query successful\n');

    await sleep(RATE_LIMIT_MS);
  }, 60000);

  it('should check ETH balance for gas', async () => {
    console.log('⛽ Checking ETH balance for gas...');

    const ethBalance = await retry(() => provider.getBalance(wallet.address));
    const ethBalanceFormatted = ethers.utils.formatEther(ethBalance);

    console.log(`   ETH Balance: ${ethBalanceFormatted} ETH`);

    // Should have at least 0.001 ETH for gas
    const minRequired = ethers.utils.parseEther('0.001');
    expect(ethBalance.gte(minRequired)).toBe(true);

    console.log('   ✅ Sufficient ETH for gas\n');

    await sleep(RATE_LIMIT_MS);
  }, 30000);
});
