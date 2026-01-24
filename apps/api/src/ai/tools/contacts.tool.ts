import { Injectable, Logger } from '@nestjs/common';
import { SchemaType } from '@google/generative-ai';
import {
  AIToolHandler,
  ToolDefinition,
  ToolParams,
  ToolResult,
} from './tool.interface';

interface Contact {
  address: string;
  username?: string;
  displayName?: string;
  lastTransactionAt: string;
  transactionCount: number;
}

@Injectable()
export class ContactsTool implements AIToolHandler {
  readonly name = 'get_contacts';
  private readonly logger = new Logger(ContactsTool.name);

  readonly definition: ToolDefinition = {
    name: 'get_contacts',
    description:
      'Get frequent contacts (recipients the user has sent to before). Useful for autocomplete and suggestions.',
    parameters: {
      type: SchemaType.OBJECT,
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

    this.logger.debug(`Getting contacts for ${userAddress}`);

    try {
      // TODO: Integrate with transaction history to extract frequent contacts
      // For now, return simulated contacts
      const contacts: Contact[] = [
        {
          address: '0x1234567890abcdef1234567890abcdef12345678',
          username: 'ivan',
          displayName: 'Ivan Petrov',
          lastTransactionAt: new Date(Date.now() - 3600000).toISOString(),
          transactionCount: 15,
        },
        {
          address: '0xabcdef1234567890abcdef1234567890abcdef12',
          username: 'maria',
          displayName: 'Maria Sidorova',
          lastTransactionAt: new Date(Date.now() - 7200000).toISOString(),
          transactionCount: 8,
        },
        {
          address: '0x9876543210fedcba9876543210fedcba98765432',
          displayName: 'Coffee Shop',
          lastTransactionAt: new Date(Date.now() - 86400000).toISOString(),
          transactionCount: 5,
        },
        {
          address: '0xfedcba9876543210fedcba9876543210fedcba98',
          username: 'alex',
          lastTransactionAt: new Date(Date.now() - 172800000).toISOString(),
          transactionCount: 3,
        },
      ];

      return {
        success: true,
        data: {
          contacts,
          total: contacts.length,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get contacts', error);
      return {
        success: false,
        error: 'Failed to fetch contacts',
      };
    }
  }
}
