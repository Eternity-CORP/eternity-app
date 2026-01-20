import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsernameService } from './username.service';
import { RegisterUsernameDto, UpdateUsernameDto, DeleteUsernameDto, UpdatePreferencesDto } from './dto';

@Controller('api/username')
export class UsernameController {
  constructor(private readonly usernameService: UsernameService) {}

  /**
   * Lookup username -> address
   * GET /api/username/:name
   */
  @Get(':name')
  async lookup(@Param('name') name: string) {
    const result = await this.usernameService.lookup(name);
    if (!result) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'USERNAME_NOT_FOUND',
          message: 'Username not found',
        },
      });
    }
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Reverse lookup: address -> username
   * GET /api/username/address/:address
   */
  @Get('address/:address')
  async lookupByAddress(@Param('address') address: string) {
    const result = await this.usernameService.lookupByAddress(address);
    if (!result) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'USERNAME_NOT_FOUND',
          message: 'No username found for this address',
        },
      });
    }
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Check username availability
   * GET /api/username/check/:name
   */
  @Get('check/:name')
  async checkAvailability(@Param('name') name: string) {
    const available = await this.usernameService.isAvailable(name);
    return {
      success: true,
      data: {
        username: name.toLowerCase(),
        available,
      },
    };
  }

  /**
   * Register a new username
   * POST /api/username
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterUsernameDto) {
    const result = await this.usernameService.register(dto);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Update username
   * PUT /api/username
   */
  @Put()
  async update(@Body() dto: UpdateUsernameDto) {
    const result = await this.usernameService.update(dto);
    return {
      success: true,
      data: result,
    };
  }

  /**
   * Delete username
   * DELETE /api/username
   */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Body() dto: DeleteUsernameDto) {
    await this.usernameService.delete(dto);
  }

  /**
   * Update network preferences
   * PUT /api/username/preferences
   */
  @Put('preferences')
  async updatePreferences(@Body() dto: UpdatePreferencesDto) {
    const result = await this.usernameService.updatePreferences(dto);
    return {
      success: true,
      data: result,
    };
  }
}
