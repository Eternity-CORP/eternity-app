/**
 * Nonce Manager Service
 *
 * Manages transaction nonces for Ethereum addresses with support
 * for cancel and replace (speed up) operations.
 *
 * Features:
 * - Track pending transactions
 * - Manage nonce sequencing
 * - Cancel transactions (replace with 0 ETH to self)
 * - Speed up transactions (replace with higher gas)
 * - Persist pending transactions locally
 * - Sync with network nonce
 */

import { ethers, BigNumber } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProvider, getProviderWithFallback } from './ethereumProvider';
import { getAddress } from '../walletService';
import type { Network } from '../../constants/rpcUrls';

// Types
export interface PendingTransaction {
  hash: string;
  nonce: number;
  from: string;
  to: string;
  value: string; // in ETH
  gasLimit: string;
  gasPrice?: string; // Legacy
  maxFeePerGas?: string; // EIP-1559
  maxPriorityFeePerGas?: string; // EIP-1559
  timestamp: number;
  network: Network;
  status: 'pending' | 'confirmed' | 'failed' | 'replaced';
  replacedBy?: string; // Hash of replacement transaction
}

export interface NonceInfo {
  networkNonce: number;
  pendingNonce: number;
  hasPending: boolean;
  pendingCount: number;
}

// Storage keys
const PENDING_TX_KEY = '@pending_transactions';
const NONCE_CACHE_KEY = '@nonce_cache';

// Cache duration (5 minutes)
const NONCE_CACHE_DURATION = 5 * 60 * 1000;

/**
 * Get all pending transactions for an address
 */
export async function getPendingTransactions(
  address?: string,
  network?: Network
): Promise<PendingTransaction[]> {
  try {
    const addr = address || (await getAddress());
    if (!addr) return [];

    const stored = await AsyncStorage.getItem(PENDING_TX_KEY);
    if (!stored) return [];

    const allPending: PendingTransaction[] = JSON.parse(stored);

    // Filter by address and network
    return allPending.filter(
      (tx) =>
        tx.from.toLowerCase() === addr.toLowerCase() &&
        tx.status === 'pending' &&
        (!network || tx.network === network)
    );
  } catch (error) {
    console.error('Failed to get pending transactions:', error);
    return [];
  }
}

/**
 * Save pending transaction
 */
async function savePendingTransaction(tx: PendingTransaction): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(PENDING_TX_KEY);
    const allPending: PendingTransaction[] = stored ? JSON.parse(stored) : [];

    // Remove any existing transaction with same hash
    const filtered = allPending.filter((t) => t.hash !== tx.hash);

    // Add new transaction
    filtered.push(tx);

    // Keep only last 100 transactions
    const limited = filtered.slice(-100);

    await AsyncStorage.setItem(PENDING_TX_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error('Failed to save pending transaction:', error);
  }
}

/**
 * Update transaction status
 */
export async function updateTransactionStatus(
  hash: string,
  status: PendingTransaction['status'],
  replacedBy?: string
): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(PENDING_TX_KEY);
    if (!stored) return;

    const allPending: PendingTransaction[] = JSON.parse(stored);

    const tx = allPending.find((t) => t.hash === hash);
    if (tx) {
      tx.status = status;
      if (replacedBy) {
        tx.replacedBy = replacedBy;
      }

      await AsyncStorage.setItem(PENDING_TX_KEY, JSON.stringify(allPending));
    }
  } catch (error) {
    console.error('Failed to update transaction status:', error);
  }
}

/**
 * Get network nonce for an address
 */
export async function getNetworkNonce(
  address?: string,
  network?: Network
): Promise<number> {
  try {
    const addr = address || (await getAddress());
    if (!addr) throw new Error('No address available');

    const provider = getProvider(network);
    const nonce = await provider.getTransactionCount(addr, 'pending');

    // Cache the nonce
    await cacheNonce(addr, network || 'sepolia', nonce);

    return nonce;
  } catch (error) {
    console.warn('Failed to get network nonce, trying fallback...');

    const addr = address || (await getAddress());
    if (!addr) throw new Error('No address available');

    const provider = await getProviderWithFallback(network);
    const nonce = await provider.getTransactionCount(addr, 'pending');

    await cacheNonce(addr, network || 'sepolia', nonce);

    return nonce;
  }
}

/**
 * Get cached nonce
 */
async function getCachedNonce(address: string, network: Network): Promise<number | null> {
  try {
    const key = `${NONCE_CACHE_KEY}_${address}_${network}`;
    const cached = await AsyncStorage.getItem(key);

    if (!cached) return null;

    const { nonce, timestamp } = JSON.parse(cached);

    // Check if cache is still valid
    if (Date.now() - timestamp > NONCE_CACHE_DURATION) {
      return null;
    }

    return nonce;
  } catch {
    return null;
  }
}

/**
 * Cache nonce
 */
async function cacheNonce(address: string, network: Network, nonce: number): Promise<void> {
  try {
    const key = `${NONCE_CACHE_KEY}_${address}_${network}`;
    await AsyncStorage.setItem(
      key,
      JSON.stringify({ nonce, timestamp: Date.now() })
    );
  } catch (error) {
    console.warn('Failed to cache nonce:', error);
  }
}

/**
 * Get next available nonce (considering pending transactions)
 */
export async function getNextNonce(
  address?: string,
  network?: Network
): Promise<number> {
  const addr = address || (await getAddress());
  if (!addr) throw new Error('No address available');

  // Get network nonce
  const networkNonce = await getNetworkNonce(addr, network);

  // Get pending transactions
  const pending = await getPendingTransactions(addr, network);

  if (pending.length === 0) {
    return networkNonce;
  }

  // Find highest pending nonce
  const highestPending = Math.max(...pending.map((tx) => tx.nonce));

  // Next nonce is either network nonce or one more than highest pending
  return Math.max(networkNonce, highestPending + 1);
}

/**
 * Get nonce information
 */
export async function getNonceInfo(
  address?: string,
  network?: Network
): Promise<NonceInfo> {
  const addr = address || (await getAddress());
  if (!addr) throw new Error('No address available');

  const networkNonce = await getNetworkNonce(addr, network);
  const pending = await getPendingTransactions(addr, network);

  const pendingNonce = pending.length > 0
    ? Math.max(...pending.map((tx) => tx.nonce)) + 1
    : networkNonce;

  return {
    networkNonce,
    pendingNonce,
    hasPending: pending.length > 0,
    pendingCount: pending.length,
  };
}

/**
 * Track a new transaction
 */
export async function trackTransaction(
  hash: string,
  nonce: number,
  from: string,
  to: string,
  value: BigNumber,
  gasLimit: BigNumber,
  network: Network,
  gasPrice?: BigNumber,
  maxFeePerGas?: BigNumber,
  maxPriorityFeePerGas?: BigNumber
): Promise<void> {
  const tx: PendingTransaction = {
    hash,
    nonce,
    from,
    to,
    value: ethers.utils.formatEther(value),
    gasLimit: gasLimit.toString(),
    gasPrice: gasPrice?.toString(),
    maxFeePerGas: maxFeePerGas?.toString(),
    maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(),
    timestamp: Date.now(),
    network,
    status: 'pending',
  };

  await savePendingTransaction(tx);
}

/**
 * Check if a transaction can be replaced
 */
export async function canReplaceTransaction(
  hash: string
): Promise<{ canReplace: boolean; reason?: string; transaction?: PendingTransaction }> {
  try {
    const stored = await AsyncStorage.getItem(PENDING_TX_KEY);
    if (!stored) {
      return { canReplace: false, reason: 'Transaction not found' };
    }

    const allPending: PendingTransaction[] = JSON.parse(stored);
    const tx = allPending.find((t) => t.hash === hash);

    if (!tx) {
      return { canReplace: false, reason: 'Transaction not found' };
    }

    if (tx.status !== 'pending') {
      return {
        canReplace: false,
        reason: `Transaction is ${tx.status}`,
        transaction: tx,
      };
    }

    // Check if transaction is too old (>30 minutes)
    const age = Date.now() - tx.timestamp;
    if (age > 30 * 60 * 1000) {
      return {
        canReplace: false,
        reason: 'Transaction is too old to replace safely',
        transaction: tx,
      };
    }

    return { canReplace: true, transaction: tx };
  } catch (error) {
    return { canReplace: false, reason: 'Error checking transaction' };
  }
}

/**
 * Create replacement transaction data for cancellation
 * (0 ETH to self with same nonce, higher gas)
 */
export function createCancelTransactionData(originalTx: PendingTransaction): {
  to: string;
  value: BigNumber;
  nonce: number;
  gasLimit: BigNumber;
  gasPrice?: BigNumber;
  maxFeePerGas?: BigNumber;
  maxPriorityFeePerGas?: BigNumber;
} {
  // Send 0 ETH to self
  const to = originalTx.from;
  const value = BigNumber.from(0);
  const nonce = originalTx.nonce;

  // Use same or slightly higher gas limit
  const gasLimit = BigNumber.from(originalTx.gasLimit);

  // Increase gas price by 10% minimum (or 10 Gwei, whichever is higher)
  const minIncrease = ethers.utils.parseUnits('10', 'gwei');

  let gasPrice: BigNumber | undefined;
  let maxFeePerGas: BigNumber | undefined;
  let maxPriorityFeePerGas: BigNumber | undefined;

  if (originalTx.maxFeePerGas && originalTx.maxPriorityFeePerGas) {
    // EIP-1559
    const originalMaxFee = BigNumber.from(originalTx.maxFeePerGas);
    const originalPriorityFee = BigNumber.from(originalTx.maxPriorityFeePerGas);

    const increase = originalMaxFee.div(10); // 10% increase
    const actualIncrease = increase.gt(minIncrease) ? increase : minIncrease;

    maxFeePerGas = originalMaxFee.add(actualIncrease);
    maxPriorityFeePerGas = originalPriorityFee.add(actualIncrease);
  } else if (originalTx.gasPrice) {
    // Legacy
    const originalGasPrice = BigNumber.from(originalTx.gasPrice);
    const increase = originalGasPrice.div(10);
    const actualIncrease = increase.gt(minIncrease) ? increase : minIncrease;

    gasPrice = originalGasPrice.add(actualIncrease);
  } else {
    throw new Error('No gas price information in original transaction');
  }

  return {
    to,
    value,
    nonce,
    gasLimit,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
  };
}

/**
 * Create replacement transaction data for speed up
 * (same transaction with higher gas)
 */
export function createSpeedUpTransactionData(originalTx: PendingTransaction): {
  to: string;
  value: BigNumber;
  nonce: number;
  gasLimit: BigNumber;
  gasPrice?: BigNumber;
  maxFeePerGas?: BigNumber;
  maxPriorityFeePerGas?: BigNumber;
} {
  // Use original destination and value
  const to = originalTx.to;
  const value = ethers.utils.parseEther(originalTx.value);
  const nonce = originalTx.nonce;
  const gasLimit = BigNumber.from(originalTx.gasLimit);

  // Increase gas price by 20% minimum (or 20 Gwei, whichever is higher)
  const minIncrease = ethers.utils.parseUnits('20', 'gwei');

  let gasPrice: BigNumber | undefined;
  let maxFeePerGas: BigNumber | undefined;
  let maxPriorityFeePerGas: BigNumber | undefined;

  if (originalTx.maxFeePerGas && originalTx.maxPriorityFeePerGas) {
    // EIP-1559
    const originalMaxFee = BigNumber.from(originalTx.maxFeePerGas);
    const originalPriorityFee = BigNumber.from(originalTx.maxPriorityFeePerGas);

    const increase = originalMaxFee.div(5); // 20% increase
    const actualIncrease = increase.gt(minIncrease) ? increase : minIncrease;

    maxFeePerGas = originalMaxFee.add(actualIncrease);
    maxPriorityFeePerGas = originalPriorityFee.add(actualIncrease);
  } else if (originalTx.gasPrice) {
    // Legacy
    const originalGasPrice = BigNumber.from(originalTx.gasPrice);
    const increase = originalGasPrice.div(5);
    const actualIncrease = increase.gt(minIncrease) ? increase : minIncrease;

    gasPrice = originalGasPrice.add(actualIncrease);
  } else {
    throw new Error('No gas price information in original transaction');
  }

  return {
    to,
    value,
    nonce,
    gasLimit,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
  };
}

/**
 * Clean up old transactions (confirmed/failed/replaced older than 24 hours)
 */
export async function cleanupOldTransactions(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(PENDING_TX_KEY);
    if (!stored) return;

    const allTx: PendingTransaction[] = JSON.parse(stored);
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    // Keep only pending transactions and recent completed transactions
    const filtered = allTx.filter(
      (tx) =>
        tx.status === 'pending' ||
        tx.timestamp > oneDayAgo
    );

    await AsyncStorage.setItem(PENDING_TX_KEY, JSON.stringify(filtered));

    console.log(`Cleaned up ${allTx.length - filtered.length} old transactions`);
  } catch (error) {
    console.error('Failed to cleanup old transactions:', error);
  }
}

/**
 * Clear all pending transactions for an address
 * USE WITH CAUTION - This should only be used for testing or factory reset
 */
export async function clearPendingTransactions(address?: string): Promise<void> {
  try {
    if (!address) {
      // Clear all
      await AsyncStorage.removeItem(PENDING_TX_KEY);
      return;
    }

    const stored = await AsyncStorage.getItem(PENDING_TX_KEY);
    if (!stored) return;

    const allTx: PendingTransaction[] = JSON.parse(stored);

    // Filter out transactions for this address
    const filtered = allTx.filter(
      (tx) => tx.from.toLowerCase() !== address.toLowerCase()
    );

    await AsyncStorage.setItem(PENDING_TX_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to clear pending transactions:', error);
  }
}
