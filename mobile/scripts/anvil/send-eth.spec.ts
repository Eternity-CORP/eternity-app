/**
 * Anvil Test: Send ETH
 * 
 * Fast deterministic tests on local node
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

describe('E2E: Send ETH on Anvil', () => {
  let provider: ethers.providers.JsonRpcProvider;
  let wallet: ethers.Wallet;

  beforeAll(() => {
    provider = new ethers.providers.JsonRpcProvider(ANVIL_RPC);
    wallet = new ethers.Wallet(ANVIL_PRIVKEY, provider);

    console.log('\n🔧 Test Configuration:');
    console.log(`   Network: Anvil (local)`);
    console.log(`   RPC: ${ANVIL_RPC}`);
    console.log(`   Sender: ${wallet.address}`);
    console.log(`   Recipient: ${ANVIL_RECIPIENT}\n`);
  });

  it('should have 10000 ETH balance', async () => {
    console.log('💰 Checking balance...');

    const balance = await provider.getBalance(wallet.address);
    const balanceETH = ethers.utils.formatEther(balance);

    console.log(`   Balance: ${balanceETH} ETH`);

    // Anvil accounts start with 10000 ETH
    expect(parseFloat(balanceETH)).toBeGreaterThan(9999);
    console.log('   ✅ Has 10000 ETH\n');
  });

  it('should send ETH instantly', async () => {
    console.log('📤 Sending ETH...');

    const amount = ethers.utils.parseEther('1.0');

    // Get balances before
    const senderBefore = await provider.getBalance(wallet.address);
    const recipientBefore = await provider.getBalance(ANVIL_RECIPIENT);

    console.log(`   Sender (before): ${ethers.utils.formatEther(senderBefore)} ETH`);
    console.log(`   Recipient (before): ${ethers.utils.formatEther(recipientBefore)} ETH`);

    // Send transaction
    const tx = await wallet.sendTransaction({
      to: ANVIL_RECIPIENT,
      value: amount,
    });

    console.log(`\n   ✅ Transaction sent: ${tx.hash}`);

    // Wait for confirmation (instant on Anvil!)
    const receipt = await tx.wait();

    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);

    const gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);
    console.log(`   Gas cost: ${ethers.utils.formatEther(gasCost)} ETH\n`);

    expect(receipt.status).toBe(1);

    // Check balances after
    const senderAfter = await provider.getBalance(wallet.address);
    const recipientAfter = await provider.getBalance(ANVIL_RECIPIENT);

    console.log(`   Sender (after): ${ethers.utils.formatEther(senderAfter)} ETH`);
    console.log(`   Recipient (after): ${ethers.utils.formatEther(recipientAfter)} ETH`);

    const senderDecrease = senderBefore.sub(senderAfter);
    const recipientIncrease = recipientAfter.sub(recipientBefore);

    console.log(`\n   📊 Changes:`);
    console.log(`   Sender: -${ethers.utils.formatEther(senderDecrease)} ETH`);
    console.log(`   Recipient: +${ethers.utils.formatEther(recipientIncrease)} ETH`);

    // Verify recipient received exactly 1 ETH
    expect(recipientIncrease.toString()).toBe(amount.toString());

    // Verify sender paid amount + gas
    const expectedDecrease = amount.add(gasCost);
    expect(senderDecrease.toString()).toBe(expectedDecrease.toString());

    console.log('\n   ✅ Transaction verified!\n');
  });

  it('should handle insufficient funds error', async () => {
    console.log('🧪 Testing insufficient funds...');

    const balance = await provider.getBalance(wallet.address);
    const tooMuch = balance.add(ethers.utils.parseEther('1'));

    console.log(`   Balance: ${ethers.utils.formatEther(balance)} ETH`);
    console.log(`   Trying: ${ethers.utils.formatEther(tooMuch)} ETH`);

    await expect(
      wallet.sendTransaction({
        to: ANVIL_RECIPIENT,
        value: tooMuch,
      })
    ).rejects.toThrow(/insufficient funds/i);

    console.log('   ✅ Error handled\n');
  });

  it('should estimate gas correctly', async () => {
    console.log('⛽ Estimating gas...');

    const amount = ethers.utils.parseEther('1.0');

    const gasEstimate = await provider.estimateGas({
      from: wallet.address,
      to: ANVIL_RECIPIENT,
      value: amount,
    });

    console.log(`   Estimated gas: ${gasEstimate.toString()}`);

    expect(gasEstimate.toNumber()).toBe(21000); // Standard ETH transfer
    console.log('   ✅ Correct (21000)\n');
  });
});
