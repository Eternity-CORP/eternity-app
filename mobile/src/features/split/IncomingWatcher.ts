/**
 * Incoming Payment Watcher
 * 
 * Monitors incoming transactions and automatically matches them
 * to split bill participants:
 * - Subscribes to incoming ETH/ERC-20 transfers
 * - Matches by sender address and amount (with tolerance)
 * - Auto-updates participant status to 'paid'
 * - Prevents duplicate matching
 */

import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import type { Network } from '../../config/env';
import { useSplitBills } from './store/splitBillsSlice';
import { amountMatchesWithTolerance } from './utils/paymentRequest';
import type { SplitBill, SplitParticipant } from './types';

// ============================================================================
// Types
// ============================================================================

export interface IncomingTransaction {
  hash: string;
  from: string;
  to: string;
  value: string; // Wei or token amount
  blockNumber: number;
  timestamp: number;
  tokenAddress?: string; // For ERC-20
  matched: boolean;
}

export interface MatchResult {
  billId: string;
  participantId: string;
  transaction: IncomingTransaction;
  amountExpected: string;
  amountReceived: string;
  tolerance: string;
}

export interface WatcherConfig {
  recipientAddress: string;
  network?: Network;
  pollIntervalMs?: number;
  amountToleranceWei?: string;
  onMatch?: (match: MatchResult) => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// Incoming Watcher Class
// ============================================================================

export class IncomingWatcher extends EventEmitter {
  private recipientAddress: string;
  private network: Network;
  private pollIntervalMs: number;
  private amountToleranceWei: string;
  private provider: ethers.providers.JsonRpcProvider | null = null;
  private isRunning = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private lastCheckedBlock = 0;
  private processedTxHashes = new Set<string>();

  constructor(config: WatcherConfig) {
    super();
    
    this.recipientAddress = ethers.utils.getAddress(config.recipientAddress);
    this.network = config.network || 'sepolia';
    this.pollIntervalMs = config.pollIntervalMs || 15000; // 15 seconds
    this.amountToleranceWei = config.amountToleranceWei || '1000'; // 1000 wei tolerance
    
    if (config.onMatch) {
      this.on('match', config.onMatch);
    }
    
    if (config.onError) {
      this.on('error', config.onError);
    }
  }

  /**
   * Start watching for incoming transactions
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️  IncomingWatcher already running');
      return;
    }

    console.log('👁️  Starting IncomingWatcher...');
    console.log(`   Recipient: ${this.recipientAddress}`);
    console.log(`   Network: ${this.network}`);
    console.log(`   Poll Interval: ${this.pollIntervalMs}ms`);

    // Initialize provider
    this.provider = this.getProvider();

    // Get current block
    try {
      this.lastCheckedBlock = await this.provider.getBlockNumber();
      console.log(`   Starting from block: ${this.lastCheckedBlock}`);
    } catch (error) {
      console.error('Failed to get current block:', error);
      this.emit('error', error);
      return;
    }

    this.isRunning = true;

    // Start polling
    this.poll();
  }

  /**
   * Stop watching
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping IncomingWatcher...');

    this.isRunning = false;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    this.provider = null;
  }

  /**
   * Poll for new transactions
   */
  private async poll(): Promise<void> {
    if (!this.isRunning || !this.provider) {
      return;
    }

    try {
      await this.checkForIncoming();
    } catch (error: any) {
      console.error('Error checking for incoming:', error);
      this.emit('error', error);
    }

    // Schedule next poll
    if (this.isRunning) {
      this.pollTimer = setTimeout(() => this.poll(), this.pollIntervalMs);
    }
  }

  /**
   * Check for incoming transactions
   */
  private async checkForIncoming(): Promise<void> {
    if (!this.provider) return;

    const currentBlock = await this.provider.getBlockNumber();

    if (currentBlock <= this.lastCheckedBlock) {
      // No new blocks
      return;
    }

    console.log(`\n🔍 Checking blocks ${this.lastCheckedBlock + 1} to ${currentBlock}...`);

    // Check ETH transfers
    await this.checkEthTransfers(this.lastCheckedBlock + 1, currentBlock);

    // TODO: Check ERC-20 transfers (requires event logs)

    this.lastCheckedBlock = currentBlock;
  }

  /**
   * Check for incoming ETH transfers
   */
  private async checkEthTransfers(
    fromBlock: number,
    toBlock: number
  ): Promise<void> {
    if (!this.provider) return;

    // Get blocks and check transactions
    // Note: This is a simplified approach. In production, use event logs or indexer.
    const transactions: ethers.providers.TransactionResponse[] = [];
    
    for (let blockNum = fromBlock; blockNum <= toBlock; blockNum++) {
      try {
        const block = await this.provider.getBlockWithTransactions(blockNum);
        
        // Filter transactions to our address
        const incoming = block.transactions.filter(
          (tx) => tx.to?.toLowerCase() === this.recipientAddress.toLowerCase()
        );
        
        transactions.push(...incoming);
      } catch (error) {
        console.error(`Error fetching block ${blockNum}:`, error);
      }
    }

    for (const tx of transactions) {
      // Skip if already processed
      if (this.processedTxHashes.has(tx.hash)) {
        continue;
      }

      // Skip if not incoming
      if (tx.to?.toLowerCase() !== this.recipientAddress.toLowerCase()) {
        continue;
      }

      // Skip if zero value
      if (tx.value.isZero()) {
        continue;
      }

      console.log(`\n📥 Incoming ETH transaction:`);
      console.log(`   Hash: ${tx.hash}`);
      console.log(`   From: ${tx.from}`);
      console.log(`   Value: ${ethers.utils.formatEther(tx.value)} ETH`);
      console.log(`   Block: ${tx.blockNumber}`);

      // Create incoming transaction object
      const incoming: IncomingTransaction = {
        hash: tx.hash,
        from: tx.from || '',
        to: tx.to || '',
        value: tx.value.toString(),
        blockNumber: tx.blockNumber || 0,
        timestamp: Date.now(),
        matched: false,
      };

      // Try to match with pending participants
      await this.tryMatchTransaction(incoming);

      // Mark as processed
      this.processedTxHashes.add(tx.hash);
    }
  }

  /**
   * Try to match transaction with pending participants
   */
  private async tryMatchTransaction(
    tx: IncomingTransaction
  ): Promise<void> {
    const bills = useSplitBills.getState().getAllBills();

    for (const bill of bills) {
      // Skip if not ETH (for now)
      if (bill.asset.type !== 'ETH') {
        continue;
      }

      // Skip if wrong chain
      if (bill.chainId !== this.getChainId()) {
        continue;
      }

      // Find matching participant
      const participant = bill.participants.find((p) => {
        // Must be pending
        if (p.payStatus !== 'pending') {
          return false;
        }

        // Check address match (case-insensitive)
        if (p.address.toLowerCase() !== tx.from.toLowerCase()) {
          return false;
        }

        // Check amount match (with tolerance)
        return amountMatchesWithTolerance(
          tx.value,
          p.amountSmallestUnit || '0',
          this.amountToleranceWei
        );
      });

      if (participant) {
        console.log(`\n✅ Match found!`);
        console.log(`   Bill: ${bill.id}`);
        console.log(`   Participant: ${participant.address}`);
        console.log(`   Expected: ${ethers.utils.formatEther(participant.amountSmallestUnit || '0')} ETH`);
        console.log(`   Received: ${ethers.utils.formatEther(tx.value)} ETH`);

        // Update participant status
        useSplitBills.getState().updateParticipantStatus({
          billId: bill.id,
          participantId: participant.id,
          payStatus: 'paid',
          txHash: tx.hash,
        });

        // Mark transaction as matched
        tx.matched = true;

        // Emit match event
        const match: MatchResult = {
          billId: bill.id,
          participantId: participant.id,
          transaction: tx,
          amountExpected: participant.amountSmallestUnit || '0',
          amountReceived: tx.value,
          tolerance: this.amountToleranceWei,
        };

        this.emit('match', match);

        // Only match once per transaction
        break;
      }
    }

    if (!tx.matched) {
      console.log(`   ⚠️  No matching participant found`);
    }
  }

  /**
   * Get provider for network
   */
  private getProvider(): ethers.providers.JsonRpcProvider {
    const rpcUrls: Record<Network, string> = {
      mainnet: process.env.MAINNET_RPC_URL || 'https://eth.llamarpc.com',
      sepolia: process.env.SEPOLIA_RPC_URL || 'https://rpc.sepolia.org',
      holesky: process.env.HOLESKY_RPC_URL || 'https://ethereum-holesky.publicnode.com',
    };

    const rpcUrl = rpcUrls[this.network];
    return new ethers.providers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Get chain ID for network
   */
  private getChainId(): number {
    const chainIds: Record<Network, number> = {
      mainnet: 1,
      sepolia: 11155111,
      holesky: 17000,
    };

    return chainIds[this.network];
  }

  /**
   * Manually mark participant as paid
   */
  static markAsPaid(
    billId: string,
    participantId: string,
    txHash?: string
  ): void {
    console.log(`\n✋ Manual mark as paid:`);
    console.log(`   Bill: ${billId}`);
    console.log(`   Participant: ${participantId}`);
    if (txHash) {
      console.log(`   TX Hash: ${txHash}`);
    }

    useSplitBills.getState().updateParticipantStatus({
      billId,
      participantId,
      payStatus: 'paid',
      txHash,
    });
  }

  /**
   * Get watcher status
   */
  getStatus(): {
    isRunning: boolean;
    recipientAddress: string;
    network: Network;
    lastCheckedBlock: number;
    processedCount: number;
  } {
    return {
      isRunning: this.isRunning,
      recipientAddress: this.recipientAddress,
      network: this.network,
      lastCheckedBlock: this.lastCheckedBlock,
      processedCount: this.processedTxHashes.size,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let globalWatcher: IncomingWatcher | null = null;

/**
 * Get or create global watcher instance
 */
export function getIncomingWatcher(
  config?: WatcherConfig
): IncomingWatcher {
  if (!globalWatcher && config) {
    globalWatcher = new IncomingWatcher(config);
  }

  if (!globalWatcher) {
    throw new Error('IncomingWatcher not initialized. Provide config on first call.');
  }

  return globalWatcher;
}

/**
 * Start global watcher
 */
export async function startIncomingWatcher(
  config: WatcherConfig
): Promise<IncomingWatcher> {
  const watcher = getIncomingWatcher(config);
  await watcher.start();
  return watcher;
}

/**
 * Stop global watcher
 */
export function stopIncomingWatcher(): void {
  if (globalWatcher) {
    globalWatcher.stop();
  }
}
