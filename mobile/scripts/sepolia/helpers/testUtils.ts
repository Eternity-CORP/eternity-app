/**
 * E2E Test Utilities
 * 
 * Helper functions for Sepolia E2E tests:
 * - Wallet setup
 * - Transaction waiting
 * - Balance checking
 * - Rate limiting
 * - Logging
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// ============================================================================
// Configuration
// ============================================================================

export const config = {
  rpcUrl: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
  privKeyA: process.env.TEST_PRIVKEY_A!,
  privKeyB: process.env.TEST_PRIVKEY_B!,
  recipient1: process.env.TEST_RECIPIENT_1!,
  recipient2: process.env.TEST_RECIPIENT_2!,
  recipient3: process.env.TEST_RECIPIENT_3!,
  tokenAddress: process.env.TEST_TOKEN_ADDRESS!,
  rateLimitMs: parseInt(process.env.RPC_RATE_LIMIT_MS || '1000'),
  minConfirmations: parseInt(process.env.MIN_CONFIRMATIONS || '2'),
  testTimeout: parseInt(process.env.TEST_TIMEOUT_MS || '300000'),
  txTimeout: parseInt(process.env.TRANSACTION_TIMEOUT_MS || '120000'),
  blockWaitTimeout: parseInt(process.env.BLOCK_WAIT_TIMEOUT_MS || '60000'),
};

// Validate configuration
export function validateConfig(): void {
  const required = [
    'privKeyA',
    'privKeyB',
    'recipient1',
    'recipient2',
    'recipient3',
    'tokenAddress',
  ];
  
  for (const key of required) {
    if (!config[key as keyof typeof config]) {
      throw new Error(`Missing required config: ${key}. Check your .env file.`);
    }
  }
  
  console.log('✅ Configuration validated');
}

// ============================================================================
// Provider & Wallets
// ============================================================================

let provider: ethers.providers.JsonRpcProvider;
let walletA: ethers.Wallet;
let walletB: ethers.Wallet;

/**
 * Get provider instance
 */
export function getProvider(): ethers.providers.JsonRpcProvider {
  if (!provider) {
    provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    console.log(`📡 Connected to Sepolia: ${config.rpcUrl}`);
  }
  return provider;
}

/**
 * Get wallet A (primary test wallet)
 */
export function getWalletA(): ethers.Wallet {
  if (!walletA) {
    walletA = new ethers.Wallet(config.privKeyA, getProvider());
    console.log(`👛 Wallet A: ${walletA.address}`);
  }
  return walletA;
}

/**
 * Get wallet B (secondary test wallet)
 */
export function getWalletB(): ethers.Wallet {
  if (!walletB) {
    walletB = new ethers.Wallet(config.privKeyB, getProvider());
    console.log(`👛 Wallet B: ${walletB.address}`);
  }
  return walletB;
}

// ============================================================================
// Balance Checking
// ============================================================================

/**
 * Get ETH balance
 */
export async function getBalance(address: string): Promise<string> {
  const balance = await getProvider().getBalance(address);
  return ethers.utils.formatEther(balance);
}

/**
 * Check if wallet has sufficient balance
 */
export async function checkSufficientBalance(
  wallet: ethers.Wallet,
  requiredETH: string
): Promise<boolean> {
  const balance = await wallet.getBalance();
  const required = ethers.utils.parseEther(requiredETH);
  
  if (balance.lt(required)) {
    console.error(`❌ Insufficient balance:`);
    console.error(`   Address: ${wallet.address}`);
    console.error(`   Balance: ${ethers.utils.formatEther(balance)} ETH`);
    console.error(`   Required: ${requiredETH} ETH`);
    console.error(`   Get testnet ETH from: https://sepoliafaucet.com/`);
    return false;
  }
  
  console.log(`✅ Sufficient balance: ${ethers.utils.formatEther(balance)} ETH`);
  return true;
}

// ============================================================================
// Transaction Waiting
// ============================================================================

/**
 * Wait for transaction confirmation
 */
export async function waitForTransaction(
  txHash: string,
  confirmations: number = config.minConfirmations
): Promise<ethers.providers.TransactionReceipt> {
  console.log(`⏳ Waiting for ${confirmations} confirmations...`);
  console.log(`   TX: ${txHash}`);
  console.log(`   Explorer: https://sepolia.etherscan.io/tx/${txHash}`);
  
  const receipt = await getProvider().waitForTransaction(
    txHash,
    confirmations,
    config.txTimeout
  );
  
  if (!receipt) {
    throw new Error('Transaction receipt not found');
  }
  
  if (receipt.status === 0) {
    throw new Error('Transaction failed');
  }
  
  console.log(`✅ Transaction confirmed!`);
  console.log(`   Block: ${receipt.blockNumber}`);
  console.log(`   Gas Used: ${receipt.gasUsed.toString()}`);
  
  return receipt;
}

/**
 * Wait for specific number of blocks
 */
export async function waitForBlocks(count: number): Promise<void> {
  const startBlock = await getProvider().getBlockNumber();
  const targetBlock = startBlock + count;
  
  console.log(`⏳ Waiting for ${count} blocks...`);
  console.log(`   Current: ${startBlock}`);
  console.log(`   Target: ${targetBlock}`);
  
  while (true) {
    const currentBlock = await getProvider().getBlockNumber();
    
    if (currentBlock >= targetBlock) {
      console.log(`✅ Reached block ${currentBlock}`);
      break;
    }
    
    await sleep(5000); // Check every 5 seconds
  }
}

// ============================================================================
// Rate Limiting
// ============================================================================

let lastRequestTime = 0;

/**
 * Rate limit RPC requests
 */
export async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  
  if (elapsed < config.rateLimitMs) {
    const delay = config.rateLimitMs - elapsed;
    await sleep(delay);
  }
  
  lastRequestTime = Date.now();
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Logging
// ============================================================================

/**
 * Log test section
 */
export function logSection(title: string): void {
  console.log('\n' + '='.repeat(80));
  console.log(`  ${title}`);
  console.log('='.repeat(80) + '\n');
}

/**
 * Log test step
 */
export function logStep(step: string): void {
  console.log(`\n📍 ${step}`);
}

/**
 * Log success
 */
export function logSuccess(message: string): void {
  console.log(`✅ ${message}`);
}

/**
 * Log error
 */
export function logError(message: string, error?: any): void {
  console.error(`❌ ${message}`);
  if (error) {
    console.error(`   Error: ${error.message || error}`);
  }
}

/**
 * Log transaction details
 */
export function logTransaction(tx: ethers.providers.TransactionResponse): void {
  console.log(`📤 Transaction sent:`);
  console.log(`   Hash: ${tx.hash}`);
  console.log(`   From: ${tx.from}`);
  console.log(`   To: ${tx.to}`);
  console.log(`   Value: ${ethers.utils.formatEther(tx.value || 0)} ETH`);
  console.log(`   Nonce: ${tx.nonce}`);
  console.log(`   Gas Limit: ${tx.gasLimit?.toString()}`);
  console.log(`   Explorer: https://sepolia.etherscan.io/tx/${tx.hash}`);
}

// ============================================================================
// Test Cleanup
// ============================================================================

/**
 * Cleanup after test
 */
export async function cleanup(): Promise<void> {
  // Add any cleanup logic here
  console.log('\n🧹 Cleanup complete');
}

// ============================================================================
// Assertions
// ============================================================================

/**
 * Assert transaction success
 */
export function assertTxSuccess(
  receipt: ethers.providers.TransactionReceipt
): void {
  if (receipt.status !== 1) {
    throw new Error(`Transaction failed: ${receipt.transactionHash}`);
  }
}

/**
 * Assert balance changed
 */
export async function assertBalanceChanged(
  address: string,
  previousBalance: string,
  expectedChange: 'increase' | 'decrease'
): Promise<void> {
  const currentBalance = await getBalance(address);
  const prev = parseFloat(previousBalance);
  const curr = parseFloat(currentBalance);
  
  if (expectedChange === 'increase' && curr <= prev) {
    throw new Error(`Balance did not increase: ${prev} -> ${curr}`);
  }
  
  if (expectedChange === 'decrease' && curr >= prev) {
    throw new Error(`Balance did not decrease: ${prev} -> ${curr}`);
  }
  
  console.log(`✅ Balance ${expectedChange}d: ${prev} -> ${curr} ETH`);
}

// ============================================================================
// ERC-20 Helpers
// ============================================================================

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

/**
 * Get ERC-20 token contract
 */
export function getTokenContract(
  wallet: ethers.Wallet
): ethers.Contract {
  return new ethers.Contract(config.tokenAddress, ERC20_ABI, wallet);
}

/**
 * Get ERC-20 token balance
 */
export async function getTokenBalance(
  address: string
): Promise<string> {
  const contract = getTokenContract(getWalletA());
  const balance = await contract.balanceOf(address);
  return ethers.utils.formatUnits(balance, 6); // Assuming 6 decimals (USDC)
}

/**
 * Check if wallet has sufficient token balance
 */
export async function checkSufficientTokenBalance(
  wallet: ethers.Wallet,
  requiredAmount: string
): Promise<boolean> {
  const balance = await getTokenBalance(wallet.address);
  const required = parseFloat(requiredAmount);
  const current = parseFloat(balance);
  
  if (current < required) {
    console.error(`❌ Insufficient token balance:`);
    console.error(`   Address: ${wallet.address}`);
    console.error(`   Balance: ${balance} tokens`);
    console.error(`   Required: ${requiredAmount} tokens`);
    return false;
  }
  
  console.log(`✅ Sufficient token balance: ${balance} tokens`);
  return true;
}
