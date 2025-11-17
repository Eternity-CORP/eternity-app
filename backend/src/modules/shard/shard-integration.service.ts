import { Injectable, Logger } from '@nestjs/common';
import { ShardService } from './shard.service';
import { ShardReason } from '../../../database/entities/shard-transaction.entity';
import { ethers } from 'ethers';

/**
 * Service for integrating shard rewards with wallet events
 * Handles safe error handling to prevent disrupting main business flows
 */
@Injectable()
export class ShardIntegrationService {
  private readonly logger = new Logger(ShardIntegrationService.name);

  constructor(private readonly shardService: ShardService) {}

  /**
   * Handle successful token send transaction
   * Awards onboarding shard for first send + daily shard for first send of the day
   */
  async handleTokenSent(
    userId: string,
    amountInEth: string,
    meta?: Record<string, any>,
  ): Promise<{ earnedShards: number; limitReason?: string }> {
    let earnedShards = 0;
    let limitReason: string | undefined;

    try {
      const amount = parseFloat(amountInEth);
      const deviceId = meta?.deviceId as string | undefined;
      
      // Check if amount qualifies for shard reward
      if (!this.shardService.isTransactionAmountEligible(amount)) {
        this.logger.debug(`Transaction amount ${amount} ETH too small for shard reward`);
        return { earnedShards: 0 };
      }

      // Try to award onboarding shard (first send ever)
      const onboardingResult = await this.shardService.awardShardOnce(
        userId,
        ShardReason.ONBOARD_FIRST_TX_SENT,
        meta,
      );

      if (onboardingResult.awarded) {
        earnedShards += 1;
        this.logger.log(`Awarded first send shard to user ${userId}`);
      }

      // Try to award daily shard (first send today)
      const dailyResult = await this.shardService.tryAwardDailyShard(
        userId,
        ShardReason.DAILY_FIRST_SEND,
        meta,
        deviceId,
      );

      if (dailyResult.awarded) {
        earnedShards += 1;
        this.logger.log(`Awarded daily send shard to user ${userId}`);
      } else if (dailyResult.reason === 'Daily limit reached') {
        limitReason = 'DAILY_LIMIT';
      } else if (dailyResult.reason === 'Device daily limit reached') {
        limitReason = 'DEVICE_LIMIT';
      }

      return { earnedShards, limitReason };
    } catch (error: any) {
      this.logger.error(`Failed to process send shard rewards: ${error.message}`, error.stack);
      // Don't throw - we don't want to fail the transaction
      return { earnedShards };
    }
  }

  /**
   * Handle incoming transaction received
   * Awards onboarding shard for first receive
   */
  async handleTokenReceived(
    userId: string,
    amountInEth: string,
    meta?: Record<string, any>,
  ): Promise<{ earnedShards: number }> {
    let earnedShards = 0;

    try {
      const amount = parseFloat(amountInEth);
      
      // Check if amount qualifies for shard reward
      if (!this.shardService.isTransactionAmountEligible(amount)) {
        this.logger.debug(`Received amount ${amount} ETH too small for shard reward`);
        return { earnedShards: 0 };
      }

      // Try to award onboarding shard (first receive ever)
      const result = await this.shardService.awardShardOnce(
        userId,
        ShardReason.ONBOARD_FIRST_TX_RECEIVED,
        meta,
      );

      if (result.awarded) {
        earnedShards = 1;
        this.logger.log(`Awarded first receive shard to user ${userId}`);
      }

      return { earnedShards };
    } catch (error: any) {
      this.logger.error(`Failed to process receive shard rewards: ${error.message}`, error.stack);
      return { earnedShards };
    }
  }

  /**
   * Handle scheduled payment created
   * Awards onboarding shard for first scheduled payment + daily advanced feature shard
   */
  async handleScheduledPaymentCreated(
    userId: string,
    meta?: Record<string, any>,
  ): Promise<{ earnedShards: number; limitReason?: string }> {
    let earnedShards = 0;
    let limitReason: string | undefined;

    try {
      const deviceId = meta?.deviceId as string | undefined;
      // Try to award onboarding shard (first scheduled payment ever)
      const onboardingResult = await this.shardService.awardShardOnce(
        userId,
        ShardReason.ONBOARD_FIRST_SCHEDULED_PAYMENT,
        meta,
      );

      if (onboardingResult.awarded) {
        earnedShards += 1;
        this.logger.log(`Awarded first scheduled payment shard to user ${userId}`);
      }

      // Try to award daily advanced feature shard
      const dailyResult = await this.shardService.tryAwardDailyShard(
        userId,
        ShardReason.DAILY_ADVANCED_FEATURE,
        meta,
        deviceId,
      );

      if (dailyResult.awarded) {
        earnedShards += 1;
        this.logger.log(`Awarded daily advanced feature shard to user ${userId}`);
      } else if (dailyResult.reason === 'Daily limit reached') {
        limitReason = 'DAILY_LIMIT';
      } else if (dailyResult.reason === 'Device daily limit reached') {
        limitReason = 'DEVICE_LIMIT';
      }

      return { earnedShards, limitReason };
    } catch (error: any) {
      this.logger.error(`Failed to process scheduled payment shard rewards: ${error.message}`, error.stack);
      return { earnedShards };
    }
  }

  /**
   * Handle split bill created
   * Awards onboarding shard for first split bill + daily advanced feature shard
   */
  async handleSplitBillCreated(
    userId: string,
    meta?: Record<string, any>,
  ): Promise<{ earnedShards: number; limitReason?: string }> {
    let earnedShards = 0;
    let limitReason: string | undefined;

    try {
      const deviceId = meta?.deviceId as string | undefined;
      // Try to award onboarding shard (first split bill ever)
      const onboardingResult = await this.shardService.awardShardOnce(
        userId,
        ShardReason.ONBOARD_FIRST_SPLIT_BILL,
        meta,
      );

      if (onboardingResult.awarded) {
        earnedShards += 1;
        this.logger.log(`Awarded first split bill shard to user ${userId}`);
      }

      // Try to award daily advanced feature shard
      const dailyResult = await this.shardService.tryAwardDailyShard(
        userId,
        ShardReason.DAILY_ADVANCED_FEATURE,
        meta,
        deviceId,
      );

      if (dailyResult.awarded) {
        earnedShards += 1;
        this.logger.log(`Awarded daily advanced feature shard to user ${userId}`);
      } else if (dailyResult.reason === 'Daily limit reached') {
        limitReason = 'DAILY_LIMIT';
      } else if (dailyResult.reason === 'Device daily limit reached') {
        limitReason = 'DEVICE_LIMIT';
      }

      return { earnedShards, limitReason };
    } catch (error: any) {
      this.logger.error(`Failed to process split bill shard rewards: ${error.message}`, error.stack);
      return { earnedShards };
    }
  }

  /**
   * Convert Wei to ETH string
   */
  weiToEth(weiAmount: string): string {
    try {
      return ethers.utils.formatEther(weiAmount);
    } catch (error) {
      this.logger.warn(`Failed to convert Wei to ETH: ${weiAmount}`);
      return '0';
    }
  }
}
