import { Injectable, Logger } from '@nestjs/common';
import { ScheduledService } from '../../scheduled/scheduled.service';
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
        const formattedPayments: ScheduledPayment[] = realPayments.map((p) => ({
          id: p.id,
          recipient: p.recipient,
          recipientUsername: p.recipientUsername || undefined,
          amount: p.amount,
          token: p.tokenSymbol,
          amountUsd: p.amount, // TODO: Calculate USD value
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
        }));

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
        error: 'Failed to fetch scheduled payments',
      };
    }
  }
}
