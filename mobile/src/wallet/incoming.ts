/**
 * Incoming Transaction Monitor
 * 
 * Features:
 * - Monitor incoming ETH transfers
 * - Monitor incoming ERC-20 token transfers
 * - Block polling with efficient RPC usage
 * - Deduplication (txHash + logIndex)
 * - Persistent storage in AsyncStorage
 * - Reorg resistance (2+ confirmations)
 * - Event emission for UI updates
 */

import { ethers, BigNumber } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventEmitter } from 'events';
import { getProvider } from '../services/blockchain/ethereumProvider';
import type { Network } from '../config/env';
import ERC20_ABI from '../abi/erc20.json';

// ============================================================================
// Types
// ============================================================================

export interface IncomingTransaction {
  id: string;                    // Unique ID: txHash + (logIndex or 'eth')
  txHash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  value: string;                 // Human-readable amount
  valueRaw: string;              // Raw amount (wei or smallest units)
  type: 'eth' | 'erc20';
  tokenAddress?: string;         // For ERC-20
  tokenSymbol?: string;          // For ERC-20
  tokenDecimals?: number;        // For ERC-20
  confirmations: number;
  isStable: boolean;             // True after 2+ confirmations
  network: Network;
}

export interface MonitorConfig {
  address: string;
  network: Network;
  pollInterval?: number;         // Default: 12000ms (12 seconds)
  confirmationsRequired?: number; // Default: 2
  lookbackBlocks?: number;       // Default: 100 blocks
}

export interface MonitorState {
  lastProcessedBlock: number;
  transactions: Map<string, IncomingTransaction>;
}

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY_PREFIX = 'incoming_monitor_';
const DEFAULT_POLL_INTERVAL = 12000; // 12 seconds
const DEFAULT_CONFIRMATIONS = 2;
const DEFAULT_LOOKBACK_BLOCKS = 100;
const BATCH_SIZE = 10; // Process 10 blocks at a time

// ERC-20 Transfer event signature
const TRANSFER_EVENT_SIGNATURE = ethers.utils.id('Transfer(address,address,uint256)');

// ============================================================================
// Event Emitter
// ============================================================================

export class IncomingMonitorEmitter extends EventEmitter {
  emitNewTransaction(tx: IncomingTransaction) {
    this.emit('new-transaction', tx);
  }

  emitTransactionConfirmed(tx: IncomingTransaction) {
    this.emit('transaction-confirmed', tx);
  }

  emitError(error: Error) {
    this.emit('error', error);
  }
}

// ============================================================================
// Incoming Transaction Monitor
// ============================================================================

export class IncomingTransactionMonitor {
  private config: Required<MonitorConfig>;
  private state: MonitorState;
  private provider: ethers.providers.JsonRpcProvider;
  private emitter: IncomingMonitorEmitter;
  private pollTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private storageKey: string;

  constructor(config: MonitorConfig) {
    this.config = {
      ...config,
      pollInterval: config.pollInterval || DEFAULT_POLL_INTERVAL,
      confirmationsRequired: config.confirmationsRequired || DEFAULT_CONFIRMATIONS,
      lookbackBlocks: config.lookbackBlocks || DEFAULT_LOOKBACK_BLOCKS,
    };

    this.provider = getProvider(config.network);
    this.emitter = new IncomingMonitorEmitter();
    this.storageKey = `${STORAGE_KEY_PREFIX}${config.address}_${config.network}`;
    
    this.state = {
      lastProcessedBlock: 0,
      transactions: new Map(),
    };
  }

  /**
   * Get event emitter for listening to events
   */
  getEmitter(): IncomingMonitorEmitter {
    return this.emitter;
  }

  /**
   * Start monitoring
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Monitor already running');
      return;
    }

    console.log('🔍 Starting incoming transaction monitor...');
    console.log(`  Address: ${this.config.address}`);
    console.log(`  Network: ${this.config.network}`);

    // Load state from storage
    await this.loadState();

    // If no last processed block, start from recent blocks
    if (this.state.lastProcessedBlock === 0) {
      const currentBlock = await this.provider.getBlockNumber();
      this.state.lastProcessedBlock = Math.max(0, currentBlock - this.config.lookbackBlocks);
      console.log(`  Starting from block: ${this.state.lastProcessedBlock}`);
    }

    this.isRunning = true;
    
    // Start polling
    this.poll();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('⏹️  Stopping incoming transaction monitor...');
    
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    this.isRunning = false;
  }

  /**
   * Get all incoming transactions
   */
  getTransactions(): IncomingTransaction[] {
    return Array.from(this.state.transactions.values())
      .sort((a, b) => b.blockNumber - a.blockNumber);
  }

  /**
   * Get pending (unstable) transactions
   */
  getPendingTransactions(): IncomingTransaction[] {
    return this.getTransactions().filter(tx => !tx.isStable);
  }

  /**
   * Get confirmed (stable) transactions
   */
  getConfirmedTransactions(): IncomingTransaction[] {
    return this.getTransactions().filter(tx => tx.isStable);
  }

  /**
   * Poll for new blocks
   */
  private async poll(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await this.checkNewBlocks();
      await this.updateConfirmations();
      await this.saveState();
    } catch (error) {
      console.error('Poll error:', error);
      this.emitter.emitError(error as Error);
    }

    // Schedule next poll
    this.pollTimer = setTimeout(() => this.poll(), this.config.pollInterval);
  }

  /**
   * Check for new blocks and transactions
   */
  private async checkNewBlocks(): Promise<void> {
    const currentBlock = await this.provider.getBlockNumber();
    
    if (currentBlock <= this.state.lastProcessedBlock) {
      return; // No new blocks
    }

    const fromBlock = this.state.lastProcessedBlock + 1;
    const toBlock = Math.min(fromBlock + BATCH_SIZE - 1, currentBlock);

    console.log(`🔍 Checking blocks ${fromBlock} to ${toBlock}...`);

    // Check ETH transfers
    await this.checkETHTransfers(fromBlock, toBlock);

    // Check ERC-20 transfers
    await this.checkERC20Transfers(fromBlock, toBlock);

    // Update last processed block
    this.state.lastProcessedBlock = toBlock;
  }

  /**
   * Check for incoming ETH transfers
   */
  private async checkETHTransfers(fromBlock: number, toBlock: number): Promise<void> {
    const myAddress = this.config.address.toLowerCase();

    // Get all blocks in range
    for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber++) {
      try {
        const block = await this.provider.getBlockWithTransactions(blockNumber);
        
        // Check each transaction
        for (const tx of block.transactions) {
          // Skip if not to our address
          if (!tx.to || tx.to.toLowerCase() !== myAddress) {
            continue;
          }

          // Skip if value is 0
          if (tx.value.isZero()) {
            continue;
          }

          // Create unique ID
          const id = `${tx.hash}_eth`;

          // Skip if already processed
          if (this.state.transactions.has(id)) {
            continue;
          }

          // Get current block for confirmations
          const currentBlock = await this.provider.getBlockNumber();
          const confirmations = currentBlock - blockNumber + 1;

          // Create incoming transaction
          const incomingTx: IncomingTransaction = {
            id,
            txHash: tx.hash,
            blockNumber,
            timestamp: block.timestamp * 1000,
            from: tx.from,
            to: tx.to,
            value: ethers.utils.formatEther(tx.value),
            valueRaw: tx.value.toString(),
            type: 'eth',
            confirmations,
            isStable: confirmations >= this.config.confirmationsRequired,
            network: this.config.network,
          };

          // Add to state
          this.state.transactions.set(id, incomingTx);

          console.log(`✅ New incoming ETH: ${incomingTx.value} ETH from ${incomingTx.from.slice(0, 6)}...`);
          
          // Emit event
          this.emitter.emitNewTransaction(incomingTx);
        }
      } catch (error) {
        console.error(`Error checking block ${blockNumber}:`, error);
      }
    }
  }

  /**
   * Check for incoming ERC-20 transfers using getLogs
   */
  private async checkERC20Transfers(fromBlock: number, toBlock: number): Promise<void> {
    const myAddress = this.config.address.toLowerCase();

    try {
      // Get Transfer events where 'to' is our address
      const filter = {
        fromBlock,
        toBlock,
        topics: [
          TRANSFER_EVENT_SIGNATURE,
          null, // from (any)
          ethers.utils.hexZeroPad(this.config.address, 32), // to (our address)
        ],
      };

      const logs = await this.provider.getLogs(filter);

      for (const log of logs) {
        try {
          // Parse log
          const iface = new ethers.utils.Interface(ERC20_ABI);
          const parsed = iface.parseLog(log);

          const from = parsed.args.from;
          const to = parsed.args.to;
          const value: BigNumber = parsed.args.value;

          // Create unique ID
          const id = `${log.transactionHash}_${log.logIndex}`;

          // Skip if already processed
          if (this.state.transactions.has(id)) {
            continue;
          }

          // Get token metadata
          const tokenContract = new ethers.Contract(log.address, ERC20_ABI, this.provider);
          const [symbol, decimals] = await Promise.all([
            tokenContract.symbol().catch(() => 'UNKNOWN'),
            tokenContract.decimals().catch(() => 18),
          ]);

          // Get block for timestamp
          const block = await this.provider.getBlock(log.blockNumber);
          
          // Get current block for confirmations
          const currentBlock = await this.provider.getBlockNumber();
          const confirmations = currentBlock - log.blockNumber + 1;

          // Create incoming transaction
          const incomingTx: IncomingTransaction = {
            id,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            timestamp: block.timestamp * 1000,
            from,
            to,
            value: ethers.utils.formatUnits(value, decimals),
            valueRaw: value.toString(),
            type: 'erc20',
            tokenAddress: log.address,
            tokenSymbol: symbol,
            tokenDecimals: decimals,
            confirmations,
            isStable: confirmations >= this.config.confirmationsRequired,
            network: this.config.network,
          };

          // Add to state
          this.state.transactions.set(id, incomingTx);

          console.log(`✅ New incoming ${symbol}: ${incomingTx.value} from ${incomingTx.from.slice(0, 6)}...`);
          
          // Emit event
          this.emitter.emitNewTransaction(incomingTx);
        } catch (error) {
          console.error('Error parsing ERC-20 transfer log:', error);
        }
      }
    } catch (error) {
      console.error('Error checking ERC-20 transfers:', error);
    }
  }

  /**
   * Update confirmations for pending transactions
   */
  private async updateConfirmations(): Promise<void> {
    const currentBlock = await this.provider.getBlockNumber();
    let hasUpdates = false;

    for (const [id, tx] of this.state.transactions.entries()) {
      const newConfirmations = currentBlock - tx.blockNumber + 1;
      
      if (newConfirmations !== tx.confirmations) {
        tx.confirmations = newConfirmations;
        
        // Check if became stable
        if (!tx.isStable && newConfirmations >= this.config.confirmationsRequired) {
          tx.isStable = true;
          console.log(`✅ Transaction confirmed: ${tx.txHash.slice(0, 10)}... (${tx.confirmations} confirmations)`);
          this.emitter.emitTransactionConfirmed(tx);
        }
        
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      await this.saveState();
    }
  }

  /**
   * Load state from AsyncStorage
   */
  private async loadState(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(this.storageKey);
      
      if (data) {
        const parsed = JSON.parse(data);
        this.state.lastProcessedBlock = parsed.lastProcessedBlock || 0;
        
        // Restore transactions map
        if (parsed.transactions) {
          this.state.transactions = new Map(
            Object.entries(parsed.transactions).map(([id, tx]) => [id, tx as IncomingTransaction])
          );
        }
        
        console.log(`📂 Loaded state: ${this.state.transactions.size} transactions, last block: ${this.state.lastProcessedBlock}`);
      }
    } catch (error) {
      console.error('Error loading state:', error);
    }
  }

  /**
   * Save state to AsyncStorage
   */
  private async saveState(): Promise<void> {
    try {
      const data = {
        lastProcessedBlock: this.state.lastProcessedBlock,
        transactions: Object.fromEntries(this.state.transactions),
      };
      
      await AsyncStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }

  /**
   * Clear all stored data
   */
  async clearState(): Promise<void> {
    this.state.transactions.clear();
    this.state.lastProcessedBlock = 0;
    await AsyncStorage.removeItem(this.storageKey);
    console.log('🗑️  Cleared monitor state');
  }
}

// ============================================================================
// Singleton Instance Management
// ============================================================================

const monitors = new Map<string, IncomingTransactionMonitor>();

/**
 * Get or create monitor for address
 */
export function getMonitor(config: MonitorConfig): IncomingTransactionMonitor {
  const key = `${config.address}_${config.network}`;
  
  if (!monitors.has(key)) {
    monitors.set(key, new IncomingTransactionMonitor(config));
  }
  
  return monitors.get(key)!;
}

/**
 * Stop and remove monitor
 */
export function removeMonitor(address: string, network: Network): void {
  const key = `${address}_${network}`;
  const monitor = monitors.get(key);
  
  if (monitor) {
    monitor.stop();
    monitors.delete(key);
  }
}

/**
 * Stop all monitors
 */
export function stopAllMonitors(): void {
  for (const monitor of monitors.values()) {
    monitor.stop();
  }
  monitors.clear();
}
