/**
 * History Service for AI Tools
 * Fetches real transaction history from Alchemy API
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Transaction {
  hash: string;
  type: 'sent' | 'received';
  amount: string;
  token: string;
  amountUsd: string;
  counterparty: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  network: string;
}

export interface HistoryResult {
  transactions: Transaction[];
  total: number;
  hasMore: boolean;
}

interface AlchemyTransfer {
  hash: string;
  from: string;
  to: string;
  value: number | null;
  asset: string;
  category: string;
  blockNum: string;
  metadata: {
    blockTimestamp: string;
  };
}

@Injectable()
export class HistoryServiceAi {
  private readonly logger = new Logger(HistoryServiceAi.name);
  private readonly alchemyApiKey: string;
  private readonly network: string;

  constructor(private readonly configService: ConfigService) {
    this.alchemyApiKey = this.configService.get<string>('ALCHEMY_API_KEY') || '';
    this.network = this.configService.get<string>('NETWORK') || 'sepolia';
  }

  private getAlchemyUrl(): string {
    return `https://eth-${this.network}.g.alchemy.com/v2/${this.alchemyApiKey}`;
  }

  /**
   * Get asset transfers (transactions) for an address
   */
  async getHistory(
    address: string,
    limit: number = 10,
    type: 'all' | 'sent' | 'received' = 'all'
  ): Promise<HistoryResult> {
    if (!this.alchemyApiKey) {
      this.logger.warn('Alchemy API key not configured');
      return { transactions: [], total: 0, hasMore: false };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const transactions: Transaction[] = [];

      // Fetch sent transactions if needed
      if (type === 'all' || type === 'sent') {
        const sentTxs = await this.fetchTransfers(address, 'from', controller.signal);
        transactions.push(...sentTxs.map(tx => this.formatTransaction(tx, 'sent')));
      }

      // Fetch received transactions if needed
      if (type === 'all' || type === 'received') {
        const receivedTxs = await this.fetchTransfers(address, 'to', controller.signal);
        transactions.push(...receivedTxs.map(tx => this.formatTransaction(tx, 'received')));
      }

      clearTimeout(timeoutId);

      // Sort by timestamp descending
      transactions.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Remove duplicates (same hash)
      const uniqueTxs = transactions.filter((tx, index, self) =>
        index === self.findIndex(t => t.hash === tx.hash)
      );

      const limitedTxs = uniqueTxs.slice(0, limit);

      return {
        transactions: limitedTxs,
        total: uniqueTxs.length,
        hasMore: uniqueTxs.length > limit,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      this.logger.error('Failed to fetch transaction history', error);
      throw error;
    }
  }

  private async fetchTransfers(
    address: string,
    direction: 'from' | 'to',
    signal: AbortSignal
  ): Promise<AlchemyTransfer[]> {
    try {
      const params: Record<string, unknown> = {
        category: ['external', 'erc20'],
        withMetadata: true,
        maxCount: '0x14', // 20 in hex
      };

      if (direction === 'from') {
        params.fromAddress = address;
      } else {
        params.toAddress = address;
      }

      const response = await fetch(this.getAlchemyUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getAssetTransfers',
          params: [params],
        }),
        signal,
      });

      if (!response.ok) {
        this.logger.warn('Alchemy API error', { status: response.status });
        return [];
      }

      const data = await response.json();
      return data.result?.transfers || [];
    } catch (error) {
      this.logger.warn(`Failed to fetch ${direction} transfers`, error);
      return [];
    }
  }

  private formatTransaction(
    transfer: AlchemyTransfer,
    type: 'sent' | 'received'
  ): Transaction {
    const counterparty = type === 'sent' ? transfer.to : transfer.from;
    const amount = transfer.value?.toString() || '0';

    return {
      hash: transfer.hash,
      type,
      amount,
      token: transfer.asset || 'ETH',
      amountUsd: '0.00', // Would need price API to calculate
      counterparty: counterparty || 'Unknown',
      timestamp: transfer.metadata?.blockTimestamp || new Date().toISOString(),
      status: 'completed',
      network: this.network,
    };
  }
}
