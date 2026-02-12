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
  splitType?: 'split_with_me' | 'collect';
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
      'Create a split bill. Two modes: "split_with_me" (default) — creator pays equally with participants; "collect" — creator collects from participants only.',
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
        splitType: {
          type: 'string',
          enum: ['split_with_me', 'collect'],
          description: 'Split mode: "split_with_me" (default) — you + participants split equally; "collect" — participants pay the full amount divided among them',
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
    const { userAddress, totalAmount, token, description, splitType = 'split_with_me', participants } = params;

    if (!userAddress) {
      return { success: false, error: 'User address is required' };
    }
    if (!totalAmount || !token || !participants || participants.length === 0) {
      return { success: false, error: 'totalAmount, token, and at least one participant are required' };
    }

    this.logger.debug(`Creating split (${splitType}): ${totalAmount} ${token} between ${participants.length} participants`);

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

      // Split with me: creator + participants; Collect: participants only
      const divisor = splitType === 'split_with_me' ? numParticipants + 1 : numParticipants;
      const perPerson = (totalNum / divisor).toFixed(8);

      for (const p of participants) {
        let address = p.address_or_username;
        let username: string | undefined;

        const isEthAddr = /^0x[a-fA-F0-9]{40}$/.test(address);
        if (!isEthAddr) {
          // Strip @ prefix if present, then resolve via UsernameService
          username = address.startsWith('@') ? address.slice(1) : address;
          const record = await this.usernameService.lookup(username);
          if (!record) {
            return { success: false, error: `Username @${username} not found` };
          }
          address = record.address;
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

      // Return preview for frontend confirmation — don't create yet
      const modeLabel = splitType === 'split_with_me'
        ? `you + ${numParticipants} participants`
        : `${numParticipants} participants`;

      return {
        success: true,
        data: {
          requiresConfirmation: true,
          pendingSplit: {
            totalAmount,
            token: token.toUpperCase(),
            description,
            perPerson,
            splitType,
            participants: resolvedParticipants.map((p) => ({
              address: p.address,
              username: p.username,
              name: p.name,
              amount: p.amount,
            })),
            creatorUsername: creatorProfile?.username,
            status: 'pending_confirmation' as const,
          },
          message: `Ready to split ${totalAmount} ${token.toUpperCase()} between ${modeLabel} (${perPerson} ${token.toUpperCase()} each). Please confirm.`,
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
