import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AIToolHandler,
  ToolDefinition,
  ToolParams,
  ToolResult,
} from './tool.interface';
import { UsernameService } from '../../username/username.service';

interface SendParams extends ToolParams {
  recipient: string;
  amount: string;
  token: string;
}

interface TransactionPreview {
  id: string;
  from: string;
  to: string;
  toUsername?: string;
  amount: string;
  token: string;
  amountUsd: string;
  estimatedGas: string;
  estimatedGasUsd: string;
  network: string;
  status: 'pending_confirmation';
}

@Injectable()
export class SendTool implements AIToolHandler {
  readonly name = 'prepare_send';
  private readonly logger = new Logger(SendTool.name);
  private readonly network: string;

  constructor(
    private readonly usernameService: UsernameService,
    private readonly configService: ConfigService,
  ) {
    this.network = this.configService.get<string>('NETWORK') || 'sepolia';
  }

  readonly definition: ToolDefinition = {
    name: 'prepare_send',
    description:
      'Prepare a transaction to send tokens to a recipient. Returns a preview that the user must confirm. Does NOT execute the transaction.',
    parameters: {
      type: 'object',
      properties: {
        recipient: {
          type: 'string',
          description:
            'Recipient address or username (e.g., "0x123..." or "@username")',
        },
        amount: {
          type: 'string',
          description: 'Amount to send (e.g., "50", "100.5")',
        },
        token: {
          type: 'string',
          description: 'Token symbol to send (e.g., "USDC", "ETH")',
        },
      },
      required: ['recipient', 'amount', 'token'],
    },
  };

  async execute(params: SendParams): Promise<ToolResult> {
    const { userAddress, recipient, amount, token } = params;

    if (!userAddress) {
      return {
        success: false,
        error: 'User address is required',
      };
    }

    if (!recipient || !amount || !token) {
      return {
        success: false,
        error: 'Recipient, amount, and token are required',
      };
    }

    this.logger.debug(
      `Preparing send: ${amount} ${token} to ${recipient} from ${userAddress}`,
    );

    try {
      // Validate amount
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return {
          success: false,
          error: 'Invalid amount',
        };
      }

      // Resolve recipient (username or address)
      let resolvedAddress = recipient;
      let recipientUsername: string | undefined;

      if (recipient.startsWith('@')) {
        // Resolve username to address via UsernameService
        recipientUsername = recipient.slice(1);
        const userRecord = await this.usernameService.lookup(recipientUsername);

        if (!userRecord) {
          return {
            success: false,
            error: `Username @${recipientUsername} not found. Please check the spelling.`,
          };
        }

        resolvedAddress = userRecord.address;
        this.logger.debug(`Resolved @${recipientUsername} to ${resolvedAddress}`);
      }

      // Get token price for USD conversion
      const tokenPrices: Record<string, number> = {
        USDC: 1.0,
        ETH: 2500.0,
        MATIC: 0.9,
      };

      const price = tokenPrices[token.toUpperCase()] || 1.0;
      const amountUsd = (numericAmount * price).toFixed(2);

      // Estimate gas (simplified)
      const estimatedGas = '0.001';
      const estimatedGasUsd = '2.50';

      // Generate preview ID
      const previewId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const preview: TransactionPreview = {
        id: previewId,
        from: userAddress,
        to: resolvedAddress,
        toUsername: recipientUsername,
        amount: amount,
        token: token.toUpperCase(),
        amountUsd,
        estimatedGas,
        estimatedGasUsd,
        network: this.network,
        status: 'pending_confirmation',
      };

      return {
        success: true,
        data: {
          preview,
          message: `Ready to send ${amount} ${token.toUpperCase()} (~$${amountUsd}) to ${recipientUsername ? '@' + recipientUsername : resolvedAddress}. Gas: ~$${estimatedGasUsd}. Please confirm.`,
          requiresConfirmation: true,
        },
      };
    } catch (error) {
      this.logger.error('Failed to prepare send', error);
      return {
        success: false,
        error: 'Failed to prepare transaction',
      };
    }
  }
}
