import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../database/entities/user.entity';
import { PushToken, PushTokenPlatform } from '../../../database/entities/push-token.entity';
import { ShardService } from '../shard/shard.service';
import { ShardReason } from '../../../database/entities/shard-transaction.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(PushToken)
    private pushTokenRepository: Repository<PushToken>,
    private readonly shardService: ShardService,
  ) {}

  /**
   * Find user by wallet address (case-insensitive)
   */
  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { walletAddress: walletAddress.toLowerCase() },
    });
  }

  /**
   * Register or update user
   */
  async registerUser(walletAddress: string): Promise<User> {
    const normalizedAddress = walletAddress.toLowerCase();
    let user = await this.findByWalletAddress(normalizedAddress);
    let isNewUser = false;

    if (!user) {
      user = this.userRepository.create({
        walletAddress: normalizedAddress,
      });
      user = await this.userRepository.save(user);
      isNewUser = true;
    }

    // Award shard for profile creation (only for new users)
    if (isNewUser) {
      try {
        await this.shardService.awardShardOnce(
          user.id,
          ShardReason.ONBOARD_PROFILE_CREATED,
          { walletAddress: normalizedAddress },
        );
      } catch (error: any) {
        // Don't fail user registration if shard award fails
        this.logger.error(`Failed to award profile creation shard: ${error.message}`);
      }
    }

    return user;
  }

  /**
   * Register push token for a user
   */
  async registerPushToken(
    walletAddress: string,
    expoPushToken: string,
    platform: PushTokenPlatform,
    deviceId?: string,
  ): Promise<PushToken> {
    // Ensure user exists
    const user = await this.registerUser(walletAddress);

    // Check if token already exists
    let pushToken = await this.pushTokenRepository.findOne({
      where: {
        user: { id: user.id },
        expoPushToken,
      },
    });

    if (pushToken) {
      pushToken.active = true;
      pushToken.platform = platform;
      pushToken.deviceId = deviceId || null;
      pushToken.lastUsedAt = new Date();
    } else {
      pushToken = this.pushTokenRepository.create({
        user,
        expoPushToken,
        platform,
        deviceId: deviceId || null,
        active: true,
        lastUsedAt: new Date(),
      });
    }

    return this.pushTokenRepository.save(pushToken);
  }

  /**
   * Deactivate push token
   */
  async deactivatePushToken(expoPushToken: string): Promise<void> {
    await this.pushTokenRepository.update(
      { expoPushToken },
      { active: false },
    );
  }

  /**
   * Get user's active push tokens
   */
  async getUserPushTokens(walletAddress: string): Promise<PushToken[]> {
    return this.pushTokenRepository.find({
      where: {
        user: { walletAddress: walletAddress.toLowerCase() },
        active: true,
      },
    });
  }
}
