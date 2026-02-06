import { Injectable, Logger } from '@nestjs/common';
import {
  AIToolHandler,
  ToolDefinition,
  ToolParams,
  ToolResult,
} from './tool.interface';
import { BalanceServiceAi } from '../services';

interface BalanceParams extends ToolParams {
  token?: string;
}

@Injectable()
export class BalanceTool implements AIToolHandler {
  readonly name = 'get_balance';
  private readonly logger = new Logger(BalanceTool.name);

  constructor(private readonly balanceService: BalanceServiceAi) {}

  readonly definition: ToolDefinition = {
    name: 'get_balance',
    description:
      'Get token balances for the user wallet. Returns all tokens if no specific token is requested.',
    parameters: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description:
            'Optional token symbol to get balance for (e.g., "USDC", "ETH"). If not provided, returns all token balances.',
        },
      },
      required: [],
    },
  };

  async execute(params: BalanceParams): Promise<ToolResult> {
    const { userAddress, token } = params;

    if (!userAddress) {
      return {
        success: false,
        error: 'User address is required',
      };
    }

    this.logger.debug(`Getting balance for ${userAddress}, token: ${token}`);

    try {
      const result = await this.balanceService.getBalances(userAddress, token);

      if (token && result.balances.length === 0) {
        return {
          success: true,
          data: {
            message: `No ${token} balance found`,
            balances: [],
            totalUsd: '0.00',
          },
        };
      }

      return {
        success: true,
        data: {
          balances: result.balances,
          totalUsd: result.totalUsd,
          ethPrice: result.ethPrice,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get balance', error);
      return {
        success: false,
        error: 'Failed to fetch balance from blockchain',
      };
    }
  }
}
