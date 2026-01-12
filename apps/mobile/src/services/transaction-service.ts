/**
 * Transaction Service
 * Handles fetching transaction history from blockchain via RPC
 */

import { JsonRpcProvider, formatEther } from 'ethers';
import type { TransactionResponse, TransactionReceipt } from 'ethers';

// Reuse RPC provider from balance-service
import { getProvider } from './balance-service';

export type TransactionDirection = 'sent' | 'received';
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  amount: string; // Human-readable amount (e.g., "0.1")
  token: string; // 'ETH' or token contract address
  direction: TransactionDirection;
  status: TransactionStatus;
  gasUsed?: string;
  gasPrice?: string;
  blockNumber?: number;
  timestamp: number; // Unix timestamp
  createdAt: string; // ISO string
}

export interface TransactionDetails extends Transaction {
  nonce: number;
  data: string;
  value: string; // Raw value in Wei
  confirmations: number;
}

/**
 * Fetch transaction history for an address
 * Uses Alchemy/Infura RPC to get recent transactions
 * Note: Free tier RPC providers have limited history, may need to use indexer API for full history
 */
export async function fetchTransactionHistory(
  address: string,
  limit: number = 20
): Promise<Transaction[]> {
  try {
    const provider = getProvider();
    
    // Get current block number
    const currentBlock = await provider.getBlockNumber();
    
    // Fetch transactions from recent blocks (last 100 blocks for free tier)
    // For production, consider using Alchemy's getAssetTransfers API or similar
    const transactions: Transaction[] = [];
    const maxBlocksToScan = 100; // Limit for free tier RPC
    
    // Scan recent blocks
    for (let i = 0; i < maxBlocksToScan && transactions.length < limit; i++) {
      const blockNumber = currentBlock - i;
      if (blockNumber < 0) break;
      
      try {
        const block = await provider.getBlock(blockNumber, true);
        if (!block || !block.transactions) continue;
        
        // Check each transaction in the block
        for (const txHash of block.transactions) {
          if (transactions.length >= limit) break;
          
          if (typeof txHash === 'string') {
            const tx = await provider.getTransaction(txHash);
            if (!tx) continue;
            
            // Check if transaction involves our address
            const isFrom = tx.from.toLowerCase() === address.toLowerCase();
            const isTo = tx.to && tx.to.toLowerCase() === address.toLowerCase();
            
            if (isFrom || isTo) {
              // Get transaction receipt for status
              let receipt: TransactionReceipt | null = null;
              let status: TransactionStatus = 'pending';
              
              try {
                receipt = await provider.getTransactionReceipt(txHash);
                if (receipt) {
                  status = receipt.status === 1 ? 'confirmed' : 'failed';
                }
              } catch (error) {
                // Transaction might still be pending
                status = 'pending';
              }
              
              const direction: TransactionDirection = isFrom ? 'sent' : 'received';
              const amount = formatEther(tx.value || '0');
              
              transactions.push({
                hash: txHash,
                from: tx.from,
                to: tx.to || '',
                amount: parseFloat(amount).toFixed(6),
                token: 'ETH',
                direction,
                status,
                gasUsed: receipt?.gasUsed?.toString(),
                gasPrice: tx.gasPrice?.toString(),
                blockNumber: receipt?.blockNumber,
                timestamp: block.timestamp * 1000, // Convert to milliseconds
                createdAt: new Date(block.timestamp * 1000).toISOString(),
              });
            }
          }
        }
      } catch (error) {
        console.warn(`Error scanning block ${blockNumber}:`, error);
        // Continue with next block
        continue;
      }
    }
    
    // Sort by timestamp (newest first)
    transactions.sort((a, b) => b.timestamp - a.timestamp);
    
    return transactions.slice(0, limit);
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    throw new Error('Failed to fetch transaction history');
  }
}

/**
 * Fetch detailed transaction information
 */
export async function fetchTransactionDetails(
  txHash: string,
  userAddress: string
): Promise<TransactionDetails> {
  try {
    const provider = getProvider();
    
    const [tx, receipt] = await Promise.all([
      provider.getTransaction(txHash),
      provider.getTransactionReceipt(txHash).catch(() => null),
    ]);
    
    if (!tx) {
      throw new Error('Transaction not found');
    }
    
    const block = await provider.getBlock(tx.blockNumber || 'latest');
    const status: TransactionStatus = receipt
      ? receipt.status === 1
        ? 'confirmed'
        : 'failed'
      : 'pending';
    
    const amount = formatEther(tx.value || '0');
    const isFrom = tx.from.toLowerCase() === userAddress.toLowerCase();
    const direction: TransactionDirection = isFrom ? 'sent' : 'received';
    
    // Calculate confirmations
    let confirmations = 0;
    if (receipt && receipt.blockNumber) {
      const currentBlock = await getCurrentBlockNumber();
      confirmations = currentBlock - receipt.blockNumber + 1;
    }
    
    return {
      hash: txHash,
      from: tx.from,
      to: tx.to || '',
      amount: parseFloat(amount).toFixed(6),
      token: 'ETH',
      direction,
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
 * Get current block number (helper)
 */
async function getCurrentBlockNumber(): Promise<number> {
  const provider = getProvider();
  return await provider.getBlockNumber();
}

// Fix: Use getCurrentBlockNumber in fetchTransactionDetails
