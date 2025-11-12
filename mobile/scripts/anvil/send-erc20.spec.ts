/**
 * Anvil Test: Send ERC-20
 * 
 * Fast deterministic token tests on local node
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const ANVIL_RPC = process.env.ANVIL_RPC_URL || 'http://127.0.0.1:8545';
const ANVIL_PRIVKEY = process.env.ANVIL_PRIVKEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const ANVIL_RECIPIENT = process.env.ANVIL_RECIPIENT || '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const TEST_TOKEN_ADDRESS = process.env.TEST_TOKEN_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

describe('E2E: Send ERC-20 on Anvil', () => {
  let provider: ethers.providers.JsonRpcProvider;
  let wallet: ethers.Wallet;
  let token: ethers.Contract;
  let tokenSymbol: string;
  let tokenDecimals: number;

  beforeAll(async () => {
    provider = new ethers.providers.JsonRpcProvider(ANVIL_RPC);
    wallet = new ethers.Wallet(ANVIL_PRIVKEY, provider);
    token = new ethers.Contract(TEST_TOKEN_ADDRESS, ERC20_ABI, wallet);

    tokenSymbol = await token.symbol();
    tokenDecimals = await token.decimals();

    console.log('\n🔧 Test Configuration:');
    console.log(`   Network: Anvil (local)`);
    console.log(`   RPC: ${ANVIL_RPC}`);
    console.log(`   Sender: ${wallet.address}`);
    console.log(`   Recipient: ${ANVIL_RECIPIENT}`);
    console.log(`   Token: ${TEST_TOKEN_ADDRESS}`);
    console.log(`   Symbol: ${tokenSymbol}`);
    console.log(`   Decimals: ${tokenDecimals}\n`);
  });

  it('should get token metadata', async () => {
    console.log('📋 Getting metadata...');

    const name = await token.name();
    const symbol = await token.symbol();
    const decimals = await token.decimals();

    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Decimals: ${decimals}`);

    expect(name).toBe('Test Token');
    expect(symbol).toBe('TEST');
    expect(decimals).toBe(18);

    console.log('   ✅ Metadata correct\n');
  });

  it('should have 10000 TEST balance', async () => {
    console.log('💰 Checking balance...');

    const balance = await token.balanceOf(wallet.address);
    const balanceFormatted = ethers.utils.formatEther(balance);

    console.log(`   Balance: ${balanceFormatted} ${tokenSymbol}`);

    // Should have 10000 TEST from reset script
    expect(parseFloat(balanceFormatted)).toBe(10000);
    console.log('   ✅ Has 10000 TEST\n');
  });

  it('should send tokens instantly', async () => {
    console.log(`📤 Sending ${tokenSymbol}...`);

    const amount = ethers.utils.parseEther('100'); // 100 tokens

    // Get balances before
    const senderBefore = await token.balanceOf(wallet.address);
    const recipientBefore = await token.balanceOf(ANVIL_RECIPIENT);

    console.log(`   Sender (before): ${ethers.utils.formatEther(senderBefore)} ${tokenSymbol}`);
    console.log(`   Recipient (before): ${ethers.utils.formatEther(recipientBefore)} ${tokenSymbol}`);
    console.log(`   Amount: ${ethers.utils.formatEther(amount)} ${tokenSymbol}`);

    // Send transaction
    const tx = await token.transfer(ANVIL_RECIPIENT, amount);

    console.log(`\n   ✅ Transaction sent: ${tx.hash}`);

    // Wait for confirmation (instant on Anvil!)
    const receipt = await tx.wait();

    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);

    expect(receipt.status).toBe(1);

    // Check balances after
    const senderAfter = await token.balanceOf(wallet.address);
    const recipientAfter = await token.balanceOf(ANVIL_RECIPIENT);

    console.log(`\n   Sender (after): ${ethers.utils.formatEther(senderAfter)} ${tokenSymbol}`);
    console.log(`   Recipient (after): ${ethers.utils.formatEther(recipientAfter)} ${tokenSymbol}`);

    const senderDecrease = senderBefore.sub(senderAfter);
    const recipientIncrease = recipientAfter.sub(recipientBefore);

    console.log(`\n   📊 Changes:`);
    console.log(`   Sender: -${ethers.utils.formatEther(senderDecrease)} ${tokenSymbol}`);
    console.log(`   Recipient: +${ethers.utils.formatEther(recipientIncrease)} ${tokenSymbol}`);

    // Verify amounts
    expect(senderDecrease.toString()).toBe(amount.toString());
    expect(recipientIncrease.toString()).toBe(amount.toString());

    console.log('\n   ✅ Transaction verified!\n');
  });

  it('should handle insufficient balance error', async () => {
    console.log('🧪 Testing insufficient balance...');

    const balance = await token.balanceOf(wallet.address);
    const tooMuch = balance.add(ethers.utils.parseEther('1000'));

    console.log(`   Balance: ${ethers.utils.formatEther(balance)} ${tokenSymbol}`);
    console.log(`   Trying: ${ethers.utils.formatEther(tooMuch)} ${tokenSymbol}`);

    await expect(
      token.transfer(ANVIL_RECIPIENT, tooMuch)
    ).rejects.toThrow();

    console.log('   ✅ Error handled\n');
  });
});
