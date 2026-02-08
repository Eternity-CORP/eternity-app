import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIToolHandler,
  ToolDefinition,
  ToolParams,
  ToolResult,
} from './tool.interface';
import { fetchTokenPricesBySymbol } from '@e-y/shared';

interface SwapParams extends ToolParams {
  fromToken: string;
  toToken: string;
  amount: string;
}

interface SwapPreview {
  id: string;
  fromToken: {
    symbol: string;
    amount: string;
    amountUsd: string;
  };
  toToken: {
    symbol: string;
    amount: string;
    amountUsd: string;
  };
  rate: string;
  priceImpact: string;
  estimatedGas: string;
  estimatedGasUsd: string;
  slippage: string;
  network: string;
  requiresApproval: boolean;
  status: 'pending_confirmation';
}

@Injectable()
export class SwapTool implements AIToolHandler {
  readonly name = 'prepare_swap';
  private readonly logger = new Logger(SwapTool.name);
  private readonly network: string;

  constructor(private readonly configService: ConfigService) {
    this.network = this.configService.get<string>('NETWORK') || 'sepolia';
  }

  readonly definition: ToolDefinition = {
    name: 'prepare_swap',
    description:
      'Prepare a token swap. Returns a preview that the user must confirm. The swap will be executed on-chain via DEX aggregator.',
    parameters: {
      type: 'object',
      properties: {
        fromToken: {
          type: 'string',
          description: 'Token symbol to swap from (e.g., "ETH", "USDC")',
        },
        toToken: {
          type: 'string',
          description: 'Token symbol to swap to (e.g., "USDC", "ETH")',
        },
        amount: {
          type: 'string',
          description: 'Amount of fromToken to swap (e.g., "0.5", "100")',
        },
      },
      required: ['fromToken', 'toToken', 'amount'],
    },
  };

  async execute(params: SwapParams): Promise<ToolResult> {
    const { userAddress, fromToken, toToken, amount } = params;

    if (!userAddress) {
      return {
        success: false,
        error: 'User address is required',
      };
    }

    if (!fromToken || !toToken || !amount) {
      return {
        success: false,
        error: 'From token, to token, and amount are required',
      };
    }

    // Normalize tokens
    const from = fromToken.toUpperCase();
    const to = toToken.toUpperCase();

    if (from === to) {
      return {
        success: false,
        error: "Can't swap a token for itself",
      };
    }

    this.logger.debug(`Preparing swap: ${amount} ${from} -> ${to} for ${userAddress}`);

    try {
      // Validate amount
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return {
          success: false,
          error: 'Invalid amount',
        };
      }

      // Get live token prices from CoinGecko
      const tokenPrices = await fetchTokenPricesBySymbol([from, to]);

      const fromPrice = tokenPrices[from];
      const toPrice = tokenPrices[to];

      if (!fromPrice) {
        return {
          success: false,
          error: `Token ${from} not supported for swap`,
        };
      }

      if (!toPrice) {
        return {
          success: false,
          error: `Token ${to} not supported for swap`,
        };
      }

      // Calculate swap output (simplified, without slippage)
      const fromValueUsd = numericAmount * fromPrice;
      const toAmount = fromValueUsd / toPrice;

      // Apply small slippage for estimate
      const slippagePercent = 0.5;
      const toAmountWithSlippage = toAmount * (1 - slippagePercent / 100);

      // Calculate rate
      const rate = `1 ${from} = ${(fromPrice / toPrice).toFixed(6)} ${to}`;

      // Price impact (simplified)
      const priceImpact = numericAmount > 1000 ? '0.15%' : '0.05%';

      // Gas estimate
      const estimatedGas = '~0.003';
      const estimatedGasUsd = '(estimate)';

      // Check if approval is needed (not needed for ETH)
      const requiresApproval = from !== 'ETH';

      const preview: SwapPreview = {
        id: `swap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        fromToken: {
          symbol: from,
          amount: amount,
          amountUsd: fromValueUsd.toFixed(2),
        },
        toToken: {
          symbol: to,
          amount: toAmountWithSlippage.toFixed(6),
          amountUsd: (toAmountWithSlippage * toPrice).toFixed(2),
        },
        rate,
        priceImpact,
        estimatedGas,
        estimatedGasUsd,
        slippage: `${slippagePercent}%`,
        network: this.network,
        requiresApproval,
        status: 'pending_confirmation',
      };

      return {
        success: true,
        data: {
          preview,
          message: `Ready to swap ${amount} ${from} (~$${fromValueUsd.toFixed(2)}) for ~${toAmountWithSlippage.toFixed(6)} ${to} (~$${(toAmountWithSlippage * toPrice).toFixed(2)}). Rate: ${rate}. Gas: ~$${estimatedGasUsd}. ${requiresApproval ? 'Token approval required before swap. ' : ''}Please confirm.`,
          requiresConfirmation: true,
          pendingSwap: preview,
        },
      };
    } catch (error) {
      this.logger.error('Failed to prepare swap', error);
      return {
        success: false,
        error: 'Failed to prepare swap',
      };
    }
  }
}
