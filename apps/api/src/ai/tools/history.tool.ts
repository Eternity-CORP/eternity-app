import { Injectable, Logger } from '@nestjs/common';
import { SchemaType } from '@google/generative-ai';
import {
  AIToolHandler,
  ToolDefinition,
  ToolParams,
  ToolResult,
} from './tool.interface';

interface HistoryParams extends ToolParams {
  limit?: number;
  type?: 'all' | 'sent' | 'received';
}

interface Transaction {
  id: string;
  type: 'sent' | 'received';
  amount: string;
  token: string;
  amountUsd: string;
  counterparty: string;
  counterpartyUsername?: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  network: string;
}

@Injectable()
export class HistoryTool implements AIToolHandler {
  readonly name = 'get_history';
  private readonly logger = new Logger(HistoryTool.name);

  readonly definition: ToolDefinition = {
    name: 'get_history',
    description:
      'Get transaction history for the user wallet. Can filter by type and limit results.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: {
          type: SchemaType.NUMBER,
          description: 'Maximum number of transactions to return (default: 10)',
        },
        type: {
          type: SchemaType.STRING,
          description:
            'Filter by transaction type: "all", "sent", or "received" (default: "all")',
          enum: ['all', 'sent', 'received'],
        },
      },
      required: [],
    },
  };

  async execute(params: HistoryParams): Promise<ToolResult> {
    const { userAddress, limit = 10, type = 'all' } = params;

    if (!userAddress) {
      return {
        success: false,
        error: 'User address is required',
      };
    }

    this.logger.debug(
      `Getting history for ${userAddress}, limit: ${limit}, type: ${type}`,
    );

    try {
      // TODO: Integrate with transaction service or Alchemy
      // For now, return simulated history
      const allTransactions: Transaction[] = [
        {
          id: 'tx_001',
          type: 'sent',
          amount: '50.00',
          token: 'USDC',
          amountUsd: '50.00',
          counterparty: '0x1234...5678',
          counterpartyUsername: 'ivan',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'completed',
          network: 'polygon',
        },
        {
          id: 'tx_002',
          type: 'received',
          amount: '100.00',
          token: 'USDC',
          amountUsd: '100.00',
          counterparty: '0xabcd...efgh',
          counterpartyUsername: 'maria',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          status: 'completed',
          network: 'polygon',
        },
        {
          id: 'tx_003',
          type: 'sent',
          amount: '0.05',
          token: 'ETH',
          amountUsd: '125.00',
          counterparty: '0x9876...5432',
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          status: 'completed',
          network: 'ethereum',
        },
        {
          id: 'tx_004',
          type: 'received',
          amount: '200.00',
          token: 'MATIC',
          amountUsd: '180.00',
          counterparty: '0xfedc...ba98',
          counterpartyUsername: 'alex',
          timestamp: new Date(Date.now() - 172800000).toISOString(),
          status: 'completed',
          network: 'polygon',
        },
      ];

      let filteredTransactions = allTransactions;

      if (type !== 'all') {
        filteredTransactions = allTransactions.filter((tx) => tx.type === type);
      }

      const limitedTransactions = filteredTransactions.slice(0, limit);

      return {
        success: true,
        data: {
          transactions: limitedTransactions,
          total: filteredTransactions.length,
          hasMore: filteredTransactions.length > limit,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get history', error);
      return {
        success: false,
        error: 'Failed to fetch transaction history',
      };
    }
  }
}
