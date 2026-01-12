/**
 * Transaction Service
 * Handles fetching transaction history from blockchain via RPC
 */

import { formatEther } from 'ethers';
import type { TransactionReceipt } from 'ethers';

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
 * Helper: Add delay to avoid rate limits
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch transaction history for an address
 * Uses optimized approach: scan fewer blocks with delays to avoid rate limits
 * Note: For production, consider using Alchemy's getAssetTransfers API
 */
export async function fetchTransactionHistory(
  address: string,
  limit: number = 20
): Promise<Transaction[]> {
  try {
    console.log('[TransactionService] Fetching history for address:', address);
    const provider = getProvider();
    const addressLower = address.toLowerCase();
    
    // Get current block number
    const currentBlock = await provider.getBlockNumber();
    console.log('[TransactionService] Current block:', currentBlock);
    
    // Optimized block scanning to balance rate limits and coverage
    // Scan last 100 blocks with delays to find recent transactions
    const transactions: Transaction[] = [];
    const maxBlocksToScan = 100; // Increased to 100 to find more transactions
    const delayBetweenBlocks = 200; // 200ms delay between block requests to avoid rate limits
    
    // Scan recent blocks with delays
    for (let i = 0; i < maxBlocksToScan && transactions.length < limit; i++) {
      const blockNumber = currentBlock - i;
      if (blockNumber < 0) break;
      
      // Add delay to avoid rate limits (except for first request)
      if (i > 0) {
        await delay(delayBetweenBlocks);
      }
      
      try {
        const block = await provider.getBlock(blockNumber, true);
        if (!block || !block.transactions || block.transactions.length === 0) {
          continue;
        }
        
        console.log(`[TransactionService] Scanning block ${blockNumber}, ${block.transactions.length} transactions`);
        
        // Check each transaction in the block
        for (const txHash of block.transactions) {
          if (transactions.length >= limit) break;
          
          if (typeof txHash === 'string') {
            try {
              const tx = await provider.getTransaction(txHash);
              if (!tx) continue;
              
              // Check if transaction involves our address
              const isFrom = tx.from.toLowerCase() === addressLower;
              const isTo = tx.to && tx.to.toLowerCase() === addressLower;
              
              // Debug: log transactions that might match (first 10 blocks only)
              if (i < 10) {
                const mightMatch = tx.from.toLowerCase().includes(addressLower.slice(2, 8)) || 
                                   (tx.to && tx.to.toLowerCase().includes(addressLower.slice(2, 8)));
                if (mightMatch) {
                  console.log(`[TransactionService] Potential match: tx ${txHash.slice(0, 10)}... from=${tx.from} to=${tx.to || 'null'}, ourAddr=${addressLower}`);
                }
              }
              
              if (isFrom || isTo) {
                console.log(`[TransactionService] ✅ MATCH! tx ${txHash.slice(0, 10)}... from=${tx.from} to=${tx.to || 'null'}, direction=${isFrom ? 'sent' : 'received'}, amount=${formatEther(tx.value || '0')}`);
                // Get transaction receipt for status (with delay)
                await delay(50); // Small delay before receipt request
                
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
            } catch (error) {
              // Skip this transaction if there's an error
              continue;
            }
          }
        }
      } catch (error) {
        // If rate limited, stop scanning and return what we have
        if (error instanceof Error && error.message.includes('429')) {
          console.warn('Rate limited, returning partial transaction history');
          break;
        }
        // Continue with next block for other errors
        continue;
      }
    }
    
    // Sort by timestamp (newest first)
    transactions.sort((a, b) => b.timestamp - a.timestamp);
    
    const result = transactions.slice(0, limit);
    console.log('[TransactionService] Total found:', result.length, 'transactions after scanning', maxBlocksToScan, 'blocks');
    if (result.length > 0) {
      console.log('[TransactionService] Sample transaction:', {
        hash: result[0].hash.slice(0, 10) + '...',
        direction: result[0].direction,
        amount: result[0].amount,
        status: result[0].status,
      });
    }
    return result;
  } catch (error) {
    console.error('[TransactionService] Error fetching transaction history:', error);
    // Return empty array instead of throwing to allow UI to show "no transactions"
    return [];
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
      const provider = getProvider();
      const currentBlock = await provider.getBlockNumber();
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

