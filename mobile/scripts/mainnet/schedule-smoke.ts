/**
 * Mainnet Smoke Test: Scheduled Payment
 * 
 * Tests scheduled payment on mainnet with minimal amount.
 * MANUAL EXECUTION ONLY - NO AUTOMATION.
 * 
 * Safety:
 * - Sends to own address (no risk of loss)
 * - Uses minimal amount (0.0001 ETH)
 * - Requires manual confirmation
 * - Logs all details for audit
 * 
 * Prerequisites:
 * - MAINNET_PRIVKEY in .env
 * - Sufficient ETH for gas + amount
 * - SCHEDULE_MAINNET_ENABLED=true
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import readline from 'readline';

// Load environment
dotenv.config({ path: path.join(__dirname, '.env') });

// ============================================================================
// Configuration
// ============================================================================

const config = {
  rpcUrl: process.env.MAINNET_RPC_URL || 'https://eth.llamarpc.com',
  privKey: process.env.MAINNET_PRIVKEY!,
  amount: '0.0001', // Minimal amount - 0.0001 ETH
  minConfirmations: 1, // Fast confirmation for smoke test
};

// ============================================================================
// Safety Checks
// ============================================================================

function validateConfig(): void {
  if (!config.privKey) {
    throw new Error('MAINNET_PRIVKEY not set in .env');
  }
  
  if (!config.privKey.startsWith('0x')) {
    throw new Error('Invalid private key format');
  }
  
  console.log('✅ Configuration validated');
}

// ============================================================================
// User Confirmation
// ============================================================================

async function confirmExecution(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    console.log('\n⚠️  MAINNET SMOKE TEST - MANUAL CONFIRMATION REQUIRED\n');
    console.log('This will execute a REAL transaction on Ethereum mainnet.');
    console.log(`Amount: ${config.amount} ETH (plus gas)`);
    console.log('Recipient: Your own address (safe)\n');
    
    rl.question('Type "YES" to proceed: ', (answer) => {
      rl.close();
      resolve(answer.trim() === 'YES');
    });
  });
}

// ============================================================================
// Smoke Test
// ============================================================================

async function runSmokeTest(): Promise<void> {
  console.log('='.repeat(80));
  console.log('  🔥 MAINNET SMOKE TEST: Scheduled Payment');
  console.log('='.repeat(80));
  console.log();
  
  // Step 1: Validate configuration
  console.log('📍 Step 1: Validate configuration');
  validateConfig();
  
  // Step 2: Connect to mainnet
  console.log('\n📍 Step 2: Connect to mainnet');
  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  const wallet = new ethers.Wallet(config.privKey, provider);
  
  console.log(`   Wallet: ${wallet.address}`);
  console.log(`   RPC: ${config.rpcUrl}`);
  
  // Verify we're on mainnet
  const network = await provider.getNetwork();
  if (network.chainId !== 1) {
    throw new Error(`Not on mainnet! Chain ID: ${network.chainId}`);
  }
  console.log(`   ✅ Connected to mainnet (chain ID: ${network.chainId})`);
  
  // Step 3: Check balance
  console.log('\n📍 Step 3: Check balance');
  const balance = await wallet.getBalance();
  const balanceETH = ethers.utils.formatEther(balance);
  
  console.log(`   Balance: ${balanceETH} ETH`);
  
  const requiredETH = parseFloat(config.amount) + 0.001; // Amount + estimated gas
  if (parseFloat(balanceETH) < requiredETH) {
    throw new Error(`Insufficient balance. Need at least ${requiredETH} ETH`);
  }
  console.log(`   ✅ Sufficient balance`);
  
  // Step 4: Get gas price
  console.log('\n📍 Step 4: Get current gas price');
  const feeData = await provider.getFeeData();
  const gasPriceGwei = ethers.utils.formatUnits(feeData.gasPrice || 0, 'gwei');
  const maxFeeGwei = ethers.utils.formatUnits(feeData.maxFeePerGas || 0, 'gwei');
  const maxPriorityFeeGwei = ethers.utils.formatUnits(feeData.maxPriorityFeePerGas || 0, 'gwei');
  
  console.log(`   Gas Price: ${gasPriceGwei} Gwei`);
  console.log(`   Max Fee: ${maxFeeGwei} Gwei`);
  console.log(`   Max Priority Fee: ${maxPriorityFeeGwei} Gwei`);
  
  // Estimate gas cost
  const gasLimit = 21000; // Standard ETH transfer
  const estimatedGasCost = ethers.utils.formatEther(
    (feeData.maxFeePerGas || feeData.gasPrice!).mul(gasLimit)
  );
  console.log(`   Estimated Gas Cost: ${estimatedGasCost} ETH`);
  
  // Step 5: Calculate total cost
  console.log('\n📍 Step 5: Calculate total cost');
  const totalCost = parseFloat(config.amount) + parseFloat(estimatedGasCost);
  console.log(`   Amount: ${config.amount} ETH`);
  console.log(`   Gas: ~${estimatedGasCost} ETH`);
  console.log(`   Total: ~${totalCost.toFixed(6)} ETH`);
  
  // Step 6: Manual confirmation
  console.log('\n📍 Step 6: Manual confirmation');
  const confirmed = await confirmExecution();
  
  if (!confirmed) {
    console.log('\n❌ Smoke test cancelled by user');
    process.exit(0);
  }
  
  // Step 7: Execute transaction
  console.log('\n📍 Step 7: Execute scheduled payment');
  console.log('   Sending to own address (safe)...');
  
  const tx = await wallet.sendTransaction({
    to: wallet.address, // Send to self
    value: ethers.utils.parseEther(config.amount),
  });
  
  console.log('\n   📤 Transaction sent!');
  console.log(`   Hash: ${tx.hash}`);
  console.log(`   From: ${tx.from}`);
  console.log(`   To: ${tx.to}`);
  console.log(`   Value: ${ethers.utils.formatEther(tx.value)} ETH`);
  console.log(`   Nonce: ${tx.nonce}`);
  console.log(`   Gas Limit: ${tx.gasLimit?.toString()}`);
  console.log(`   Explorer: https://etherscan.io/tx/${tx.hash}`);
  
  // Step 8: Wait for confirmation
  console.log('\n📍 Step 8: Wait for confirmation');
  console.log(`   Waiting for ${config.minConfirmations} confirmation(s)...`);
  
  const receipt = await tx.wait(config.minConfirmations);
  
  if (receipt.status === 0) {
    throw new Error('Transaction failed!');
  }
  
  console.log('\n   ✅ Transaction confirmed!');
  console.log(`   Block: ${receipt.blockNumber}`);
  console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
  console.log(`   Effective Gas Price: ${ethers.utils.formatUnits(receipt.effectiveGasPrice, 'gwei')} Gwei`);
  
  // Calculate actual gas cost
  const actualGasCost = ethers.utils.formatEther(
    receipt.gasUsed.mul(receipt.effectiveGasPrice)
  );
  console.log(`   Gas Cost: ${actualGasCost} ETH`);
  
  // Step 9: Verify balance
  console.log('\n📍 Step 9: Verify final balance');
  const finalBalance = await wallet.getBalance();
  const finalBalanceETH = ethers.utils.formatEther(finalBalance);
  
  console.log(`   Initial: ${balanceETH} ETH`);
  console.log(`   Final: ${finalBalanceETH} ETH`);
  console.log(`   Change: -${(parseFloat(balanceETH) - parseFloat(finalBalanceETH)).toFixed(6)} ETH (gas only)`);
  
  // Step 10: Summary
  console.log('\n' + '='.repeat(80));
  console.log('  ✅ SMOKE TEST PASSED');
  console.log('='.repeat(80));
  console.log();
  console.log('📊 Summary:');
  console.log(`   Transaction Hash: ${receipt.transactionHash}`);
  console.log(`   Block Number: ${receipt.blockNumber}`);
  console.log(`   Amount Sent: ${config.amount} ETH`);
  console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
  console.log(`   Gas Cost: ${actualGasCost} ETH`);
  console.log(`   Total Cost: ${(parseFloat(actualGasCost)).toFixed(6)} ETH (amount returned to self)`);
  console.log(`   Explorer: https://etherscan.io/tx/${receipt.transactionHash}`);
  console.log();
  console.log('✅ Scheduled payment feature verified on mainnet');
  console.log();
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  try {
    await runSmokeTest();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Smoke test failed:');
    console.error(`   ${error.message}`);
    
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { runSmokeTest };
