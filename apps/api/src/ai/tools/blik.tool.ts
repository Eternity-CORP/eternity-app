import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIToolHandler,
  ToolDefinition,
  ToolParams,
  ToolResult,
} from './tool.interface';
import { BlikService } from '../../blik/blik.service';

interface BlikGenerateParams extends ToolParams {
  amount: string;
  token: string;
}

interface BlikLookupParams extends ToolParams {
  code: string;
}

interface BlikGeneratePreview {
  type: 'generate';
  id: string;
  code: string;
  amount: string;
  token: string;
  amountUsd: string;
  expiresAt: number; // Unix timestamp
  status: 'pending';
}

interface BlikPayPreview {
  type: 'pay';
  id: string;
  code: string;
  receiverAddress: string;
  receiverUsername?: string;
  amount: string;
  token: string;
  amountUsd: string;
  estimatedGas: string;
  estimatedGasUsd: string;
  network: string;
  status: 'pending_confirmation';
}

@Injectable()
export class BlikGenerateTool implements AIToolHandler {
  readonly name = 'blik_generate';
  private readonly logger = new Logger(BlikGenerateTool.name);
  private readonly network: string;

  constructor(
    private readonly blikService: BlikService,
    private readonly configService: ConfigService,
  ) {
    this.network = this.configService.get<string>('NETWORK') || 'sepolia';
  }

  readonly definition: ToolDefinition = {
    name: 'blik_generate',
    description:
      'Generate a BLIK code to receive payment. The user wants to receive money - they will share this code with someone who will pay them.',
    parameters: {
      type: 'object',
      properties: {
        amount: {
          type: 'string',
          description: 'Amount to receive (e.g., "50", "100.5")',
        },
        token: {
          type: 'string',
          description: 'Token symbol to receive (e.g., "USDC", "ETH")',
        },
      },
      required: ['amount', 'token'],
    },
  };

  async execute(params: BlikGenerateParams): Promise<ToolResult> {
    const { userAddress, amount, token } = params;

    if (!userAddress) {
      return {
        success: false,
        error: 'User address is required',
      };
    }

    if (!amount || !token) {
      return {
        success: false,
        error: 'Amount and token are required',
      };
    }

    this.logger.debug(`Generating BLIK code: ${amount} ${token} for ${userAddress}`);

    try {
      // Validate amount
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return {
          success: false,
          error: 'Invalid amount',
        };
      }

      // Create BLIK code via service
      // Note: We use 'ai' as socketId since this is from AI chat
      const blikCode = await this.blikService.createCode(
        userAddress,
        undefined, // username resolved by frontend
        amount,
        token.toUpperCase(),
        'ai', // Socket ID placeholder for AI-generated codes
      );

      // Get token price for USD conversion
      const tokenPrices: Record<string, number> = {
        USDC: 1.0,
        ETH: 2500.0,
        MATIC: 0.9,
      };

      const price = tokenPrices[token.toUpperCase()] || 1.0;
      const amountUsd = (numericAmount * price).toFixed(2);

      const preview: BlikGeneratePreview = {
        type: 'generate',
        id: `blik_gen_${Date.now()}`,
        code: blikCode.code,
        amount: amount,
        token: token.toUpperCase(),
        amountUsd,
        expiresAt: new Date(blikCode.expiresAt).getTime(),
        status: 'pending',
      };

      return {
        success: true,
        data: {
          preview,
          message: `BLIK code generated: ${blikCode.code}. Share this code with the sender. They have 2 minutes to pay you ${amount} ${token.toUpperCase()} (~$${amountUsd}).`,
          pendingBlik: preview,
        },
      };
    } catch (error) {
      this.logger.error('Failed to generate BLIK code', error);

      if ((error as Error).message?.includes('BLIK_RATE_LIMIT')) {
        return {
          success: false,
          error: 'You have too many active BLIK codes. Please wait for them to expire or cancel them first.',
        };
      }

      return {
        success: false,
        error: 'Failed to generate BLIK code',
      };
    }
  }
}

@Injectable()
export class BlikLookupTool implements AIToolHandler {
  readonly name = 'blik_lookup';
  private readonly logger = new Logger(BlikLookupTool.name);
  private readonly network: string;

  constructor(
    private readonly blikService: BlikService,
    private readonly configService: ConfigService,
  ) {
    this.network = this.configService.get<string>('NETWORK') || 'sepolia';
  }

  readonly definition: ToolDefinition = {
    name: 'blik_lookup',
    description:
      'Look up a BLIK code to pay someone. The user wants to send money - they enter a code they received from the recipient.',
    parameters: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The 6-digit BLIK code received from the recipient',
        },
      },
      required: ['code'],
    },
  };

  async execute(params: BlikLookupParams): Promise<ToolResult> {
    const { userAddress, code } = params;

    if (!userAddress) {
      return {
        success: false,
        error: 'User address is required',
      };
    }

    if (!code) {
      return {
        success: false,
        error: 'BLIK code is required',
      };
    }

    // Normalize code - remove spaces
    const normalizedCode = code.replace(/\s/g, '');

    if (!/^\d{6}$/.test(normalizedCode)) {
      return {
        success: false,
        error: 'Invalid BLIK code format. Please enter a 6-digit code.',
      };
    }

    this.logger.debug(`Looking up BLIK code: ${normalizedCode} for ${userAddress}`);

    try {
      // Look up the code
      const blikCode = await this.blikService.lookupCode(normalizedCode);

      if (!blikCode) {
        return {
          success: false,
          error: 'BLIK code not found or expired. Please check the code and try again.',
        };
      }

      // Check if user is trying to pay themselves
      if (blikCode.receiverAddress.toLowerCase() === userAddress.toLowerCase()) {
        return {
          success: false,
          error: "You can't pay your own BLIK code.",
        };
      }

      // Get token price for USD conversion
      const tokenPrices: Record<string, number> = {
        USDC: 1.0,
        ETH: 2500.0,
        MATIC: 0.9,
      };

      const numericAmount = parseFloat(blikCode.amount);
      const price = tokenPrices[blikCode.tokenSymbol.toUpperCase()] || 1.0;
      const amountUsd = (numericAmount * price).toFixed(2);

      // Estimate gas
      const estimatedGas = '0.001';
      const estimatedGasUsd = '2.50';

      const preview: BlikPayPreview = {
        type: 'pay',
        id: `blik_pay_${Date.now()}`,
        code: normalizedCode,
        receiverAddress: blikCode.receiverAddress,
        receiverUsername: blikCode.receiverUsername,
        amount: blikCode.amount,
        token: blikCode.tokenSymbol,
        amountUsd,
        estimatedGas,
        estimatedGasUsd,
        network: this.network,
        status: 'pending_confirmation',
      };

      // Mark as pending (someone is viewing it)
      await this.blikService.markPending(normalizedCode);

      return {
        success: true,
        data: {
          preview,
          message: `Found BLIK request from ${blikCode.receiverUsername ? '@' + blikCode.receiverUsername : blikCode.receiverAddress.slice(0, 6) + '...' + blikCode.receiverAddress.slice(-4)} for ${blikCode.amount} ${blikCode.tokenSymbol} (~$${amountUsd}). Gas: ~$${estimatedGasUsd}. Please confirm payment.`,
          requiresConfirmation: true,
          pendingBlik: preview,
        },
      };
    } catch (error) {
      this.logger.error('Failed to lookup BLIK code', error);
      return {
        success: false,
        error: 'Failed to lookup BLIK code',
      };
    }
  }
}
