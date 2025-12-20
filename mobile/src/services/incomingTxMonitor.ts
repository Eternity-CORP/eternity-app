/**
 * Service for monitoring incoming transactions and awarding shards
 * Uses Etherscan API to fetch transaction history
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ETHERSCAN_API_KEY, Network } from '../config/env';
import { reportReceiveShard } from './shardEventsService';
import { loginWithWallet } from './authService';

const STORAGE_KEY_PREFIX = 'lastCheckedBlock_';
const MIN_AMOUNT_ETH = 0.001; // Minimum amount to award shard

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  blockNumber: string;
  timeStamp: string;
}

/**
 * Get Etherscan API URL for network
 */
function getEtherscanApiUrl(network: Network): string {
  switch (network) {
    case 'mainnet':
      return 'https://api.etherscan.io/api';
    case 'sepolia':
      return 'https://api-sepolia.etherscan.io/api';
    case 'holesky':
      return 'https://api-holesky.etherscan.io/api';
    default:
      return 'https://api-sepolia.etherscan.io/api';
  }
}

/**
 * Get last checked block number from storage
 */
async function getLastCheckedBlock(address: string, network: Network): Promise<number> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${network}_${address.toLowerCase()}`;
    const value = await AsyncStorage.getItem(key);
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error('[incomingTxMonitor] Failed to get last checked block:', error);
    return 0;
  }
}

/**
 * Save last checked block number to storage
 */
async function saveLastCheckedBlock(
  address: string,
  network: Network,
  blockNumber: number
): Promise<void> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${network}_${address.toLowerCase()}`;
    await AsyncStorage.setItem(key, blockNumber.toString());
  } catch (error) {
    console.error('[incomingTxMonitor] Failed to save last checked block:', error);
  }
}

/**
 * Fetch incoming transactions from Etherscan
 */
async function fetchIncomingTransactions(
  address: string,
  network: Network,
  startBlock: number
): Promise<Transaction[]> {
  if (!ETHERSCAN_API_KEY) {
    console.warn('[incomingTxMonitor] ETHERSCAN_API_KEY not set');
    return [];
  }

  const apiUrl = getEtherscanApiUrl(network);
  const url = `${apiUrl}?module=account&action=txlist&address=${address}&startblock=${startBlock}&endblock=99999999&sort=asc&apikey=${ETHERSCAN_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== '1' || !Array.isArray(data.result)) {
      console.warn('[incomingTxMonitor] Failed to fetch transactions:', data.message);
      return [];
    }

    // Filter only incoming transactions (where `to` is our address)
    const incoming = data.result.filter(
      (tx: any) => tx.to.toLowerCase() === address.toLowerCase() && tx.value !== '0'
    );

    return incoming.map((tx: any) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      blockNumber: tx.blockNumber,
      timeStamp: tx.timeStamp,
    }));
  } catch (error) {
    console.error('[incomingTxMonitor] Failed to fetch transactions:', error);
    return [];
  }
}

/**
 * Convert Wei to ETH
 */
function weiToEth(weiString: string): number {
  try {
    const wei = BigInt(weiString);
    const eth = Number(wei) / 1e18;
    return eth;
  } catch {
    return 0;
  }
}

/**
 * Check for new incoming transactions and award shards
 * Should be called periodically (e.g., when app opens, when user opens wallet screen)
 */
export async function checkIncomingTransactions(
  walletAddress: string,
  network: Network
): Promise<number> {
  console.log('[incomingTxMonitor] Checking incoming transactions for', walletAddress);

  try {
    // Get last checked block
    const lastCheckedBlock = await getLastCheckedBlock(walletAddress, network);
    console.log('[incomingTxMonitor] Last checked block:', lastCheckedBlock);

    // Fetch incoming transactions since last check
    const transactions = await fetchIncomingTransactions(
      walletAddress,
      network,
      lastCheckedBlock + 1
    );

    if (transactions.length === 0) {
      console.log('[incomingTxMonitor] No new incoming transactions');
      return 0;
    }

    console.log(`[incomingTxMonitor] Found ${transactions.length} new incoming transaction(s)`);

    let shardsAwarded = 0;

    // Get auth token
    const authToken = await loginWithWallet(walletAddress);
    if (!authToken) {
      console.warn('[incomingTxMonitor] Failed to get auth token');
      return 0;
    }

    // Process each transaction
    for (const tx of transactions) {
      const amountEth = weiToEth(tx.value);

      // Only process if amount is above minimum
      if (amountEth >= MIN_AMOUNT_ETH) {
        try {
          const result = await reportReceiveShard({
            amountEth: amountEth.toString(),
            txHash: tx.hash,
            senderAddress: tx.from,
            network,
            authToken,
          });

          const earned = result?.earnedShards ?? 0;
          if (earned > 0) {
            shardsAwarded += earned;
            console.log(`[incomingTxMonitor] Awarded ${earned} shard(s) for tx ${tx.hash}`);
          }
        } catch (error) {
          console.error(`[incomingTxMonitor] Failed to award shard for tx ${tx.hash}:`, error);
        }
      }

      // Update last checked block
      const blockNumber = parseInt(tx.blockNumber, 10);
      await saveLastCheckedBlock(walletAddress, network, blockNumber);
    }

    console.log(`[incomingTxMonitor] Total shards awarded: ${shardsAwarded}`);
    return shardsAwarded;
  } catch (error) {
    console.error('[incomingTxMonitor] Error checking incoming transactions:', error);
    return 0;
  }
}

/**
 * Reset monitoring (useful for testing or resetting state)
 */
export async function resetIncomingTxMonitor(
  walletAddress: string,
  network: Network
): Promise<void> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${network}_${walletAddress.toLowerCase()}`;
    await AsyncStorage.removeItem(key);
    console.log('[incomingTxMonitor] Reset monitoring for', walletAddress);
  } catch (error) {
    console.error('[incomingTxMonitor] Failed to reset:', error);
  }
}
