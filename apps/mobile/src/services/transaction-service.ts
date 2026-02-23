/**
 * Transaction Service
 * Handles fetching transaction history from blockchain via RPC
 *
 * Delegates Alchemy fetch to @e-y/shared.
 * Keeps: ethers block-scanning fallback, fetchTransactionDetails (platform-specific).
 */

import { formatEther } from 'ethers';
import {
  fetchTransactionHistory as sharedFetchHistory,
  fetchMultiChainTransactionHistory as sharedFetchMultiChain,
} from '@e-y/shared';
import { getProvider } from './balance-service';
import { TIER1_NETWORK_IDS, getAlchemyUrl } from '@/src/constants/networks';

export type TransactionDirection = 'sent' | 'received';
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  direction: TransactionDirection;
  status: TransactionStatus;
  gasUsed?: string;
  gasPrice?: string;
  blockNumber?: number;
  timestamp: number;
  createdAt: string;
  networkId?: string; // which network this tx is on
}

export interface TransactionDetails extends Transaction {
  nonce: number;
  data: string;
  value: string;
  confirmations: number;
}

/**
 * Fetch transaction history for an address
 * Uses shared Alchemy function, falls back to ethers block scanning
 */
export async function fetchTransactionHistory(
  address: string,
  limit: number = 20
): Promise<Transaction[]> {
  const ALCHEMY_API_KEY = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY;
  const NETWORK = process.env.EXPO_PUBLIC_NETWORK || 'sepolia';

  if (ALCHEMY_API_KEY) {
    const alchemyUrl = `https://eth-${NETWORK}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
    const sharedTxs = await sharedFetchHistory(alchemyUrl, address, limit);
    if (sharedTxs.length > 0) {
      return sharedTxs;
    }
  }

  // Fallback: scan recent blocks (ethers-specific, stays local)
  try {
    const provider = getProvider();
    const addressLower = address.toLowerCase();
    const currentBlock = await provider.getBlockNumber();
    const transactions: Transaction[] = [];
    const maxBlocks = 1000;

    for (let i = 0; i < maxBlocks && transactions.length < limit; i++) {
      const blockNumber = currentBlock - i;
      if (blockNumber < 0) break;

      if (i > 0 && i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      try {
        const block = await provider.getBlock(blockNumber, true);
        if (!block?.transactions?.length) continue;

        for (const txHash of block.transactions.slice(0, 50)) {
          if (transactions.length >= limit) break;
          if (typeof txHash !== 'string') continue;

          try {
            const tx = await provider.getTransaction(txHash);
            if (!tx) continue;

            const isFrom = tx.from.toLowerCase() === addressLower;
            const isTo = tx.to?.toLowerCase() === addressLower;

            if (isFrom || isTo) {
              const receipt = await provider.getTransactionReceipt(txHash).catch((err) => {
                console.error(`Failed to fetch receipt for tx ${txHash}:`, err);
                return null;
              });
              const amount = formatEther(tx.value || '0');

              transactions.push({
                hash: txHash,
                from: tx.from,
                to: tx.to || '',
                amount: parseFloat(amount).toFixed(6),
                token: 'ETH',
                direction: isFrom ? 'sent' : 'received',
                status: receipt ? (receipt.status === 1 ? 'confirmed' : 'failed') : 'pending',
                gasUsed: receipt?.gasUsed?.toString(),
                gasPrice: tx.gasPrice?.toString(),
                blockNumber: receipt?.blockNumber,
                timestamp: block.timestamp * 1000,
                createdAt: new Date(block.timestamp * 1000).toISOString(),
              });
            }
          } catch {
            continue;
          }
        }
      } catch {
        continue;
      }
    }

    transactions.sort((a, b) => b.timestamp - a.timestamp);
    return transactions.slice(0, limit);
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return [];
  }
}

/**
 * Fetch detailed transaction information (platform-specific: uses ethers RPC)
 */
export async function fetchTransactionDetails(
  txHash: string,
  userAddress: string
): Promise<TransactionDetails> {
  try {
    const provider = getProvider();
    const [tx, receipt] = await Promise.all([
      provider.getTransaction(txHash),
      provider.getTransactionReceipt(txHash).catch((err) => {
        console.error(`Failed to fetch receipt for tx ${txHash}:`, err);
        return null;
      }),
    ]);

    if (!tx) {
      throw new Error('Transaction not found');
    }

    const block = await provider.getBlock(tx.blockNumber || 'latest');
    const status: TransactionStatus = receipt
      ? receipt.status === 1 ? 'confirmed' : 'failed'
      : 'pending';

    const amount = formatEther(tx.value || '0');
    const isFrom = tx.from.toLowerCase() === userAddress.toLowerCase();
    let confirmations = 0;

    if (receipt?.blockNumber) {
      const currentBlock = await provider.getBlockNumber();
      confirmations = currentBlock - receipt.blockNumber + 1;
    }

    return {
      hash: txHash,
      from: tx.from,
      to: tx.to || '',
      amount: parseFloat(amount).toFixed(6),
      token: 'ETH',
      direction: isFrom ? 'sent' : 'received',
      status,
      gasUsed: receipt?.gasUsed?.toString(),
      gasPrice: tx.gasPrice?.toString(),
      blockNumber: receipt?.blockNumber,
      timestamp: block?.timestamp ? block.timestamp * 1000 : Date.now(),
      createdAt: block?.timestamp
        ? new Date(block.timestamp * 1000).toISOString()
        : new Date().toISOString(),
      nonce: tx.nonce,
      data: tx.data,
      value: tx.value?.toString() || '0',
      confirmations,
    };
  } catch (error) {
    console.error('Error fetching transaction details:', error);
    throw new Error('Failed to fetch transaction details');
  }
}

/**
 * Fetch transaction history across all Tier 1 networks (for real accounts).
 * Uses shared multi-chain fetcher with mobile Alchemy URLs.
 */
export async function fetchMultiChainHistory(
  address: string,
  limit: number = 20,
): Promise<Transaction[]> {
  const networks = TIER1_NETWORK_IDS.map(id => ({
    networkId: id,
    alchemyUrl: getAlchemyUrl(id),
  }));

  const items = await sharedFetchMultiChain(networks, address, limit);

  // Map shared TransactionHistoryItem to mobile Transaction
  return items.map(item => ({
    hash: item.hash,
    from: item.from,
    to: item.to,
    amount: item.amount,
    token: item.token,
    direction: item.direction,
    status: item.status,
    blockNumber: item.blockNumber,
    timestamp: item.timestamp,
    createdAt: item.createdAt,
    networkId: item.networkId,
  }));
}
