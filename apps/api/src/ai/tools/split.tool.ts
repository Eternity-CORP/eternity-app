import { Injectable, Logger } from '@nestjs/common';
import { SplitService } from '../../split/split.service';
import { UsernameService } from '../../username/username.service';
import {
  AIToolHandler,
  ToolDefinition,
  ToolParams,
  ToolResult,
} from './tool.interface';

// ============================================
// Create Split Tool
// ============================================

interface CreateSplitParams extends ToolParams {
  totalAmount: string;
  token: string;
  description?: string;
  participants: Array<{ address_or_username: string; name?: string }>;
}

@Injectable()
export class CreateSplitTool implements AIToolHandler {
  readonly name = 'create_split';
  private readonly logger = new Logger(CreateSplitTool.name);

  constructor(
    private readonly splitService: SplitService,
    private readonly usernameService: UsernameService,
  ) {}

  readonly definition: ToolDefinition = {
    name: 'create_split',
    description:
      'Create a split bill between multiple participants. Each participant will owe an equal share unless amounts are specified.',
    parameters: {
      type: 'object',
      properties: {
        totalAmount: {
          type: 'string',
          description: 'Total amount to split (e.g., "0.1", "100")',
        },
        token: {
          type: 'string',
          description: 'Token symbol (e.g., "ETH", "USDC")',
        },
        description: {
          type: 'string',
          description: 'Optional description (e.g., "Dinner split")',
        },
        participants: {
          type: 'array',
          description: 'List of participants. Each has address_or_username (0x address or @username) and optional name.',
          items: {
            type: 'object',
            description: 'Participant object',
            properties: {
              address_or_username: { type: 'string', description: '0x address or @username' },
              name: { type: 'string', description: 'Display name (optional)' },
            },
            required: ['address_or_username'],
          },
        },
      },
      required: ['totalAmount', 'token', 'participants'],
    },
  };

  async execute(params: CreateSplitParams): Promise<ToolResult> {
    const { userAddress, totalAmount, token, description, participants } = params;

    if (!userAddress) {
      return { success: false, error: 'User address is required' };
    }
    if (!totalAmount || !token || !participants || participants.length === 0) {
      return { success: false, error: 'totalAmount, token, and at least one participant are required' };
    }

    this.logger.debug(`Creating split: ${totalAmount} ${token} between ${participants.length} participants`);

    try {
      // Resolve each participant
      const resolvedParticipants: Array<{
        address: string;
        username?: string;
        name?: string;
        amount: string;
      }> = [];

      const numParticipants = participants.length;
      const totalNum = parseFloat(totalAmount);
      if (isNaN(totalNum) || totalNum <= 0) {
        return { success: false, error: 'Invalid total amount' };
      }

      // Equal split
      const perPerson = (totalNum / numParticipants).toFixed(8);

      for (const p of participants) {
        let address = p.address_or_username;
        let username: string | undefined;

        if (address.startsWith('@')) {
          username = address.slice(1);
          const record = await this.usernameService.lookup(username);
          if (!record) {
            return { success: false, error: `Username @${username} not found` };
          }
          address = record.address;
        } else if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
          return { success: false, error: `Invalid address or username: ${address}` };
        }

        resolvedParticipants.push({
          address,
          username,
          name: p.name,
          amount: perPerson,
        });
      }

      // Get creator username
      const creatorProfile = await this.usernameService.lookupByAddress(userAddress);

      const splitBill = await this.splitService.create({
        creatorAddress: userAddress,
        creatorUsername: creatorProfile?.username,
        totalAmount,
        tokenSymbol: token.toUpperCase(),
        description,
        participants: resolvedParticipants,
      });

      return {
        success: true,
        data: {
          id: splitBill.id,
          totalAmount,
          token: token.toUpperCase(),
          description,
          participantCount: resolvedParticipants.length,
          perPerson,
          participants: resolvedParticipants.map((p) => ({
            address: p.address,
            username: p.username ? `@${p.username}` : undefined,
            name: p.name,
            amount: p.amount,
          })),
          message: `Split bill created: ${totalAmount} ${token.toUpperCase()} split between ${numParticipants} participants (${perPerson} ${token.toUpperCase()} each).`,
        },
      };
    } catch (error) {
      this.logger.error('Failed to create split', error);
      return {
        success: false,
        error: `Failed to create split: ${(error as Error).message}`,
      };
    }
  }
}

// ============================================
// Get Splits Tool
// ============================================

@Injectable()
export class GetSplitsTool implements AIToolHandler {
  readonly name = 'get_splits';
  private readonly logger = new Logger(GetSplitsTool.name);

  constructor(private readonly splitService: SplitService) {}

  readonly definition: ToolDefinition = {
    name: 'get_splits',
    description:
      'View split bills. Can filter by: "active" (default), "completed", or "pending_payment" (splits where you owe money).',
    parameters: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: 'Filter: "active" (default), "completed", "pending_payment"',
        },
      },
      required: [],
    },
  };

  async execute(params: ToolParams & { filter?: string }): Promise<ToolResult> {
    const { userAddress, filter } = params;

    if (!userAddress) {
      return { success: false, error: 'User address is required' };
    }

    this.logger.debug(`Getting splits for ${userAddress} (filter: ${filter || 'all'})`);

    try {
      let splits;

      if (filter === 'pending_payment') {
        splits = await this.splitService.findPendingForAddress(userAddress);
      } else {
        splits = await this.splitService.findByCreator(userAddress);
        if (filter === 'completed') {
          splits = splits.filter((s) => s.status === 'completed');
        } else if (filter === 'active') {
          splits = splits.filter((s) => s.status === 'active');
        }
      }

      if (!splits || splits.length === 0) {
        return {
          success: true,
          data: {
            splits: [],
            total: 0,
            message: 'No split bills found',
          },
        };
      }

      const formattedSplits = splits.map((s) => ({
        id: s.id,
        totalAmount: s.totalAmount,
        token: s.tokenSymbol,
        description: s.description,
        status: s.status,
        participantCount: s.participants.length,
        paidCount: s.participants.filter((p) => p.status === 'paid').length,
        createdAt: s.createdAt.toISOString(),
      }));

      return {
        success: true,
        data: {
          splits: formattedSplits,
          total: formattedSplits.length,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get splits', error);
      return {
        success: false,
        error: `Failed to fetch split bills: ${(error as Error).message}`,
      };
    }
  }
}
