import { Injectable, Logger } from '@nestjs/common';
import { SchemaType } from '@google/generative-ai';
import {
  AIToolHandler,
  ToolDefinition,
  ToolParams,
  ToolResult,
} from './tool.interface';

interface BalanceParams extends ToolParams {
  token?: string;
}

interface TokenBalance {
  symbol: string;
  name: string;
  balance: string;
  balanceUsd: string;
  price: number;
}

@Injectable()
export class BalanceTool implements AIToolHandler {
  readonly name = 'get_balance';
  private readonly logger = new Logger(BalanceTool.name);

  readonly definition: ToolDefinition = {
    name: 'get_balance',
    description:
      'Get token balances for the user wallet. Returns all tokens if no specific token is requested.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        token: {
          type: SchemaType.STRING,
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
      // TODO: Integrate with Alchemy or mobile app data
      // For now, return simulated balances
      const allBalances: TokenBalance[] = [
        {
          symbol: 'USDC',
          name: 'USD Coin',
          balance: '500.00',
          balanceUsd: '500.00',
          price: 1.0,
        },
        {
          symbol: 'ETH',
          name: 'Ethereum',
          balance: '0.25',
          balanceUsd: '625.00',
          price: 2500.0,
        },
        {
          symbol: 'MATIC',
          name: 'Polygon',
          balance: '150.00',
          balanceUsd: '135.00',
          price: 0.9,
        },
      ];

      if (token) {
        const tokenBalance = allBalances.find(
          (b) => b.symbol.toLowerCase() === token.toLowerCase(),
        );

        if (!tokenBalance) {
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
            balances: [tokenBalance],
            totalUsd: tokenBalance.balanceUsd,
          },
        };
      }

      const totalUsd = allBalances
        .reduce((sum, b) => sum + parseFloat(b.balanceUsd), 0)
        .toFixed(2);

      return {
        success: true,
        data: {
          balances: allBalances,
          totalUsd,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get balance', error);
      return {
        success: false,
        error: 'Failed to fetch balance',
      };
    }
  }
}
