import { Injectable, Logger } from '@nestjs/common';
import { UsernameService } from '../../username/username.service';
import {
  AIToolHandler,
  ToolDefinition,
  ToolParams,
  ToolResult,
} from './tool.interface';

// ============================================
// Check Username Tool
// ============================================

@Injectable()
export class CheckUsernameTool implements AIToolHandler {
  readonly name = 'check_username';
  private readonly logger = new Logger(CheckUsernameTool.name);

  constructor(private readonly usernameService: UsernameService) {}

  readonly definition: ToolDefinition = {
    name: 'check_username',
    description:
      'Check if a username is available for registration. Also validates the format (3-20 chars, lowercase, starts with letter).',
    parameters: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username to check (without @ prefix)',
        },
      },
      required: ['username'],
    },
  };

  async execute(params: ToolParams & { username: string }): Promise<ToolResult> {
    const { username } = params;

    if (!username) {
      return { success: false, error: 'Username is required' };
    }

    const clean = username.replace(/^@/, '').toLowerCase();

    this.logger.debug(`Checking username availability: ${clean}`);

    try {
      // Validate format
      if (clean.length < 3 || clean.length > 20) {
        return {
          success: true,
          data: {
            username: clean,
            available: false,
            reason: 'Username must be 3-20 characters long',
          },
        };
      }

      if (!/^[a-z][a-z0-9_]*$/.test(clean)) {
        return {
          success: true,
          data: {
            username: clean,
            available: false,
            reason: 'Username must start with a letter and contain only lowercase letters, numbers, and underscores',
          },
        };
      }

      const available = await this.usernameService.isAvailable(clean);

      return {
        success: true,
        data: {
          username: clean,
          available,
          message: available
            ? `@${clean} is available! Would you like to register it?`
            : `@${clean} is already taken. Try a different username.`,
        },
      };
    } catch (error) {
      this.logger.error('Failed to check username', error);
      return {
        success: false,
        error: `Failed to check username availability: ${(error as Error).message}`,
      };
    }
  }
}

// ============================================
// Register Username Tool
// ============================================

@Injectable()
export class RegisterUsernameTool implements AIToolHandler {
  readonly name = 'register_username';
  private readonly logger = new Logger(RegisterUsernameTool.name);

  constructor(private readonly usernameService: UsernameService) {}

  readonly definition: ToolDefinition = {
    name: 'register_username',
    description:
      'Register a username for the user\'s wallet. Returns a confirmation card that the user must approve (requires wallet signature).',
    parameters: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username to register (without @ prefix)',
        },
      },
      required: ['username'],
    },
  };

  async execute(params: ToolParams & { username: string }): Promise<ToolResult> {
    const { userAddress, username } = params;

    if (!userAddress) {
      return { success: false, error: 'User address is required' };
    }
    if (!username) {
      return { success: false, error: 'Username is required' };
    }

    const clean = username.replace(/^@/, '').toLowerCase();

    this.logger.debug(`Registering username: @${clean} for ${userAddress}`);

    try {
      // Validate format
      if (clean.length < 3 || clean.length > 20) {
        return { success: false, error: 'Username must be 3-20 characters long' };
      }

      if (!/^[a-z][a-z0-9_]*$/.test(clean)) {
        return {
          success: false,
          error: 'Username must start with a letter and contain only lowercase letters, numbers, and underscores',
        };
      }

      // Check availability
      const available = await this.usernameService.isAvailable(clean);
      if (!available) {
        return { success: false, error: `@${clean} is already taken` };
      }

      // Check if user already has a username
      const existing = await this.usernameService.lookupByAddress(userAddress);
      if (existing) {
        return {
          success: false,
          error: `You already have a username: @${existing.username}. You need to delete it first to register a new one.`,
        };
      }

      // Build the EIP-191 message that the frontend needs to sign
      const timestamp = Date.now();
      const messageToSign = `E-Y:claim:@${clean}:${userAddress.toLowerCase()}:${timestamp}`;

      return {
        success: true,
        data: {
          requiresConfirmation: true,
          pendingUsername: {
            username: clean,
            address: userAddress,
            status: 'pending_confirmation',
            messageToSign,
            timestamp,
          },
          message: `Ready to register @${clean}. Please confirm to sign and complete registration.`,
        },
      };
    } catch (error) {
      this.logger.error('Failed to register username', error);
      return {
        success: false,
        error: `Failed to register username: ${(error as Error).message}`,
      };
    }
  }
}
