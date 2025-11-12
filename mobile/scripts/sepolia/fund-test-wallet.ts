/**
 * Fund Test Wallet Script
 * 
 * Helps fund test wallets from a master wallet or faucet
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
const MASTER_PRIVKEY = process.env.MASTER_PRIVKEY;
const TEST_WALLET_ADDRESS = process.env.TEST_WALLET_ADDRESS;
const AMOUNT_ETH = process.env.FUND_AMOUNT_ETH || '0.1';

async function fundTestWallet() {
  console.log('🚰 Funding Test Wallet on Sepolia...\n');

  if (!MASTER_PRIVKEY) {
    console.log('❌ MASTER_PRIVKEY not set in .env');
    console.log('\n📝 Alternative: Use Sepolia Faucet');
    console.log('   1. Visit: https://sepoliafaucet.com/');
    console.log('   2. Or: https://sepolia-faucet.pk910.de/');
    console.log('   3. Enter your test wallet address');
    console.log(`   4. Your address: ${TEST_WALLET_ADDRESS || 'Set TEST_WALLET_ADDRESS in .env'}`);
    process.exit(1);
  }

  if (!TEST_WALLET_ADDRESS) {
    console.log('❌ TEST_WALLET_ADDRESS not set in .env');
    process.exit(1);
  }

  try {
    // Connect to Sepolia
    const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
    const wallet = new ethers.Wallet(MASTER_PRIVKEY, provider);

    console.log(`📍 Master Wallet: ${wallet.address}`);
    console.log(`📍 Test Wallet: ${TEST_WALLET_ADDRESS}`);
    console.log(`💰 Amount: ${AMOUNT_ETH} ETH\n`);

    // Check master balance
    const masterBalance = await provider.getBalance(wallet.address);
    console.log(`Master Balance: ${ethers.utils.formatEther(masterBalance)} ETH`);

    const amountWei = ethers.utils.parseEther(AMOUNT_ETH);
    if (masterBalance.lt(amountWei)) {
      console.log('❌ Insufficient balance in master wallet');
      process.exit(1);
    }

    // Check test wallet balance before
    const balanceBefore = await provider.getBalance(TEST_WALLET_ADDRESS);
    console.log(`Test Wallet Balance (before): ${ethers.utils.formatEther(balanceBefore)} ETH\n`);

    // Send transaction
    console.log('📤 Sending transaction...');
    const tx = await wallet.sendTransaction({
      to: TEST_WALLET_ADDRESS,
      value: amountWei,
    });

    console.log(`✅ Transaction sent!`);
    console.log(`   Hash: ${tx.hash}`);
    console.log(`   Explorer: https://sepolia.etherscan.io/tx/${tx.hash}\n`);

    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    const receipt = await tx.wait(2);

    console.log(`✅ Confirmed in block ${receipt.blockNumber}`);
    console.log(`   Gas used: ${receipt.gasUsed.toString()}`);

    // Check balance after
    const balanceAfter = await provider.getBalance(TEST_WALLET_ADDRESS);
    console.log(`\n💰 Test Wallet Balance (after): ${ethers.utils.formatEther(balanceAfter)} ETH`);
    console.log(`   Increase: +${ethers.utils.formatEther(balanceAfter.sub(balanceBefore))} ETH`);

    console.log('\n✅ Funding complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  fundTestWallet();
}

export { fundTestWallet };
