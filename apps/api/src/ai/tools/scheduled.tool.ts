import { Injectable, Logger } from '@nestjs/common';
import { fetchTokenPricesBySymbol } from '@e-y/shared';
import { ScheduledService } from '../../scheduled/scheduled.service';
import { UsernameService } from '../../username/username.service';
import {
  AIToolHandler,
  ToolDefinition,
  ToolParams,
  ToolResult,
} from './tool.interface';

interface ScheduledPayment {
  id: string;
  recipient: string;
  recipientUsername?: string;
  amount: string;
  token: string;
  amountUsd: string;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  nextExecutionAt: string;
  status: 'active' | 'paused' | 'completed';
}

@Injectable()
export class ScheduledTool implements AIToolHandler {
  readonly name = 'get_scheduled';
  private readonly logger = new Logger(ScheduledTool.name);

  constructor(private readonly scheduledService: ScheduledService) {}

  readonly definition: ToolDefinition = {
    name: 'get_scheduled',
    description:
      'Get scheduled/recurring payments for the user. Shows upcoming and active scheduled transactions.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  };

  async execute(params: ToolParams): Promise<ToolResult> {
    const { userAddress } = params;

    if (!userAddress) {
      return {
        success: false,
        error: 'User address is required',
      };
    }

    this.logger.debug(`Getting scheduled payments for ${userAddress}`);

    try {
      // Try to get real scheduled payments
      const realPayments =
        await this.scheduledService.findByCreator(userAddress);

      if (realPayments && realPayments.length > 0) {
        // Fetch prices for all unique token symbols
        const uniqueSymbols = [...new Set(realPayments.map((p) => p.tokenSymbol.toUpperCase()))];
        const prices = await fetchTokenPricesBySymbol(uniqueSymbols);

        const formattedPayments: ScheduledPayment[] = realPayments.map((p) => {
          const price = prices[p.tokenSymbol.toUpperCase()] || 0;
          const numericAmount = parseFloat(p.amount);
          const usd = price > 0 && !isNaN(numericAmount)
            ? (numericAmount * price).toFixed(2)
            : '—';
          return {
            id: p.id,
            recipient: p.recipient,
            recipientUsername: p.recipientUsername || undefined,
            amount: p.amount,
            token: p.tokenSymbol,
            amountUsd: usd,
            frequency: (p.recurringInterval || 'once') as
              | 'once'
              | 'daily'
              | 'weekly'
              | 'monthly',
            nextExecutionAt: p.scheduledAt.toISOString(),
            status:
              p.status === 'pending'
                ? 'active'
                : (p.status as 'active' | 'paused' | 'completed'),
          };
        });

        return {
          success: true,
          data: {
            payments: formattedPayments,
            total: formattedPayments.length,
          },
        };
      }

      // Return empty if no scheduled payments
      return {
        success: true,
        data: {
          payments: [],
          total: 0,
          message: 'No scheduled payments found',
        },
      };
    } catch (error) {
      this.logger.error('Failed to get scheduled payments', error);
      return {
        success: false,
        error: `Failed to fetch scheduled payments: ${(error as Error).message}`,
      };
    }
  }
}

// ============================================
// Create Scheduled Payment Tool
// ============================================

interface CreateScheduledParams extends ToolParams {
  recipient: string;
  amount: string;
  token: string;
  scheduledAt: string;
  recurringInterval?: 'once' | 'daily' | 'weekly' | 'monthly';
  description?: string;
}

@Injectable()
export class CreateScheduledTool implements AIToolHandler {
  readonly name = 'create_scheduled';
  private readonly logger = new Logger(CreateScheduledTool.name);

  constructor(
    private readonly scheduledService: ScheduledService,
    private readonly usernameService: UsernameService,
  ) {}

  readonly definition: ToolDefinition = {
    name: 'create_scheduled',
    description:
      'Create a new scheduled or recurring payment. The payment will be executed at the specified time.',
    parameters: {
      type: 'object',
      properties: {
        recipient: {
          type: 'string',
          description: 'Recipient address (0x...) or username (@username)',
        },
        amount: {
          type: 'string',
          description: 'Amount to send (e.g., "0.01", "100")',
        },
        token: {
          type: 'string',
          description: 'Token symbol (e.g., "ETH", "USDC")',
        },
        scheduledAt: {
          type: 'string',
          description: 'ISO 8601 date-time for when to execute (e.g., "2025-06-01T10:00:00Z")',
        },
        recurringInterval: {
          type: 'string',
          description: 'How often to repeat: "once" (default), "daily", "weekly", "monthly"',
        },
        description: {
          type: 'string',
          description: 'Optional description or memo',
        },
      },
      required: ['recipient', 'amount', 'token', 'scheduledAt'],
    },
  };

  async execute(params: CreateScheduledParams): Promise<ToolResult> {
    const { userAddress, recipient, amount, token, scheduledAt, recurringInterval, description } = params;

    if (!userAddress) {
      return { success: false, error: 'User address is required' };
    }
    if (!recipient || !amount || !token || !scheduledAt) {
      return { success: false, error: 'Recipient, amount, token, and scheduledAt are required' };
    }

    this.logger.debug(`Creating scheduled payment: ${amount} ${token} to ${recipient} at ${scheduledAt}`);

    try {
      // Resolve recipient (username or address)
      let resolvedAddress = recipient;
      let recipientUsername: string | undefined;
      const isEthAddress = /^0x[a-fA-F0-9]{40}$/.test(recipient);

      if (!isEthAddress) {
        // Strip @ prefix if present, then resolve via UsernameService
        recipientUsername = recipient.startsWith('@') ? recipient.slice(1) : recipient;
        const record = await this.usernameService.lookup(recipientUsername);
        if (!record) {
          return { success: false, error: `Username @${recipientUsername} not found` };
        }
        resolvedAddress = record.address;
      }

      // Validate scheduled time
      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        return { success: false, error: `Invalid date format: "${scheduledAt}". Use ISO 8601 format (e.g., "2025-06-01T10:00:00Z")` };
      }
      if (scheduledDate.getTime() <= Date.now()) {
        return { success: false, error: 'Scheduled time must be in the future' };
      }

      const interval = recurringInterval === 'once' ? undefined : recurringInterval;
      const recurring = interval || 'once';

      // Return preview for frontend confirmation — don't create yet
      return {
        success: true,
        data: {
          requiresConfirmation: true,
          pendingScheduled: {
            recipient: resolvedAddress,
            recipientUsername,
            amount,
            token: token.toUpperCase(),
            scheduledAt: scheduledDate.toISOString(),
            recurring,
            description,
            status: 'pending_confirmation' as const,
          },
          message: `Ready to schedule ${amount} ${token.toUpperCase()} to ${recipientUsername ? '@' + recipientUsername : resolvedAddress} at ${scheduledDate.toLocaleString()}.${interval ? ` Repeats ${interval}.` : ''} Please confirm.`,
        },
      };
    } catch (error) {
      this.logger.error('Failed to create scheduled payment', error);
      return {
        success: false,
        error: `Failed to create scheduled payment: ${(error as Error).message}`,
      };
    }
  }
}

// ============================================
// Cancel Scheduled Payment Tool
// ============================================

@Injectable()
export class CancelScheduledTool implements AIToolHandler {
  readonly name = 'cancel_scheduled';
  private readonly logger = new Logger(CancelScheduledTool.name);

  constructor(private readonly scheduledService: ScheduledService) {}

  readonly definition: ToolDefinition = {
    name: 'cancel_scheduled',
    description:
      'Cancel a scheduled payment by its ID. Only the creator can cancel.',
    parameters: {
      type: 'object',
      properties: {
        paymentId: {
          type: 'string',
          description: 'The ID of the scheduled payment to cancel',
        },
      },
      required: ['paymentId'],
    },
  };

  async execute(params: ToolParams & { paymentId: string }): Promise<ToolResult> {
    const { userAddress, paymentId } = params;

    if (!userAddress) {
      return { success: false, error: 'User address is required' };
    }
    if (!paymentId) {
      return { success: false, error: 'Payment ID is required' };
    }

    this.logger.debug(`Cancelling scheduled payment ${paymentId} for ${userAddress}`);

    try {
      const cancelled = await this.scheduledService.cancel(paymentId, userAddress);

      return {
        success: true,
        data: {
          id: cancelled.id,
          status: 'cancelled',
          message: `Scheduled payment ${cancelled.id} has been cancelled.`,
        },
      };
    } catch (error) {
      this.logger.error('Failed to cancel scheduled payment', error);
      return {
        success: false,
        error: `Failed to cancel: ${(error as Error).message}`,
      };
    }
  }
}
