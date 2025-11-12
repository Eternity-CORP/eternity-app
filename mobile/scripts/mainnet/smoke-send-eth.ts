/**
 * Mainnet Smoke Test: Send ETH
 * 
 * ⚠️ WARNING: This sends REAL ETH on MAINNET
 * 
 * Safety features:
 * - Very small amount (0.0001 ETH by default)
 * - Sends to your own address (no loss)
 * - Manual execution only
 * - Requires explicit confirmation
 * - Waits for 2+ confirmations
 * 
 * ONLY run after completing docs/prod-checklist.md
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as readline from 'readline';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MAINNET_RPC = process.env.EXPO_PUBLIC_ALCHEMY_MAINNET_URL || 
                    process.env.EXPO_PUBLIC_PUBLIC_MAINNET_URL ||
                    'https://ethereum-rpc.publicnode.com';

const MAINNET_ENABLED = process.env.EXPO_PUBLIC_MAINNET_ENABLED === 'true';
const MAINNET_MAX_AMOUNT = parseFloat(process.env.EXPO_PUBLIC_MAINNET_MAX_AMOUNT || '0.1');

// Smoke test configuration
const SMOKE_AMOUNT_ETH = '0.0001'; // Very small amount
const MIN_CONFIRMATIONS = 2;

// ============================================================================
// Helpers
// ============================================================================

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function confirmAction(message: string): Promise<boolean> {
  const answer = await askQuestion(`${message} (yes/no): `);
  return answer.toLowerCase() === 'yes';
}

// ============================================================================
// Smoke Test
// ============================================================================

async function smokeTest() {
  console.log('🔥 MAINNET SMOKE TEST\n');
  console.log('⚠️  WARNING: This will send REAL ETH on MAINNET\n');

  // Check if mainnet is enabled
  if (!MAINNET_ENABLED) {
    console.log('❌ Mainnet is DISABLED');
    console.log('\nTo enable:');
    console.log('1. Complete docs/prod-checklist.md');
    console.log('2. Set EXPO_PUBLIC_MAINNET_ENABLED=true in .env');
    console.log('3. Run this script again\n');
    process.exit(1);
  }

  console.log('✅ Mainnet is ENABLED\n');

  // Get private key
  const privkey = await askQuestion('Enter your private key (will not be stored): ');
  
  if (!privkey || !privkey.startsWith('0x')) {
    console.log('❌ Invalid private key');
    process.exit(1);
  }

  try {
    // Connect to mainnet
    console.log('\n📡 Connecting to mainnet...');
    console.log(`   RPC: ${MAINNET_RPC}`);
    
    const provider = new ethers.providers.JsonRpcProvider(MAINNET_RPC);
    const wallet = new ethers.Wallet(privkey, provider);

    // Verify network
    const network = await provider.getNetwork();
    console.log(`   Network: ${network.name} (Chain ID: ${network.chainId})`);

    if (network.chainId !== 1) {
      console.log('❌ Not connected to mainnet!');
      process.exit(1);
    }

    console.log('✅ Connected to mainnet\n');

    // Get address and balance
    const address = wallet.address;
    const balance = await provider.getBalance(address);
    const balanceETH = ethers.utils.formatEther(balance);

    console.log('💰 Wallet Info:');
    console.log(`   Address: ${address}`);
    console.log(`   Balance: ${balanceETH} ETH\n`);

    // Check balance
    const smokeAmount = ethers.utils.parseEther(SMOKE_AMOUNT_ETH);
    const estimatedGas = ethers.utils.parseEther('0.001'); // ~0.001 ETH for gas
    const totalRequired = smokeAmount.add(estimatedGas);

    if (balance.lt(totalRequired)) {
      console.log('❌ Insufficient balance');
      console.log(`   Required: ${ethers.utils.formatEther(totalRequired)} ETH`);
      console.log(`   Available: ${balanceETH} ETH\n`);
      process.exit(1);
    }

    // Check amount limit
    const smokeAmountFloat = parseFloat(SMOKE_AMOUNT_ETH);
    if (smokeAmountFloat > MAINNET_MAX_AMOUNT) {
      console.log('❌ Smoke amount exceeds mainnet limit');
      console.log(`   Smoke amount: ${SMOKE_AMOUNT_ETH} ETH`);
      console.log(`   Max allowed: ${MAINNET_MAX_AMOUNT} ETH\n`);
      process.exit(1);
    }

    // Show transaction details
    console.log('📋 Transaction Details:');
    console.log(`   From: ${address}`);
    console.log(`   To: ${address} (self)`);
    console.log(`   Amount: ${SMOKE_AMOUNT_ETH} ETH`);
    console.log(`   Network: Mainnet`);
    console.log(`   Confirmations: ${MIN_CONFIRMATIONS}\n`);

    // Get gas price
    const gasPrice = await provider.getGasPrice();
    const gasPriceGwei = ethers.utils.formatUnits(gasPrice, 'gwei');
    console.log(`⛽ Gas Price: ${gasPriceGwei} Gwei\n`);

    // Estimate total cost
    const gasLimit = 21000;
    const gasCost = gasPrice.mul(gasLimit);
    const totalCost = smokeAmount.add(gasCost);
    console.log(`💸 Estimated Cost:`);
    console.log(`   Amount: ${SMOKE_AMOUNT_ETH} ETH`);
    console.log(`   Gas: ${ethers.utils.formatEther(gasCost)} ETH`);
    console.log(`   Total: ${ethers.utils.formatEther(totalCost)} ETH\n`);

    // Final confirmation
    console.log('⚠️  FINAL CONFIRMATION\n');
    console.log('This will send REAL ETH on MAINNET.');
    console.log('The transaction cannot be undone.\n');
    console.log('Have you completed docs/prod-checklist.md?');
    
    const checklistConfirmed = await confirmAction('I have completed the prod checklist');
    if (!checklistConfirmed) {
      console.log('\n❌ Cancelled - Complete prod-checklist.md first\n');
      process.exit(0);
    }

    const finalConfirmed = await confirmAction('\nProceed with mainnet transaction?');
    if (!finalConfirmed) {
      console.log('\n❌ Cancelled by user\n');
      process.exit(0);
    }

    // Send transaction
    console.log('\n📤 Sending transaction...');
    
    const tx = await wallet.sendTransaction({
      to: address,
      value: smokeAmount,
    });

    console.log('\n✅ Transaction sent!');
    console.log(`   Hash: ${tx.hash}`);
    console.log(`   Nonce: ${tx.nonce}`);
    console.log(`   Explorer: https://etherscan.io/tx/${tx.hash}\n`);

    // Wait for confirmations
    console.log(`⏳ Waiting for ${MIN_CONFIRMATIONS} confirmations...`);
    console.log('   (This may take a few minutes)\n');

    const receipt = await tx.wait(MIN_CONFIRMATIONS);

    console.log('✅ Transaction confirmed!');
    console.log(`   Block: ${receipt.blockNumber}`);
    console.log(`   Status: ${receipt.status === 1 ? 'Success' : 'Failed'}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
    console.log(`   Effective gas price: ${ethers.utils.formatUnits(receipt.effectiveGasPrice, 'gwei')} Gwei`);

    const actualGasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);
    console.log(`   Actual gas cost: ${ethers.utils.formatEther(actualGasCost)} ETH\n`);

    // Verify balance
    const balanceAfter = await provider.getBalance(address);
    const balanceAfterETH = ethers.utils.formatEther(balanceAfter);
    const balanceChange = balance.sub(balanceAfter);

    console.log('💰 Final Balance:');
    console.log(`   Before: ${balanceETH} ETH`);
    console.log(`   After: ${balanceAfterETH} ETH`);
    console.log(`   Change: -${ethers.utils.formatEther(balanceChange)} ETH (gas only)\n`);

    // Success
    console.log('🎉 SMOKE TEST PASSED!\n');
    console.log('✅ Mainnet transaction successful');
    console.log('✅ Funds returned to sender (minus gas)');
    console.log(`✅ ${MIN_CONFIRMATIONS}+ confirmations received\n`);

    console.log('📝 Next Steps:');
    console.log('1. Document this test in your release notes');
    console.log('2. Monitor the transaction on Etherscan');
    console.log('3. Proceed with production deployment\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.log('\n💡 Tip: Add more ETH to your wallet');
    } else if (error.code === 'NETWORK_ERROR') {
      console.log('\n💡 Tip: Check your internet connection and RPC URL');
    }
    
    console.log('');
    process.exit(1);
  }
}

// ============================================================================
// Main
// ============================================================================

console.log('═'.repeat(60));
console.log('  MAINNET SMOKE TEST - SEND ETH');
console.log('═'.repeat(60));
console.log('');
console.log('⚠️  WARNING: This script sends REAL ETH on MAINNET');
console.log('');
console.log('Safety features:');
console.log('  • Very small amount (0.0001 ETH)');
console.log('  • Sends to your own address (no loss)');
console.log('  • Requires explicit confirmation');
console.log('  • Waits for 2+ confirmations');
console.log('');
console.log('Prerequisites:');
console.log('  1. Complete docs/prod-checklist.md');
console.log('  2. Enable mainnet in .env');
console.log('  3. Have ~0.002 ETH for test + gas');
console.log('');
console.log('═'.repeat(60));
console.log('');

// Run smoke test
smokeTest();
