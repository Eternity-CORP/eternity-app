/**
 * Transaction Service
 * Handles fetching transaction history from blockchain via RPC
 */

import { formatEther } from 'ethers';
import type { TransactionReceipt } from 'ethers';
import { getProvider } from './balance-service';

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
}

export interface TransactionDetails extends Transaction {
  nonce: number;
  data: string;
  value: string;
  confirmations: number;
}

/**
 * Fetch transactions using Alchemy getAssetTransfers API
 */
async function fetchViaAlchemy(address: string, limit: number): Promise<Transaction[]> {
  const ALCHEMY_API_KEY = process.env.EXPO_PUBLIC_ALCHEMY_API_KEY || 'UrBsk4l8uqp1oQid2tGGtrcKXybIZqbR';
  const NETWORK = process.env.EXPO_PUBLIC_NETWORK || 'sepolia';
  const url = `https://eth-${NETWORK}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

  try {
    const [receivedRes, sentRes] = await Promise.all([
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getAssetTransfers',
          params: [{
            fromBlock: '0x0',
            toBlock: 'latest',
            toAddress: address,
            category: ['external'],
            withMetadata: true,
            excludeZeroValue: false,
            maxCount: `0x${limit.toString(16)}`,
          }],
        }),
      }),
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'alchemy_getAssetTransfers',
          params: [{
            fromBlock: '0x0',
            toBlock: 'latest',
            fromAddress: address,
            category: ['external'],
            withMetadata: true,
            excludeZeroValue: false,
            maxCount: `0x${limit.toString(16)}`,
          }],
        }),
      }),
    ]);

    const [receivedData, sentData] = await Promise.all([
      receivedRes.json(),
      sentRes.json(),
    ]);

    const transactions: Transaction[] = [];

    if (receivedData.result?.transfers) {
      for (const t of receivedData.result.transfers) {
        if (t.asset === 'ETH' && t.value) {
          transactions.push({
            hash: t.hash,
            from: t.from,
            to: t.to,
            amount: parseFloat(t.value).toFixed(6),
            token: 'ETH',
            direction: 'received',
            status: 'confirmed',
            blockNumber: t.blockNum ? parseInt(t.blockNum, 16) : undefined,
            timestamp: t.metadata?.blockTimestamp
              ? new Date(t.metadata.blockTimestamp).getTime()
              : Date.now(),
            createdAt: t.metadata?.blockTimestamp || new Date().toISOString(),
          });
        }
      }
    }

    if (sentData.result?.transfers) {
      for (const t of sentData.result.transfers) {
        if (t.asset === 'ETH' && t.value) {
          transactions.push({
            hash: t.hash,
            from: t.from,
            to: t.to,
            amount: parseFloat(t.value).toFixed(6),
            token: 'ETH',
            direction: 'sent',
            status: 'confirmed',
            blockNumber: t.blockNum ? parseInt(t.blockNum, 16) : undefined,
            timestamp: t.metadata?.blockTimestamp
              ? new Date(t.metadata.blockTimestamp).getTime()
              : Date.now(),
            createdAt: t.metadata?.blockTimestamp || new Date().toISOString(),
          });
        }
      }
    }

    const unique = new Map<string, Transaction>();
    transactions.sort((a, b) => b.timestamp - a.timestamp);
    for (const tx of transactions) {
      if (!unique.has(tx.hash)) {
        unique.set(tx.hash, tx);
      }
    }

    return Array.from(unique.values()).slice(0, limit);
  } catch (error) {
    console.error('Alchemy API error:', error);
    return [];
  }
}

/**
 * Fetch transaction history for an address
 */
export async function fetchTransactionHistory(
  address: string,
  limit: number = 20
): Promise<Transaction[]> {
  const alchemyTxs = await fetchViaAlchemy(address, limit);
  if (alchemyTxs.length > 0) {
    return alchemyTxs;
  }

  // Fallback: scan recent blocks
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
              const receipt = await provider.getTransactionReceipt(txHash).catch(() => null);
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
