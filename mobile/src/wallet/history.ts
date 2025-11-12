/**
 * Unified Transaction History
 * 
 * Combines:
 * - Outgoing transactions (from our address)
 * - Incoming transactions (to our address)
 * - ETH and ERC-20 transfers
 * 
 * Features:
 * - Normalized format
 * - Status tracking (pending/confirmed/failed)
 * - Caching with AsyncStorage
 * - Pagination support
 * - Network filtering
 */

import { ethers, BigNumber } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getProvider } from '../services/blockchain/ethereumProvider';
import { getMonitor, type IncomingTransaction } from './incoming';
import type { Network } from '../config/env';
import ERC20_ABI from '../abi/erc20.json';

// ============================================================================
// Types
// ============================================================================

export type TransactionType = 'ETH' | 'ERC20';
export type TransactionDirection = 'in' | 'out';
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface NormalizedTransaction {
  id: string;                    // Unique ID
  hash: string;
  type: TransactionType;
  direction: TransactionDirection;
  status: TransactionStatus;
  from: string;
  to: string;
  amount: string;                // Human-readable
  amountRaw: string;             // Wei/smallest units
  token?: {
    address: string;
    symbol: string;
    decimals: number;
  };
  blockNumber: number;
  timestamp: number;
  confirmations: number;
  gasUsed?: string;
  gasPrice?: string;
  fee?: string;                  // Total fee in ETH
  network: Network;
}

export interface HistoryFilter {
  type?: TransactionType;
  direction?: TransactionDirection;
  status?: TransactionStatus;
  search?: string;               // Search by hash or address
}

export interface HistoryOptions {
  address: string;
  network: Network;
  limit?: number;
  offset?: number;
  filter?: HistoryFilter;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY_PREFIX = 'tx_history_';
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_LIMIT = 50;
const TRANSFER_EVENT_SIGNATURE = ethers.utils.id('Transfer(address,address,uint256)');

// ============================================================================
// Storage
// ============================================================================

interface CachedHistory {
  transactions: NormalizedTransaction[];
  timestamp: number;
  lastBlock: number;
}

async function loadCache(address: string, network: Network): Promise<CachedHistory | null> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${address}_${network}`;
    const data = await AsyncStorage.getItem(key);
    
    if (data) {
      const parsed: CachedHistory = JSON.parse(data);
      
      // Check if cache is still valid
      if (Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error loading cache:', error);
  }
  
  return null;
}

async function saveCache(
  address: string,
  network: Network,
  transactions: NormalizedTransaction[],
  lastBlock: number
): Promise<void> {
  try {
    const key = `${STORAGE_KEY_PREFIX}${address}_${network}`;
    const data: CachedHistory = {
      transactions,
      timestamp: Date.now(),
      lastBlock,
    };
    
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving cache:', error);
  }
}

// ============================================================================
// Normalization
// ============================================================================

/**
 * Normalize incoming transaction to unified format
 */
function normalizeIncoming(tx: IncomingTransaction): NormalizedTransaction {
  return {
    id: tx.id,
    hash: tx.txHash,
    type: tx.type === 'eth' ? 'ETH' : 'ERC20',
    direction: 'in',
    status: tx.isStable ? 'confirmed' : 'pending',
    from: tx.from,
    to: tx.to,
    amount: tx.value,
    amountRaw: tx.valueRaw,
    token: tx.type === 'erc20' && tx.tokenAddress ? {
      address: tx.tokenAddress,
      symbol: tx.tokenSymbol || 'UNKNOWN',
      decimals: tx.tokenDecimals || 18,
    } : undefined,
    blockNumber: tx.blockNumber,
    timestamp: tx.timestamp,
    confirmations: tx.confirmations,
    network: tx.network,
  };
}

/**
 * Normalize outgoing ETH transaction
 */
async function normalizeOutgoingETH(
  tx: ethers.providers.TransactionResponse,
  receipt: ethers.providers.TransactionReceipt | null,
  myAddress: string,
  network: Network
): Promise<NormalizedTransaction> {
  const provider = getProvider(network);
  const currentBlock = await provider.getBlockNumber();
  const confirmations = receipt ? currentBlock - receipt.blockNumber + 1 : 0;
  
  // Get block for timestamp
  const block = await provider.getBlock(tx.blockNumber || 'latest');
  
  // Calculate fee
  let fee: string | undefined;
  if (receipt) {
    const gasUsed = receipt.gasUsed;
    const effectiveGasPrice = receipt.effectiveGasPrice || tx.gasPrice;
    if (effectiveGasPrice) {
      const feeWei = gasUsed.mul(effectiveGasPrice);
      fee = ethers.utils.formatEther(feeWei);
    }
  }
  
  return {
    id: `${tx.hash}_eth_out`,
    hash: tx.hash,
    type: 'ETH',
    direction: 'out',
    status: receipt
      ? receipt.status === 1 ? 'confirmed' : 'failed'
      : 'pending',
    from: tx.from,
    to: tx.to || '',
    amount: ethers.utils.formatEther(tx.value),
    amountRaw: tx.value.toString(),
    blockNumber: tx.blockNumber || 0,
    timestamp: block.timestamp * 1000,
    confirmations,
    gasUsed: receipt?.gasUsed.toString(),
    gasPrice: tx.gasPrice?.toString(),
    fee,
    network,
  };
}

/**
 * Normalize outgoing ERC-20 transaction
 */
async function normalizeOutgoingERC20(
  log: ethers.providers.Log,
  receipt: ethers.providers.TransactionReceipt,
  myAddress: string,
  network: Network
): Promise<NormalizedTransaction> {
  const provider = getProvider(network);
  const currentBlock = await provider.getBlockNumber();
  const confirmations = currentBlock - receipt.blockNumber + 1;
  
  // Parse log
  const iface = new ethers.utils.Interface(ERC20_ABI);
  const parsed = iface.parseLog(log);
  
  const from = parsed.args.from;
  const to = parsed.args.to;
  const value: BigNumber = parsed.args.value;
  
  // Get token metadata
  const tokenContract = new ethers.Contract(log.address, ERC20_ABI, provider);
  const [symbol, decimals] = await Promise.all([
    tokenContract.symbol().catch(() => 'UNKNOWN'),
    tokenContract.decimals().catch(() => 18),
  ]);
  
  // Get block for timestamp
  const block = await provider.getBlock(receipt.blockNumber);
  
  // Calculate fee
  const gasUsed = receipt.gasUsed;
  const effectiveGasPrice = receipt.effectiveGasPrice;
  const feeWei = gasUsed.mul(effectiveGasPrice);
  const fee = ethers.utils.formatEther(feeWei);
  
  return {
    id: `${log.transactionHash}_${log.logIndex}_out`,
    hash: log.transactionHash,
    type: 'ERC20',
    direction: 'out',
    status: receipt.status === 1 ? 'confirmed' : 'failed',
    from,
    to,
    amount: ethers.utils.formatUnits(value, decimals),
    amountRaw: value.toString(),
    token: {
      address: log.address,
      symbol,
      decimals,
    },
    blockNumber: receipt.blockNumber,
    timestamp: block.timestamp * 1000,
    confirmations,
    gasUsed: gasUsed.toString(),
    fee,
    network,
  };
}

// ============================================================================
// Fetching
// ============================================================================

/**
 * Fetch outgoing ETH transactions
 */
async function fetchOutgoingETH(
  address: string,
  network: Network,
  fromBlock: number,
  toBlock: number
): Promise<NormalizedTransaction[]> {
  const provider = getProvider(network);
  const transactions: NormalizedTransaction[] = [];
  
  console.log(`📤 Fetching outgoing ETH from block ${fromBlock} to ${toBlock}...`);
  
  // Get transaction history from provider
  // Note: This is a simplified approach. In production, use Etherscan API or indexer
  try {
    for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber += 10) {
      const endBlock = Math.min(blockNumber + 9, toBlock);
      
      // Get blocks with transactions
      for (let i = blockNumber; i <= endBlock; i++) {
        try {
          const block = await provider.getBlockWithTransactions(i);
          
          for (const tx of block.transactions) {
            // Check if from our address
            if (tx.from.toLowerCase() === address.toLowerCase()) {
              // Get receipt
              const receipt = await provider.getTransactionReceipt(tx.hash);
              
              // Normalize
              const normalized = await normalizeOutgoingETH(tx, receipt, address, network);
              transactions.push(normalized);
            }
          }
        } catch (error) {
          console.warn(`Error fetching block ${i}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error fetching outgoing ETH:', error);
  }
  
  return transactions;
}

/**
 * Fetch outgoing ERC-20 transactions using getLogs
 */
async function fetchOutgoingERC20(
  address: string,
  network: Network,
  fromBlock: number,
  toBlock: number
): Promise<NormalizedTransaction[]> {
  const provider = getProvider(network);
  const transactions: NormalizedTransaction[] = [];
  
  console.log(`📤 Fetching outgoing ERC-20 from block ${fromBlock} to ${toBlock}...`);
  
  try {
    // Get Transfer events where 'from' is our address
    const filter = {
      fromBlock,
      toBlock,
      topics: [
        TRANSFER_EVENT_SIGNATURE,
        ethers.utils.hexZeroPad(address, 32), // from (our address)
        null, // to (any)
      ],
    };
    
    const logs = await provider.getLogs(filter);
    
    for (const log of logs) {
      try {
        // Get receipt
        const receipt = await provider.getTransactionReceipt(log.transactionHash);
        
        // Normalize
        const normalized = await normalizeOutgoingERC20(log, receipt, address, network);
        transactions.push(normalized);
      } catch (error) {
        console.warn(`Error processing log ${log.transactionHash}:`, error);
      }
    }
  } catch (error) {
    console.error('Error fetching outgoing ERC-20:', error);
  }
  
  return transactions;
}

/**
 * Fetch incoming transactions from monitor
 */
function fetchIncoming(address: string, network: Network): NormalizedTransaction[] {
  const monitor = getMonitor({ address, network });
  const incoming = monitor.getTransactions();
  
  return incoming.map(normalizeIncoming);
}

// ============================================================================
// Main API
// ============================================================================

/**
 * Get transaction history for address
 */
export async function getTransactionHistory(
  options: HistoryOptions
): Promise<NormalizedTransaction[]> {
  const {
    address,
    network,
    limit = DEFAULT_LIMIT,
    offset = 0,
    filter,
  } = options;
  
  console.log(`📜 Getting transaction history for ${address.slice(0, 6)}...`);
  
  // Try to load from cache
  const cached = await loadCache(address, network);
  
  let transactions: NormalizedTransaction[];
  let lastBlock: number;
  
  if (cached) {
    console.log(`📂 Using cached history (${cached.transactions.length} transactions)`);
    transactions = cached.transactions;
    lastBlock = cached.lastBlock;
    
    // Update with new blocks
    const provider = getProvider(network);
    const currentBlock = await provider.getBlockNumber();
    
    if (currentBlock > lastBlock) {
      console.log(`🔄 Updating from block ${lastBlock + 1} to ${currentBlock}`);
      
      // Fetch new outgoing
      const newOutgoingETH = await fetchOutgoingETH(address, network, lastBlock + 1, currentBlock);
      const newOutgoingERC20 = await fetchOutgoingERC20(address, network, lastBlock + 1, currentBlock);
      
      // Fetch new incoming
      const newIncoming = fetchIncoming(address, network);
      
      // Merge
      transactions = [
        ...transactions,
        ...newOutgoingETH,
        ...newOutgoingERC20,
        ...newIncoming,
      ];
      
      // Deduplicate by ID
      const uniqueMap = new Map<string, NormalizedTransaction>();
      for (const tx of transactions) {
        uniqueMap.set(tx.id, tx);
      }
      transactions = Array.from(uniqueMap.values());
      
      lastBlock = currentBlock;
      
      // Save to cache
      await saveCache(address, network, transactions, lastBlock);
    }
  } else {
    console.log(`🔍 Fetching fresh history...`);
    
    const provider = getProvider(network);
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 1000); // Last ~1000 blocks
    
    // Fetch all
    const [outgoingETH, outgoingERC20, incoming] = await Promise.all([
      fetchOutgoingETH(address, network, fromBlock, currentBlock),
      fetchOutgoingERC20(address, network, fromBlock, currentBlock),
      Promise.resolve(fetchIncoming(address, network)),
    ]);
    
    // Merge
    transactions = [...outgoingETH, ...outgoingERC20, ...incoming];
    
    // Deduplicate
    const uniqueMap = new Map<string, NormalizedTransaction>();
    for (const tx of transactions) {
      uniqueMap.set(tx.id, tx);
    }
    transactions = Array.from(uniqueMap.values());
    
    lastBlock = currentBlock;
    
    // Save to cache
    await saveCache(address, network, transactions, lastBlock);
  }
  
  // Apply filters
  if (filter) {
    transactions = applyFilters(transactions, filter);
  }
  
  // Sort by timestamp (newest first)
  transactions.sort((a, b) => b.timestamp - a.timestamp);
  
  // Apply pagination
  const paginated = transactions.slice(offset, offset + limit);
  
  console.log(`✅ Returning ${paginated.length} transactions (total: ${transactions.length})`);
  
  return paginated;
}

/**
 * Apply filters to transactions
 */
function applyFilters(
  transactions: NormalizedTransaction[],
  filter: HistoryFilter
): NormalizedTransaction[] {
  let filtered = transactions;
  
  if (filter.type) {
    filtered = filtered.filter(tx => tx.type === filter.type);
  }
  
  if (filter.direction) {
    filtered = filtered.filter(tx => tx.direction === filter.direction);
  }
  
  if (filter.status) {
    filtered = filtered.filter(tx => tx.status === filter.status);
  }
  
  if (filter.search) {
    const search = filter.search.toLowerCase();
    filtered = filtered.filter(tx =>
      tx.hash.toLowerCase().includes(search) ||
      tx.from.toLowerCase().includes(search) ||
      tx.to.toLowerCase().includes(search)
    );
  }
  
  return filtered;
}

/**
 * Get transaction by hash
 */
export async function getTransactionByHash(
  hash: string,
  network: Network
): Promise<NormalizedTransaction | null> {
  const provider = getProvider(network);
  
  try {
    const tx = await provider.getTransaction(hash);
    if (!tx) return null;
    
    const receipt = await provider.getTransactionReceipt(hash);
    
    // Determine if ETH or ERC-20
    if (tx.data === '0x' || tx.data === '0x0') {
      // ETH transfer
      return normalizeOutgoingETH(tx, receipt, tx.from, network);
    } else {
      // Possibly ERC-20, check logs
      if (receipt) {
        for (const log of receipt.logs) {
          if (log.topics[0] === TRANSFER_EVENT_SIGNATURE) {
            return normalizeOutgoingERC20(log, receipt, tx.from, network);
          }
        }
      }
      
      // Fallback to ETH
      return normalizeOutgoingETH(tx, receipt, tx.from, network);
    }
  } catch (error) {
    console.error('Error getting transaction:', error);
    return null;
  }
}

/**
 * Clear cache for address
 */
export async function clearHistoryCache(address: string, network: Network): Promise<void> {
  const key = `${STORAGE_KEY_PREFIX}${address}_${network}`;
  await AsyncStorage.removeItem(key);
  console.log('🗑️  Cleared history cache');
}
