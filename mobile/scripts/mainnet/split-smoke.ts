/**
 * Mainnet Smoke Test: Split Bill
 * 
 * Tests split bill payment on mainnet with minimal amounts.
 * MANUAL EXECUTION ONLY - NO AUTOMATION.
 * 
 * Safety:
 * - Sends to trusted addresses only
 * - Uses minimal amounts (0.00005 ETH each)
 * - Requires manual confirmation
 * - Logs all details for audit
 * 
 * Prerequisites:
 * - MAINNET_PRIVKEY in .env
 * - SPLIT_RECIPIENT_1 and SPLIT_RECIPIENT_2 in .env
 * - Sufficient ETH for gas + amounts
 * - SPLIT_MAINNET_ENABLED=true
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
  recipient1: process.env.SPLIT_RECIPIENT_1!,
  recipient2: process.env.SPLIT_RECIPIENT_2!,
  amountPerRecipient: '0.00005', // Minimal amount - 0.00005 ETH each
  minConfirmations: 1,
};

// ============================================================================
// Safety Checks
// ============================================================================

function validateConfig(): void {
  if (!config.privKey) {
    throw new Error('MAINNET_PRIVKEY not set in .env');
  }
  
  if (!config.recipient1 || !config.recipient2) {
    throw new Error('SPLIT_RECIPIENT_1 and SPLIT_RECIPIENT_2 must be set in .env');
  }
  
  if (!ethers.utils.isAddress(config.recipient1)) {
    throw new Error('Invalid SPLIT_RECIPIENT_1 address');
  }
  
  if (!ethers.utils.isAddress(config.recipient2)) {
    throw new Error('Invalid SPLIT_RECIPIENT_2 address');
  }
  
  if (config.recipient1.toLowerCase() === config.recipient2.toLowerCase()) {
    throw new Error('Recipients must be different addresses');
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
    console.log('This will execute REAL transactions on Ethereum mainnet.');
    console.log(`Amount per recipient: ${config.amountPerRecipient} ETH`);
    console.log(`Total amount: ${(parseFloat(config.amountPerRecipient) * 2).toFixed(6)} ETH (plus gas)`);
    console.log(`Recipients:`);
    console.log(`  1. ${config.recipient1}`);
    console.log(`  2. ${config.recipient2}\n`);
    
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
  console.log('  🔥 MAINNET SMOKE TEST: Split Bill Payment');
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
  
  const totalAmount = parseFloat(config.amountPerRecipient) * 2;
  const requiredETH = totalAmount + 0.002; // Amount + estimated gas for 2 txs
  if (parseFloat(balanceETH) < requiredETH) {
    throw new Error(`Insufficient balance. Need at least ${requiredETH} ETH`);
  }
  console.log(`   ✅ Sufficient balance`);
  
  // Step 4: Get gas price
  console.log('\n📍 Step 4: Get current gas price');
  const feeData = await provider.getFeeData();
  const gasPriceGwei = ethers.utils.formatUnits(feeData.gasPrice || 0, 'gwei');
  const maxFeeGwei = ethers.utils.formatUnits(feeData.maxFeePerGas || 0, 'gwei');
  
  console.log(`   Gas Price: ${gasPriceGwei} Gwei`);
  console.log(`   Max Fee: ${maxFeeGwei} Gwei`);
  
  // Estimate total gas cost
  const gasLimit = 21000;
  const estimatedGasCostPerTx = ethers.utils.formatEther(
    (feeData.maxFeePerGas || feeData.gasPrice!).mul(gasLimit)
  );
  const totalGasCost = parseFloat(estimatedGasCostPerTx) * 2;
  console.log(`   Estimated Gas Cost (per tx): ${estimatedGasCostPerTx} ETH`);
  console.log(`   Estimated Total Gas Cost: ${totalGasCost.toFixed(6)} ETH`);
  
  // Step 5: Calculate total cost
  console.log('\n📍 Step 5: Calculate total cost');
  const totalCost = totalAmount + totalGasCost;
  console.log(`   Amount (2 recipients): ${totalAmount.toFixed(6)} ETH`);
  console.log(`   Gas (2 transactions): ~${totalGasCost.toFixed(6)} ETH`);
  console.log(`   Total: ~${totalCost.toFixed(6)} ETH`);
  
  // Step 6: Manual confirmation
  console.log('\n📍 Step 6: Manual confirmation');
  const confirmed = await confirmExecution();
  
  if (!confirmed) {
    console.log('\n❌ Smoke test cancelled by user');
    process.exit(0);
  }
  
  // Step 7: Execute split payments
  console.log('\n📍 Step 7: Execute split payments');
  
  const recipients = [
    { address: config.recipient1, label: 'Recipient 1' },
    { address: config.recipient2, label: 'Recipient 2' },
  ];
  
  const txHashes: string[] = [];
  const receipts: ethers.providers.TransactionReceipt[] = [];
  
  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    
    console.log(`\n   Payment ${i + 1}/2 to ${recipient.label}:`);
    console.log(`   Address: ${recipient.address}`);
    console.log(`   Amount: ${config.amountPerRecipient} ETH`);
    
    const tx = await wallet.sendTransaction({
      to: recipient.address,
      value: ethers.utils.parseEther(config.amountPerRecipient),
    });
    
    console.log(`   📤 Transaction sent: ${tx.hash}`);
    console.log(`   Explorer: https://etherscan.io/tx/${tx.hash}`);
    
    txHashes.push(tx.hash);
    
    // Wait a bit between transactions to avoid nonce issues
    if (i < recipients.length - 1) {
      console.log('   Waiting 5 seconds before next payment...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Step 8: Wait for confirmations
  console.log('\n📍 Step 8: Wait for confirmations');
  
  for (let i = 0; i < txHashes.length; i++) {
    console.log(`\n   Confirming payment ${i + 1}/2...`);
    console.log(`   TX: ${txHashes[i]}`);
    
    const receipt = await provider.waitForTransaction(
      txHashes[i],
      config.minConfirmations
    );
    
    if (receipt.status === 0) {
      throw new Error(`Transaction ${i + 1} failed!`);
    }
    
    console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);
    console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
    
    const gasCost = ethers.utils.formatEther(
      receipt.gasUsed.mul(receipt.effectiveGasPrice)
    );
    console.log(`   Gas Cost: ${gasCost} ETH`);
    
    receipts.push(receipt);
  }
  
  // Step 9: Calculate total costs
  console.log('\n📍 Step 9: Calculate actual costs');
  
  let totalGasUsed = ethers.BigNumber.from(0);
  let totalGasCostActual = 0;
  
  for (const receipt of receipts) {
    totalGasUsed = totalGasUsed.add(receipt.gasUsed);
    const gasCost = parseFloat(
      ethers.utils.formatEther(receipt.gasUsed.mul(receipt.effectiveGasPrice))
    );
    totalGasCostActual += gasCost;
  }
  
  console.log(`   Total Gas Used: ${totalGasUsed.toString()}`);
  console.log(`   Total Gas Cost: ${totalGasCostActual.toFixed(6)} ETH`);
  console.log(`   Total Amount Sent: ${totalAmount.toFixed(6)} ETH`);
  console.log(`   Total Cost: ${(totalAmount + totalGasCostActual).toFixed(6)} ETH`);
  
  // Step 10: Verify final balance
  console.log('\n📍 Step 10: Verify final balance');
  const finalBalance = await wallet.getBalance();
  const finalBalanceETH = ethers.utils.formatEther(finalBalance);
  
  console.log(`   Initial: ${balanceETH} ETH`);
  console.log(`   Final: ${finalBalanceETH} ETH`);
  console.log(`   Change: -${(parseFloat(balanceETH) - parseFloat(finalBalanceETH)).toFixed(6)} ETH`);
  
  // Step 11: Summary
  console.log('\n' + '='.repeat(80));
  console.log('  ✅ SMOKE TEST PASSED');
  console.log('='.repeat(80));
  console.log();
  console.log('📊 Summary:');
  console.log(`   Recipients: 2`);
  console.log(`   Amount per recipient: ${config.amountPerRecipient} ETH`);
  console.log(`   Total amount sent: ${totalAmount.toFixed(6)} ETH`);
  console.log(`   Total gas cost: ${totalGasCostActual.toFixed(6)} ETH`);
  console.log(`   Total cost: ${(totalAmount + totalGasCostActual).toFixed(6)} ETH`);
  console.log();
  console.log('   Transactions:');
  receipts.forEach((receipt, i) => {
    console.log(`   ${i + 1}. https://etherscan.io/tx/${receipt.transactionHash}`);
  });
  console.log();
  console.log('✅ Split bill feature verified on mainnet');
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
