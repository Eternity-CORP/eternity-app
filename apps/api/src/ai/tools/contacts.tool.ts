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
      'Get user profile information, lookup usernames, or suggest saving a contact. Actions: "lookup" (default) to find addresses/usernames, "suggest_save" to recommend saving a recipient as a contact.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'Action: "lookup" (default) or "suggest_save"',
        },
        lookupAddress: {
          type: 'string',
          description: 'Address to lookup username for (action=lookup)',
        },
        lookupUsername: {
          type: 'string',
          description: 'Username to lookup address for, without @ (action=lookup)',
        },
        address: {
          type: 'string',
          description: 'Address to suggest saving (action=suggest_save)',
        },
        suggestedName: {
          type: 'string',
          description: 'Suggested contact name (action=suggest_save)',
        },
      },
      required: [],
    },
  };

  async execute(params: ToolParams & {
    action?: string;
    lookupAddress?: string;
    lookupUsername?: string;
    address?: string;
    suggestedName?: string;
  }): Promise<ToolResult> {
    const { userAddress, action, lookupAddress, lookupUsername, address, suggestedName } = params;

    if (!userAddress) {
      return {
        success: false,
        error: 'User address is required',
      };
    }

    this.logger.debug(`Getting contacts/profile for ${userAddress} (action: ${action || 'lookup'})`);

    try {
      // Handle suggest_save action
      if (action === 'suggest_save' && address) {
        const username = await this.usernameService.lookupByAddress(address);
        return {
          success: true,
          data: {
            suggestSave: {
              address,
              username: username ? `@${username.username}` : undefined,
              suggestedName: suggestedName || undefined,
            },
            message: `You can save ${username ? '@' + username.username : address.slice(0, 6) + '...' + address.slice(-4)} as a contact for easier future transfers.`,
          },
        };
      }

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
        error: `Failed to fetch profile information: ${(error as Error).message}`,
      };
    }
  }
}
