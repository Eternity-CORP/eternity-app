import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PreferencesService } from './preferences.service';
import { SavePreferencesDto } from './dto';

@Controller('api')
export class PreferencesController {
  private readonly logger = new Logger(PreferencesController.name);

  constructor(private readonly preferencesService: PreferencesService) {}

  /**
   * GET /api/address/:address/preferences
   * Returns network preferences for an address
   */
  @Get('address/:address/preferences')
  async getPreferences(@Param('address') address: string) {
    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new BadRequestException({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: 'Invalid Ethereum address' },
      });
    }

    const preferences = await this.preferencesService.findByAddress(address);

    if (!preferences) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'PREFERENCES_NOT_FOUND',
          message: 'No preferences found for this address',
        },
      });
    }

    return {
      success: true,
      data: {
        address: preferences.address,
        preferences: {
          defaultNetwork: preferences.defaultNetwork,
          tokenOverrides: preferences.tokenOverrides,
          updatedAt: preferences.updatedAt.toISOString(),
        },
      },
    };
  }

  /**
   * PUT /api/preferences
   * Save or update preferences (requires signature authentication)
   */
  @Put('preferences')
  async savePreferences(@Body() dto: SavePreferencesDto) {
    // Verify signature
    const isValid = this.preferencesService.verifySignature(
      dto.address,
      dto.signature,
      dto.timestamp,
    );

    if (!isValid) {
      // Check if it's a timestamp issue or signature issue
      const now = Date.now();
      if (Math.abs(now - dto.timestamp) > 5 * 60 * 1000) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'TIMESTAMP_EXPIRED',
            message: 'Request timestamp is too old',
          },
        });
      }

      throw new BadRequestException({
        success: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: 'Signature verification failed',
        },
      });
    }

    const preferences = await this.preferencesService.upsert(
      dto.address,
      dto.defaultNetwork,
      dto.tokenOverrides,
    );

    this.logger.log(`Preferences saved for ${dto.address}`);

    return {
      success: true,
      data: {
        address: preferences.address,
        preferences: {
          defaultNetwork: preferences.defaultNetwork,
          tokenOverrides: preferences.tokenOverrides,
          updatedAt: preferences.updatedAt.toISOString(),
        },
      },
    };
  }
}
