import { Injectable, Logger } from '@nestjs/common';
import {
  AIToolHandler,
  ToolDefinition,
  ToolParams,
  ToolResult,
} from './tool.interface';
import { BusinessService } from '../../business/business.service';

interface GetBusinessesParams extends ToolParams {
  // Only userAddress needed
}

@Injectable()
export class GetBusinessesTool implements AIToolHandler {
  readonly name = 'get_businesses';
  private readonly logger = new Logger(GetBusinessesTool.name);

  constructor(private readonly businessService: BusinessService) {}

  readonly definition: ToolDefinition = {
    name: 'get_businesses',
    description:
      'Get all business wallets the user is a member of. Returns business name, token symbol, supply, member count, and contract addresses.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  };

  async execute(params: GetBusinessesParams): Promise<ToolResult> {
    const { userAddress } = params;

    if (!userAddress) {
      return { success: false, error: 'User address is required' };
    }

    this.logger.debug(`Getting businesses for ${userAddress}`);

    try {
      const businesses = await this.businessService.findByUserAddress(userAddress);

      if (businesses.length === 0) {
        return {
          success: true,
          data: {
            message: 'You are not a member of any business wallets yet.',
            businesses: [],
          },
        };
      }

      const summary = businesses.map((b) => ({
        id: b.id,
        name: b.name,
        tokenSymbol: b.tokenSymbol,
        tokenSupply: b.tokenSupply,
        memberCount: b.members?.length || 0,
        transferPolicy: b.transferPolicy,
        contractAddress: b.contractAddress,
        treasuryAddress: b.treasuryAddress,
      }));

      return {
        success: true,
        data: {
          businesses: summary,
          count: businesses.length,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get businesses', error);
      return {
        success: false,
        error: `Failed to fetch businesses: ${(error as Error).message}`,
      };
    }
  }
}

interface GetBusinessDetailParams extends ToolParams {
  businessName?: string;
}

@Injectable()
export class GetBusinessDetailTool implements AIToolHandler {
  readonly name = 'get_business_detail';
  private readonly logger = new Logger(GetBusinessDetailTool.name);

  constructor(private readonly businessService: BusinessService) {}

  readonly definition: ToolDefinition = {
    name: 'get_business_detail',
    description:
      'Get detailed information about a specific business wallet including members with their share allocations, governance settings, vesting/dividend configuration, and recent activity.',
    parameters: {
      type: 'object',
      properties: {
        businessName: {
          type: 'string',
          description: 'Name of the business to look up (partial match supported)',
        },
      },
      required: ['businessName'],
    },
  };

  async execute(params: GetBusinessDetailParams): Promise<ToolResult> {
    const { userAddress, businessName } = params;

    if (!userAddress) {
      return { success: false, error: 'User address is required' };
    }
    if (!businessName) {
      return { success: false, error: 'Business name is required' };
    }

    this.logger.debug(`Getting business detail for "${businessName}" by ${userAddress}`);

    try {
      const businesses = await this.businessService.findByUserAddress(userAddress);
      const match = businesses.find(
        (b) => b.name.toLowerCase().includes(businessName.toLowerCase()),
      );

      if (!match) {
        return {
          success: true,
          data: {
            message: `No business found matching "${businessName}". Use get_businesses to see your business wallets.`,
          },
        };
      }

      const activity = await this.businessService.getActivity(match.id);

      return {
        success: true,
        data: {
          business: {
            name: match.name,
            description: match.description,
            tokenSymbol: match.tokenSymbol,
            tokenSupply: match.tokenSupply,
            transferPolicy: match.transferPolicy,
            quorumThreshold: `${match.quorumThreshold / 100}%`,
            votingPeriod: `${match.votingPeriod}s`,
            vestingEnabled: match.vestingEnabled,
            vestingConfig: match.vestingConfig,
            dividendsEnabled: match.dividendsEnabled,
            dividendsConfig: match.dividendsConfig,
            contractAddress: match.contractAddress,
            treasuryAddress: match.treasuryAddress,
            network: match.network,
          },
          members: (match.members || []).map((m) => ({
            address: m.address,
            username: m.username,
            shares: m.initialShares,
            role: m.role,
          })),
          recentActivity: activity.slice(0, 10).map((a) => ({
            type: a.type,
            description: a.description,
            date: a.createdAt,
          })),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get business detail', error);
      return {
        success: false,
        error: `Failed to fetch business detail: ${(error as Error).message}`,
      };
    }
  }
}

interface GetProposalsParams extends ToolParams {
  businessName?: string;
  status?: string;
}

@Injectable()
export class GetBusinessProposalsTool implements AIToolHandler {
  readonly name = 'get_business_proposals';
  private readonly logger = new Logger(GetBusinessProposalsTool.name);

  constructor(private readonly businessService: BusinessService) {}

  readonly definition: ToolDefinition = {
    name: 'get_business_proposals',
    description:
      'Get governance proposals for a business wallet. Shows proposal title, type, status, deadline, and voting progress.',
    parameters: {
      type: 'object',
      properties: {
        businessName: {
          type: 'string',
          description: 'Name of the business to look up proposals for',
        },
        status: {
          type: 'string',
          description: 'Filter by proposal status',
          enum: ['active', 'passed', 'rejected', 'executed', 'canceled'],
        },
      },
      required: ['businessName'],
    },
  };

  async execute(params: GetProposalsParams): Promise<ToolResult> {
    const { userAddress, businessName, status } = params;

    if (!userAddress) {
      return { success: false, error: 'User address is required' };
    }
    if (!businessName) {
      return { success: false, error: 'Business name is required' };
    }

    this.logger.debug(`Getting proposals for "${businessName}"`);

    try {
      const businesses = await this.businessService.findByUserAddress(userAddress);
      const match = businesses.find(
        (b) => b.name.toLowerCase().includes(businessName.toLowerCase()),
      );

      if (!match) {
        return {
          success: true,
          data: { message: `No business found matching "${businessName}".` },
        };
      }

      const activity = await this.businessService.getActivity(match.id);
      const proposalActivities = activity.filter((a) =>
        ['proposal', 'vote', 'executed'].includes(a.type),
      );

      return {
        success: true,
        data: {
          businessName: match.name,
          proposals: proposalActivities.map((a) => ({
            type: a.type,
            description: a.description,
            date: a.createdAt,
            txHash: a.txHash,
          })),
          note: status
            ? `Filtered by status: ${status}`
            : 'Showing all proposal-related activity',
        },
      };
    } catch (error) {
      this.logger.error('Failed to get proposals', error);
      return {
        success: false,
        error: `Failed to fetch proposals: ${(error as Error).message}`,
      };
    }
  }
}
