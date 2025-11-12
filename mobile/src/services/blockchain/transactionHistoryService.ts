import { ethers } from 'ethers';
import { getProviderWithFallback } from './ethereumProvider';
import type { Network } from '../../constants/rpcUrls';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string; // in ETH
  timestamp: number;
  blockNumber: number;
  status: 'pending' | 'confirmed' | 'failed';
  gasUsed?: string;
  gasPrice?: string;
  fee?: string; // total fee in ETH
  type: 'sent' | 'received';
}

const CACHE_KEY_PREFIX = 'tx_history_';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

interface CachedTransactions {
  transactions: Transaction[];
  timestamp: number;
}

// Etherscan API endpoints (free tier, no API key needed for basic queries)
const ETHERSCAN_API_URLS: Record<Network, string> = {
  mainnet: 'https://api.etherscan.io/api',
  sepolia: 'https://api-sepolia.etherscan.io/api',
  holesky: 'https://api-holesky.etherscan.io/api',
};

/**
 * Fetch transaction history from Etherscan API
 * This is more reliable than scanning blocks manually
 */
async function fetchFromEtherscan(address: string, network: Network): Promise<Transaction[]> {
  try {
    const apiUrl = ETHERSCAN_API_URLS[network];
    const url = `${apiUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&page=1&offset=50`;

    console.log(`📊 Fetching transactions from Etherscan for ${address.slice(0, 6)}...${address.slice(-4)}`);

    // Add timeout for fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`⚠️ Etherscan API HTTP error: ${response.status}`);
        return [];
      }

      const data = await response.json();

      if (data.status !== '1') {
        // Common Etherscan errors
        if (data.message === 'No transactions found') {
          console.log(`ℹ️  No transactions found for this address`);
          return [];
        }
        if (data.message === 'NOTOK') {
          console.warn(`⚠️ Etherscan API rate limit or error (${data.result || 'unknown'})`);
          return [];
        }
        console.warn(`⚠️ Etherscan API error: ${data.message}`);
        return [];
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.warn(`⚠️ Etherscan API timeout after 10s`);
      } else {
        console.warn(`⚠️ Etherscan fetch error: ${fetchError.message}`);
      }
      return [];
    }

    const transactions: Transaction[] = data.result.map((tx: any) => {
      const valueEth = ethers.utils.formatEther(tx.value);
      const gasCost = ethers.BigNumber.from(tx.gasUsed).mul(ethers.BigNumber.from(tx.gasPrice));
      const feeEth = ethers.utils.formatEther(gasCost);

      return {
        hash: tx.hash,
        from: tx.from.toLowerCase(),
        to: tx.to.toLowerCase(),
        value: valueEth,
        timestamp: parseInt(tx.timeStamp) * 1000, // Convert to milliseconds
        blockNumber: parseInt(tx.blockNumber),
        status: tx.isError === '0' ? 'confirmed' : 'failed',
        gasUsed: tx.gasUsed,
        gasPrice: ethers.utils.formatUnits(tx.gasPrice, 'gwei'),
        fee: feeEth,
        type: tx.from.toLowerCase() === address.toLowerCase() ? 'sent' : 'received',
      };
    });

    console.log(`✅ Fetched ${transactions.length} transactions from Etherscan`);
    return transactions;
  } catch (error: any) {
    console.error(`❌ Failed to fetch from Etherscan: ${error.message}`);
    return [];
  }
}

/**
 * Fallback: Scan recent blocks for transactions (less reliable, slower)
 */
async function scanRecentBlocks(address: string, network: Network, blockCount = 1000): Promise<Transaction[]> {
  try {
    console.log(`Scanning recent ${blockCount} blocks for ${address}`);
    const provider = await getProviderWithFallback(network);

    const currentBlock = await provider.getBlockNumber();
    const startBlock = Math.max(0, currentBlock - blockCount);

    const transactions: Transaction[] = [];

    // Scan blocks in chunks to avoid timeout
    const chunkSize = 100;
    for (let i = startBlock; i <= currentBlock; i += chunkSize) {
      const endBlock = Math.min(i + chunkSize - 1, currentBlock);

      for (let blockNum = i; blockNum <= endBlock; blockNum++) {
        try {
          const block = await provider.getBlockWithTransactions(blockNum);

          for (const tx of block.transactions) {
            const fromMatch = tx.from.toLowerCase() === address.toLowerCase();
            const toMatch = tx.to?.toLowerCase() === address.toLowerCase();

            if (fromMatch || toMatch) {
              const receipt = await provider.getTransactionReceipt(tx.hash);
              const valueEth = ethers.utils.formatEther(tx.value);
              const gasCost = receipt.gasUsed.mul(tx.gasPrice || 0);
              const feeEth = ethers.utils.formatEther(gasCost);

              transactions.push({
                hash: tx.hash,
                from: tx.from.toLowerCase(),
                to: tx.to?.toLowerCase() || '',
                value: valueEth,
                timestamp: block.timestamp * 1000,
                blockNumber: blockNum,
                status: receipt.status === 1 ? 'confirmed' : 'failed',
                gasUsed: receipt.gasUsed.toString(),
                gasPrice: ethers.utils.formatUnits(tx.gasPrice || 0, 'gwei'),
                fee: feeEth,
                type: fromMatch ? 'sent' : 'received',
              });
            }
          }
        } catch (blockError) {
          console.warn(`Failed to scan block ${blockNum}:`, blockError);
        }
      }
    }

    console.log(`Found ${transactions.length} transactions by scanning blocks`);
    return transactions;
  } catch (error) {
    console.error('Failed to scan blocks:', error);
    return [];
  }
}

/**
 * Get cached transactions if available and not expired
 */
async function getCachedTransactions(address: string, network: Network): Promise<Transaction[] | null> {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${network}_${address.toLowerCase()}`;
    const cached = await AsyncStorage.getItem(cacheKey);

    if (!cached) return null;

    const data: CachedTransactions = JSON.parse(cached);
    const now = Date.now();

    if (now - data.timestamp > CACHE_EXPIRY_MS) {
      console.log('Transaction cache expired');
      return null;
    }

    console.log(`Returning ${data.transactions.length} cached transactions`);
    return data.transactions;
  } catch (error) {
    console.warn('Failed to get cached transactions:', error);
    return null;
  }
}

/**
 * Cache transactions
 */
async function cacheTransactions(address: string, network: Network, transactions: Transaction[]): Promise<void> {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${network}_${address.toLowerCase()}`;
    const data: CachedTransactions = {
      transactions,
      timestamp: Date.now(),
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    console.log(`Cached ${transactions.length} transactions`);
  } catch (error) {
    console.warn('Failed to cache transactions:', error);
  }
}

/**
 * Get transaction history for an address
 * Uses Etherscan API (block scanning disabled due to performance)
 */
export async function getTransactionHistory(
  address: string,
  network: Network,
  forceRefresh = false
): Promise<Transaction[]> {
  try {
    // Check cache first
    if (!forceRefresh) {
      const cached = await getCachedTransactions(address, network);
      if (cached) {
        console.log(`📦 Returning ${cached.length} cached transactions`);
        return cached;
      }
    }

    // Try Etherscan API
    console.log(`📡 Fetching transactions from Etherscan...`);
    let transactions = await fetchFromEtherscan(address, network);

    // If Etherscan fails, return empty array (block scanning is too slow)
    if (transactions.length === 0) {
      console.log('ℹ️  No transactions found or Etherscan unavailable');
      console.log('💡 Tip: Transactions will appear after first on-chain activity');
      return [];
    }

    // Cache the results
    await cacheTransactions(address, network, transactions);
    console.log(`✅ Found ${transactions.length} transactions`);

    return transactions;
  } catch (error: any) {
    console.error(`❌ Failed to get transaction history: ${error.message}`);
    return [];
  }
}

/**
 * Get a single transaction by hash
 */
export async function getTransactionByHash(
  txHash: string,
  network: Network
): Promise<Transaction | null> {
  try {
    const provider = await getProviderWithFallback(network);
    const tx = await provider.getTransaction(txHash);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!tx || !receipt) return null;

    const block = await provider.getBlock(tx.blockNumber || 0);
    const valueEth = ethers.utils.formatEther(tx.value);
    const gasCost = receipt.gasUsed.mul(tx.gasPrice || 0);
    const feeEth = ethers.utils.formatEther(gasCost);

    return {
      hash: tx.hash,
      from: tx.from.toLowerCase(),
      to: tx.to?.toLowerCase() || '',
      value: valueEth,
      timestamp: block.timestamp * 1000,
      blockNumber: tx.blockNumber || 0,
      status: receipt.status === 1 ? 'confirmed' : 'failed',
      gasUsed: receipt.gasUsed.toString(),
      gasPrice: ethers.utils.formatUnits(tx.gasPrice || 0, 'gwei'),
      fee: feeEth,
      type: 'sent', // We don't know without context
    };
  } catch (error) {
    console.error('Failed to get transaction:', error);
    return null;
  }
}

/**
 * Clear transaction cache for an address
 */
export async function clearTransactionCache(address: string, network: Network): Promise<void> {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${network}_${address.toLowerCase()}`;
    await AsyncStorage.removeItem(cacheKey);
    console.log('Transaction cache cleared');
  } catch (error) {
    console.warn('Failed to clear cache:', error);
  }
}
