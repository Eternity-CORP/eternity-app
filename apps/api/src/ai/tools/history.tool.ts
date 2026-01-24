import { Injectable, Logger } from '@nestjs/common';
import { SchemaType } from '@google/generative-ai';
import {
  AIToolHandler,
  ToolDefinition,
  ToolParams,
  ToolResult,
} from './tool.interface';
import { HistoryServiceAi } from '../services';

interface HistoryParams extends ToolParams {
  limit?: number;
  type?: 'all' | 'sent' | 'received';
}

@Injectable()
export class HistoryTool implements AIToolHandler {
  readonly name = 'get_history';
  private readonly logger = new Logger(HistoryTool.name);

  constructor(private readonly historyService: HistoryServiceAi) {}

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
      const result = await this.historyService.getHistory(userAddress, limit, type);

      if (result.transactions.length === 0) {
        return {
          success: true,
          data: {
            transactions: [],
            total: 0,
            hasMore: false,
            message: 'No transactions found',
          },
        };
      }

      return {
        success: true,
        data: {
          transactions: result.transactions,
          total: result.total,
          hasMore: result.hasMore,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get history', error);
      return {
        success: false,
        error: 'Failed to fetch transaction history from blockchain',
      };
    }
  }
}
