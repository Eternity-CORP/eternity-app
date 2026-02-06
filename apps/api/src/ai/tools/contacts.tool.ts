import { Injectable, Logger } from '@nestjs/common';
import { UsernameService } from '../../username/username.service';
import {
  AIToolHandler,
  ToolDefinition,
  ToolParams,
  ToolResult,
} from './tool.interface';

@Injectable()
export class ContactsTool implements AIToolHandler {
  readonly name = 'get_contacts';
  private readonly logger = new Logger(ContactsTool.name);

  constructor(private readonly usernameService: UsernameService) {}

  readonly definition: ToolDefinition = {
    name: 'get_contacts',
    description:
      'Get user profile information including their username. Also can lookup username by address or address by username.',
    parameters: {
      type: 'object',
      properties: {
        lookupAddress: {
          type: 'string',
          description: 'Optional: Address to lookup username for',
        },
        lookupUsername: {
          type: 'string',
          description: 'Optional: Username to lookup address for (without @)',
        },
      },
      required: [],
    },
  };

  async execute(params: ToolParams & { lookupAddress?: string; lookupUsername?: string }): Promise<ToolResult> {
    const { userAddress, lookupAddress, lookupUsername } = params;

    if (!userAddress) {
      return {
        success: false,
        error: 'User address is required',
      };
    }

    this.logger.debug(`Getting contacts/profile for ${userAddress}`);

    try {
      // If looking up a specific address
      if (lookupAddress) {
        const result = await this.usernameService.lookupByAddress(lookupAddress);
        if (result) {
          return {
            success: true,
            data: {
              lookup: {
                address: result.address,
                username: `@${result.username}`,
              },
            },
          };
        }
        return {
          success: true,
          data: {
            lookup: null,
            message: 'No username found for this address',
          },
        };
      }

      // If looking up a username
      if (lookupUsername) {
        const cleanUsername = lookupUsername.replace('@', '');
        const result = await this.usernameService.lookup(cleanUsername);
        if (result) {
          return {
            success: true,
            data: {
              lookup: {
                address: result.address,
                username: `@${result.username}`,
              },
            },
          };
        }
        return {
          success: true,
          data: {
            lookup: null,
            message: `Username @${cleanUsername} not found`,
          },
        };
      }

      // Default: get user's own profile
      const userProfile = await this.usernameService.lookupByAddress(userAddress);

      return {
        success: true,
        data: {
          profile: {
            address: userAddress,
            username: userProfile ? `@${userProfile.username}` : null,
            hasUsername: !!userProfile,
          },
          note: 'Contacts are stored locally on your device. Use the app to manage contacts.',
        },
      };
    } catch (error) {
      this.logger.error('Failed to get profile/contacts', error);
      return {
        success: false,
        error: 'Failed to fetch profile information',
      };
    }
  }
}
