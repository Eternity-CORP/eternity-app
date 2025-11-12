import { Body, Controller, Post, Get, Param, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { PushTokenPlatform } from '../../../database/entities/push-token.entity';

class RegisterPushTokenDto {
  walletAddress!: string;
  expoPushToken!: string;
  platform!: PushTokenPlatform;
  deviceId?: string;
}

class RegisterUserDto {
  walletAddress!: string;
}

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Register a new user (or get existing)
   */
  @Post('register')
  async register(@Body() dto: RegisterUserDto) {
    const user = await this.userService.registerUser(dto.walletAddress);
    return {
      id: user.id,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
    };
  }

  /**
   * Register push token for notifications
   */
  @Post('push-token')
  async registerPushToken(@Body() dto: RegisterPushTokenDto) {
    const pushToken = await this.userService.registerPushToken(
      dto.walletAddress,
      dto.expoPushToken,
      dto.platform,
      dto.deviceId,
    );

    return {
      id: pushToken.id,
      active: pushToken.active,
      platform: pushToken.platform,
    };
  }

  /**
   * Deactivate push token
   */
  @Delete('push-token/:token')
  async deactivatePushToken(@Param('token') token: string) {
    await this.userService.deactivatePushToken(token);
    return { success: true };
  }

  /**
   * Get user by wallet address
   */
  @Get(':walletAddress')
  async getUser(@Param('walletAddress') walletAddress: string) {
    const user = await this.userService.findByWalletAddress(walletAddress);
    if (!user) {
      return { found: false };
    }

    return {
      found: true,
      id: user.id,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
    };
  }

  /**
   * Get user's push tokens
   */
  @Get(':walletAddress/push-tokens')
  async getUserPushTokens(@Param('walletAddress') walletAddress: string) {
    const tokens = await this.userService.getUserPushTokens(walletAddress);
    return tokens.map((t) => ({
      id: t.id,
      platform: t.platform,
      active: t.active,
      lastUsedAt: t.lastUsedAt,
    }));
  }
}
