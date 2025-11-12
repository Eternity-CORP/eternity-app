/**
 * Fee Management & Transaction Replacement
 * 
 * Features:
 * - Transparent fee calculation
 * - Base fee + priority fee reading
 * - Transaction replacement (speed up)
 * - USD conversion (optional)
 * - BigInt precision (no loss)
 * - User consent required
 */

import { ethers, BigNumber } from 'ethers';
import { getProvider } from '../services/blockchain/ethereumProvider';
import type { Network } from '../config/env';

// ============================================================================
// Types
// ============================================================================

export interface FeeEstimate {
  baseFee: BigNumber;              // Current base fee per gas
  priorityFee: BigNumber;          // Suggested priority fee (tip)
  maxFeePerGas: BigNumber;         // baseFee * 2 + priorityFee
  maxPriorityFeePerGas: BigNumber; // Same as priorityFee
  gasLimit: BigNumber;
  totalFeeWei: BigNumber;          // gasLimit * maxFeePerGas
  totalFeeETH: string;             // Human-readable
  totalFeeUSD?: string;            // If price available
}

export interface FeeLevel {
  name: 'low' | 'medium' | 'high';
  baseFee: BigNumber;
  priorityFee: BigNumber;
  maxFeePerGas: BigNumber;
  maxPriorityFeePerGas: BigNumber;
  estimatedTime: string;           // e.g., "~30 sec", "~15 sec"
}

export interface FeeSuggestion {
  low: FeeLevel;
  medium: FeeLevel;
  high: FeeLevel;
  baseFee: BigNumber;
  network: Network;
  timestamp: number;
}

export interface ReplacementOptions {
  originalTx: {
    hash: string;
    nonce: number;
    maxFeePerGas: BigNumber;
    maxPriorityFeePerGas: BigNumber;
    gasLimit: BigNumber;
  };
  bumpMultiplier?: number;         // Default: 1.125 (12.5% increase)
  minBumpWei?: BigNumber;          // Minimum increase in wei
}

export interface ReplacementEstimate {
  newMaxFeePerGas: BigNumber;
  newMaxPriorityFeePerGas: BigNumber;
  oldTotalFeeWei: BigNumber;
  newTotalFeeWei: BigNumber;
  additionalCostWei: BigNumber;
  additionalCostETH: string;
  additionalCostUSD?: string;
  bumpPercentage: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_BUMP_MULTIPLIER = 1.125; // 12.5% increase
const MIN_BUMP_PERCENTAGE = 10; // Minimum 10% increase
const PRIORITY_FEE_PERCENTILES = {
  low: 25,
  medium: 50,
  high: 75,
};

// ============================================================================
// Fee Suggestion
// ============================================================================

/**
 * Suggest fees based on current network conditions
 */
export async function suggestFees(
  network: Network,
  gasLimit: BigNumber,
  ethPriceUSD?: number
): Promise<FeeSuggestion> {
  const provider = getProvider(network);
  
  console.log('💰 Suggesting fees...');
  
  // Get latest block with base fee
  const block = await provider.getBlock('latest');
  const baseFee = block.baseFeePerGas;
  
  if (!baseFee) {
    throw new Error('Network does not support EIP-1559');
  }
  
  console.log(`  Base Fee: ${ethers.utils.formatUnits(baseFee, 'gwei')} Gwei`);
  
  // Get priority fee suggestions
  const feeHistory = await provider.send('eth_feeHistory', [
    '0x14', // 20 blocks
    'latest',
    [25, 50, 75], // Percentiles
  ]);
  
  // Calculate average priority fees for each level
  const rewards = feeHistory.reward as string[][];
  const avgRewards = {
    low: BigNumber.from(0),
    medium: BigNumber.from(0),
    high: BigNumber.from(0),
  };
  
  for (const reward of rewards) {
    avgRewards.low = avgRewards.low.add(BigNumber.from(reward[0]));
    avgRewards.medium = avgRewards.medium.add(BigNumber.from(reward[1]));
    avgRewards.high = avgRewards.high.add(BigNumber.from(reward[2]));
  }
  
  const count = rewards.length;
  avgRewards.low = avgRewards.low.div(count);
  avgRewards.medium = avgRewards.medium.div(count);
  avgRewards.high = avgRewards.high.div(count);
  
  // Ensure minimum priority fee (1 Gwei)
  const minPriorityFee = ethers.utils.parseUnits('1', 'gwei');
  avgRewards.low = avgRewards.low.lt(minPriorityFee) ? minPriorityFee : avgRewards.low;
  avgRewards.medium = avgRewards.medium.lt(minPriorityFee) ? minPriorityFee : avgRewards.medium;
  avgRewards.high = avgRewards.high.lt(minPriorityFee) ? minPriorityFee : avgRewards.high;
  
  console.log(`  Priority Fee (Low): ${ethers.utils.formatUnits(avgRewards.low, 'gwei')} Gwei`);
  console.log(`  Priority Fee (Medium): ${ethers.utils.formatUnits(avgRewards.medium, 'gwei')} Gwei`);
  console.log(`  Priority Fee (High): ${ethers.utils.formatUnits(avgRewards.high, 'gwei')} Gwei`);
  
  // Calculate max fee per gas (baseFee * 2 + priorityFee)
  // This ensures transaction won't fail if base fee doubles
  const createFeeLevel = (
    name: 'low' | 'medium' | 'high',
    priorityFee: BigNumber,
    estimatedTime: string
  ): FeeLevel => {
    const maxFeePerGas = baseFee.mul(2).add(priorityFee);
    
    return {
      name,
      baseFee,
      priorityFee,
      maxFeePerGas,
      maxPriorityFeePerGas: priorityFee,
      estimatedTime,
    };
  };
  
  return {
    low: createFeeLevel('low', avgRewards.low, '~30 sec'),
    medium: createFeeLevel('medium', avgRewards.medium, '~15 sec'),
    high: createFeeLevel('high', avgRewards.high, '~10 sec'),
    baseFee,
    network,
    timestamp: Date.now(),
  };
}

/**
 * Calculate total fee for a transaction
 */
export function calculateTotalFee(
  gasLimit: BigNumber,
  maxFeePerGas: BigNumber,
  ethPriceUSD?: number
): {
  totalFeeWei: BigNumber;
  totalFeeETH: string;
  totalFeeUSD?: string;
} {
  const totalFeeWei = gasLimit.mul(maxFeePerGas);
  const totalFeeETH = ethers.utils.formatEther(totalFeeWei);
  const totalFeeUSD = ethPriceUSD
    ? (parseFloat(totalFeeETH) * ethPriceUSD).toFixed(2)
    : undefined;
  
  return {
    totalFeeWei,
    totalFeeETH,
    totalFeeUSD,
  };
}

/**
 * Get detailed fee estimate
 */
export async function getDetailedFeeEstimate(
  network: Network,
  gasLimit: BigNumber,
  level: 'low' | 'medium' | 'high',
  ethPriceUSD?: number
): Promise<FeeEstimate> {
  const suggestion = await suggestFees(network, gasLimit, ethPriceUSD);
  const feeLevel = suggestion[level];
  
  const { totalFeeWei, totalFeeETH, totalFeeUSD } = calculateTotalFee(
    gasLimit,
    feeLevel.maxFeePerGas,
    ethPriceUSD
  );
  
  return {
    baseFee: feeLevel.baseFee,
    priorityFee: feeLevel.priorityFee,
    maxFeePerGas: feeLevel.maxFeePerGas,
    maxPriorityFeePerGas: feeLevel.maxPriorityFeePerGas,
    gasLimit,
    totalFeeWei,
    totalFeeETH,
    totalFeeUSD,
  };
}

// ============================================================================
// Transaction Replacement (Speed Up)
// ============================================================================

/**
 * Calculate replacement transaction fees
 * 
 * Requirements:
 * - New maxFeePerGas must be at least 10% higher
 * - New maxPriorityFeePerGas must be at least 10% higher
 * - User consent required
 */
export async function calculateReplacementFees(
  options: ReplacementOptions,
  network: Network,
  ethPriceUSD?: number
): Promise<ReplacementEstimate> {
  const {
    originalTx,
    bumpMultiplier = DEFAULT_BUMP_MULTIPLIER,
    minBumpWei,
  } = options;
  
  console.log('🚀 Calculating replacement fees...');
  console.log(`  Original maxFeePerGas: ${ethers.utils.formatUnits(originalTx.maxFeePerGas, 'gwei')} Gwei`);
  console.log(`  Original maxPriorityFeePerGas: ${ethers.utils.formatUnits(originalTx.maxPriorityFeePerGas, 'gwei')} Gwei`);
  
  // Calculate new fees with bump
  let newMaxFeePerGas = originalTx.maxFeePerGas.mul(Math.floor(bumpMultiplier * 1000)).div(1000);
  let newMaxPriorityFeePerGas = originalTx.maxPriorityFeePerGas.mul(Math.floor(bumpMultiplier * 1000)).div(1000);
  
  // Ensure minimum bump
  const minBump = minBumpWei || originalTx.maxFeePerGas.mul(MIN_BUMP_PERCENTAGE).div(100);
  
  if (newMaxFeePerGas.sub(originalTx.maxFeePerGas).lt(minBump)) {
    newMaxFeePerGas = originalTx.maxFeePerGas.add(minBump);
  }
  
  if (newMaxPriorityFeePerGas.sub(originalTx.maxPriorityFeePerGas).lt(minBump)) {
    newMaxPriorityFeePerGas = originalTx.maxPriorityFeePerGas.add(minBump);
  }
  
  // Check current network conditions
  const provider = getProvider(network);
  const block = await provider.getBlock('latest');
  const currentBaseFee = block.baseFeePerGas;
  
  if (currentBaseFee) {
    // Ensure maxFeePerGas covers current base fee + priority
    const minRequired = currentBaseFee.mul(2).add(newMaxPriorityFeePerGas);
    if (newMaxFeePerGas.lt(minRequired)) {
      newMaxFeePerGas = minRequired;
      console.log(`  Adjusted maxFeePerGas to cover current base fee`);
    }
  }
  
  console.log(`  New maxFeePerGas: ${ethers.utils.formatUnits(newMaxFeePerGas, 'gwei')} Gwei`);
  console.log(`  New maxPriorityFeePerGas: ${ethers.utils.formatUnits(newMaxPriorityFeePerGas, 'gwei')} Gwei`);
  
  // Calculate costs
  const oldTotalFeeWei = originalTx.gasLimit.mul(originalTx.maxFeePerGas);
  const newTotalFeeWei = originalTx.gasLimit.mul(newMaxFeePerGas);
  const additionalCostWei = newTotalFeeWei.sub(oldTotalFeeWei);
  const additionalCostETH = ethers.utils.formatEther(additionalCostWei);
  const additionalCostUSD = ethPriceUSD
    ? (parseFloat(additionalCostETH) * ethPriceUSD).toFixed(2)
    : undefined;
  
  const bumpPercentage = newMaxFeePerGas
    .sub(originalTx.maxFeePerGas)
    .mul(10000)
    .div(originalTx.maxFeePerGas)
    .toNumber() / 100;
  
  console.log(`  Bump: +${bumpPercentage.toFixed(2)}%`);
  console.log(`  Additional cost: ${additionalCostETH} ETH`);
  
  return {
    newMaxFeePerGas,
    newMaxPriorityFeePerGas,
    oldTotalFeeWei,
    newTotalFeeWei,
    additionalCostWei,
    additionalCostETH,
    additionalCostUSD,
    bumpPercentage,
  };
}

/**
 * Check if transaction is stuck and needs replacement
 */
export async function isTransactionStuck(
  txHash: string,
  network: Network,
  thresholdMinutes: number = 5
): Promise<{
  isStuck: boolean;
  pendingMinutes: number;
  reason?: string;
}> {
  const provider = getProvider(network);
  
  try {
    const tx = await provider.getTransaction(txHash);
    
    if (!tx) {
      return { isStuck: false, pendingMinutes: 0, reason: 'Transaction not found' };
    }
    
    // Check if already mined
    if (tx.blockNumber) {
      return { isStuck: false, pendingMinutes: 0, reason: 'Transaction already mined' };
    }
    
    // Calculate pending time
    const currentBlock = await provider.getBlock('latest');
    const txTimestamp = Date.now(); // Approximate, since we don't have exact submission time
    const pendingMinutes = (Date.now() - txTimestamp) / (1000 * 60);
    
    // Check if stuck
    if (pendingMinutes >= thresholdMinutes) {
      // Check if fee is too low
      const currentBaseFee = currentBlock.baseFeePerGas;
      if (currentBaseFee && tx.maxFeePerGas) {
        if (tx.maxFeePerGas.lt(currentBaseFee)) {
          return {
            isStuck: true,
            pendingMinutes,
            reason: 'Fee too low for current base fee',
          };
        }
      }
      
      return {
        isStuck: true,
        pendingMinutes,
        reason: 'Transaction pending too long',
      };
    }
    
    return { isStuck: false, pendingMinutes };
  } catch (error) {
    console.error('Error checking transaction status:', error);
    return { isStuck: false, pendingMinutes: 0, reason: 'Error checking status' };
  }
}

/**
 * Create replacement transaction
 * 
 * IMPORTANT: Requires user consent!
 */
export async function createReplacementTransaction(
  originalTxHash: string,
  network: Network,
  bumpMultiplier?: number
): Promise<{
  nonce: number;
  maxFeePerGas: BigNumber;
  maxPriorityFeePerGas: BigNumber;
  gasLimit: BigNumber;
  estimate: ReplacementEstimate;
}> {
  const provider = getProvider(network);
  
  // Get original transaction
  const originalTx = await provider.getTransaction(originalTxHash);
  
  if (!originalTx) {
    throw new Error('Original transaction not found');
  }
  
  if (originalTx.blockNumber) {
    throw new Error('Transaction already mined, cannot replace');
  }
  
  if (!originalTx.maxFeePerGas || !originalTx.maxPriorityFeePerGas) {
    throw new Error('Transaction does not use EIP-1559 fees');
  }
  
  // Calculate replacement fees
  const estimate = await calculateReplacementFees(
    {
      originalTx: {
        hash: originalTxHash,
        nonce: originalTx.nonce,
        maxFeePerGas: originalTx.maxFeePerGas,
        maxPriorityFeePerGas: originalTx.maxPriorityFeePerGas,
        gasLimit: originalTx.gasLimit,
      },
      bumpMultiplier,
    },
    network
  );
  
  return {
    nonce: originalTx.nonce,
    maxFeePerGas: estimate.newMaxFeePerGas,
    maxPriorityFeePerGas: estimate.newMaxPriorityFeePerGas,
    gasLimit: originalTx.gasLimit,
    estimate,
  };
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Format fee in Gwei
 */
export function formatGwei(wei: BigNumber): string {
  return ethers.utils.formatUnits(wei, 'gwei');
}

/**
 * Parse Gwei to Wei
 */
export function parseGwei(gwei: string): BigNumber {
  return ethers.utils.parseUnits(gwei, 'gwei');
}

/**
 * Compare two fees
 */
export function compareFees(
  fee1: BigNumber,
  fee2: BigNumber
): 'higher' | 'lower' | 'equal' {
  if (fee1.gt(fee2)) return 'higher';
  if (fee1.lt(fee2)) return 'lower';
  return 'equal';
}

/**
 * Calculate percentage difference
 */
export function calculateFeePercentageDiff(
  oldFee: BigNumber,
  newFee: BigNumber
): number {
  if (oldFee.isZero()) return 0;
  
  return newFee
    .sub(oldFee)
    .mul(10000)
    .div(oldFee)
    .toNumber() / 100;
}
