import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, DataSource } from 'typeorm';
import { UserShardState } from '../../../database/entities/user-shard-state.entity';
import { ShardTransaction, ShardTransactionType, ShardReason } from '../../../database/entities/shard-transaction.entity';

export interface ShardAwardResult {
  awarded: boolean;
  totalShards: number;
  shardsEarnedToday: number;
  reason?: string;
}

@Injectable()
export class ShardService {
  private readonly logger = new Logger(ShardService.name);
  private readonly maxShardsPerDay: number;
  private readonly minTxAmountForShard: number;
  private readonly maxShardsPerDevicePerDay: number;

  constructor(
    @InjectRepository(UserShardState)
    private readonly userShardStateRepository: Repository<UserShardState>,
    @InjectRepository(ShardTransaction)
    private readonly shardTransactionRepository: Repository<ShardTransaction>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.maxShardsPerDay = this.configService.get<number>('shards.maxShardsPerDay', 3);
    this.minTxAmountForShard = this.configService.get<number>('shards.minTxAmountForShard', 0.001);
    this.maxShardsPerDevicePerDay = this.configService.get<number>(
      'shards.maxShardsPerDevicePerDay',
      5,
    );
  }

  /**
   * Award a one-time shard for onboarding actions
   * Does NOT respect daily limits
   */
  async awardShardOnce(
    userId: string,
    reason: ShardReason,
    meta?: Record<string, any>,
  ): Promise<ShardAwardResult> {
    return await this.dataSource.transaction(async (manager) => {
      try {
        // Get or create user shard state
        let userState = await manager.findOne(UserShardState, { where: { userId } });
        
        if (!userState) {
          userState = manager.create(UserShardState, {
            userId,
            totalShards: 0,
            shardsEarnedToday: 0,
            shardsDayStartedAt: null,
          });
        }

        // Check if already awarded based on reason
        const flagField = this.getOnboardingFlagField(reason);
        if (!flagField) {
          this.logger.warn(`Unknown onboarding reason: ${reason}`);
          return {
            awarded: false,
            totalShards: userState.totalShards,
            shardsEarnedToday: userState.shardsEarnedToday,
            reason: 'Unknown reason',
          };
        }

        if (userState[flagField]) {
          this.logger.debug(`Shard already awarded for ${reason} to user ${userId}`);
          return {
            awarded: false,
            totalShards: userState.totalShards,
            shardsEarnedToday: userState.shardsEarnedToday,
            reason: 'Already awarded',
          };
        }

        // Award the shard
        userState.totalShards += 1;
        (userState as any)[flagField] = true;

        await manager.save(UserShardState, userState);

        // Create transaction record
        const transaction = manager.create(ShardTransaction, {
          userId,
          amount: 1,
          type: ShardTransactionType.EARN,
          reason,
          metaJson: meta || null,
        });

        await manager.save(ShardTransaction, transaction);

        this.logger.log(`✨ Awarded onboarding shard to user ${userId} for ${reason}`);

        return {
          awarded: true,
          totalShards: userState.totalShards,
          shardsEarnedToday: userState.shardsEarnedToday,
        };
      } catch (error: any) {
        this.logger.error(`Failed to award onboarding shard: ${error.message}`, error.stack);
        throw error;
      }
    });
  }

  /**
   * Try to award a daily repeatable shard
   * Respects MAX_SHARDS_PER_DAY limit
   */
  async tryAwardDailyShard(
    userId: string,
    reason: ShardReason,
    meta?: Record<string, any>,
    deviceId?: string,
  ): Promise<ShardAwardResult> {
    return await this.dataSource.transaction(async (manager) => {
      try {
        // Get or create user shard state
        let userState = await manager.findOne(UserShardState, { where: { userId } });
        
        if (!userState) {
          userState = manager.create(UserShardState, {
            userId,
            totalShards: 0,
            shardsEarnedToday: 0,
            shardsDayStartedAt: null,
          });
        }

        // Ensure day state is current
        await this.ensureShardDayState(userState);

        // Optional per-device anti-farm limits
        if (deviceId) {
          const deviceTotalToday = await this.countDeviceShardsToday(manager, deviceId);
          if (deviceTotalToday >= this.maxShardsPerDevicePerDay) {
            this.logger.debug(
              `Device daily shard limit reached for device ${deviceId} (${deviceTotalToday}/${this.maxShardsPerDevicePerDay})`,
            );
            return {
              awarded: false,
              totalShards: userState.totalShards,
              shardsEarnedToday: userState.shardsEarnedToday,
              reason: 'Device daily limit reached',
            };
          }

          const deviceReasonAwarded = await this.hasDeviceReceivedDailyRewardToday(
            manager,
            deviceId,
            reason,
          );
          if (deviceReasonAwarded) {
            this.logger.debug(
              `Daily shard for ${reason} already awarded today for device ${deviceId}`,
            );
            return {
              awarded: false,
              totalShards: userState.totalShards,
              shardsEarnedToday: userState.shardsEarnedToday,
              reason: 'Already awarded today for device',
            };
          }
        }

        // Check daily limit
        if (userState.shardsEarnedToday >= this.maxShardsPerDay) {
          this.logger.debug(
            `Daily shard limit reached for user ${userId} (${userState.shardsEarnedToday}/${this.maxShardsPerDay})`,
          );
          return {
            awarded: false,
            totalShards: userState.totalShards,
            shardsEarnedToday: userState.shardsEarnedToday,
            reason: 'Daily limit reached',
          };
        }

        // Check if already awarded this specific daily reward today
        const alreadyAwardedToday = await this.hasReceivedDailyRewardToday(manager, userId, reason);
        if (alreadyAwardedToday) {
          this.logger.debug(`Daily shard for ${reason} already awarded today to user ${userId}`);
          return {
            awarded: false,
            totalShards: userState.totalShards,
            shardsEarnedToday: userState.shardsEarnedToday,
            reason: 'Already awarded today',
          };
        }

        // Award the shard
        userState.totalShards += 1;
        userState.shardsEarnedToday += 1;

        await manager.save(UserShardState, userState);

        // Create transaction record
        const transaction = manager.create(ShardTransaction, {
          userId,
          amount: 1,
          type: ShardTransactionType.EARN,
          reason,
          metaJson: meta || null,
        });

        await manager.save(ShardTransaction, transaction);

        this.logger.log(
          `✨ Awarded daily shard to user ${userId} for ${reason} (${userState.shardsEarnedToday}/${this.maxShardsPerDay})`,
        );

        return {
          awarded: true,
          totalShards: userState.totalShards,
          shardsEarnedToday: userState.shardsEarnedToday,
        };
      } catch (error: any) {
        this.logger.error(`Failed to award daily shard: ${error.message}`, error.stack);
        throw error;
      }
    });
  }

  /**
   * Get user's shard state
   */
  async getUserShardState(userId: string): Promise<UserShardState | null> {
    return await this.userShardStateRepository.findOne({ where: { userId } });
  }

  /**
   * Get user's recent shard transactions
   */
  async getUserShardTransactions(userId: string, limit: number = 10): Promise<ShardTransaction[]> {
    return await this.shardTransactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Check if transaction amount qualifies for shard reward
   */
  isTransactionAmountEligible(amountInEth: number): boolean {
    return amountInEth >= this.minTxAmountForShard;
  }

  /**
   * Ensure the shard day state is current (reset if new day)
   */
  private async ensureShardDayState(userState: UserShardState): Promise<void> {
    const today = this.getTodayDateString();
    const stateDate = userState.shardsDayStartedAt
      ? this.formatDateToString(new Date(userState.shardsDayStartedAt))
      : null;

    if (stateDate !== today) {
      this.logger.debug(`Resetting daily shard count for user ${userState.userId} (new day: ${today})`);
      userState.shardsEarnedToday = 0;
      userState.shardsDayStartedAt = new Date(today);
    }
  }

  /**
   * Check if user has already received a specific daily reward today
   */
  private async hasReceivedDailyRewardToday(
    manager: any,
    userId: string,
    reason: ShardReason,
  ): Promise<boolean> {
    const todayStart = this.getTodayStart();
    const repo = manager.getRepository(ShardTransaction);

    const count = await repo
      .createQueryBuilder('tx')
      .where('tx.userId = :userId', { userId })
      .andWhere('tx.reason = :reason', { reason })
      .andWhere('tx.createdAt >= :todayStart', { todayStart })
      .getCount();

    return count > 0;
  }

  /**
   * Get the flag field name for an onboarding reason
   */
  private getOnboardingFlagField(reason: ShardReason): keyof UserShardState | null {
    const mapping: Record<string, keyof UserShardState> = {
      [ShardReason.ONBOARD_PROFILE_CREATED]: 'hasProfileCreationShard',
      [ShardReason.ONBOARD_FIRST_TX_SENT]: 'hasFirstSendShard',
      [ShardReason.ONBOARD_FIRST_TX_RECEIVED]: 'hasFirstReceiveShard',
      [ShardReason.ONBOARD_FIRST_SCHEDULED_PAYMENT]: 'hasFirstScheduledPaymentShard',
      [ShardReason.ONBOARD_FIRST_SPLIT_BILL]: 'hasFirstSplitBillShard',
    };

    return mapping[reason] || null;
  }

  /**
   * Get today's date as YYYY-MM-DD string
   */
  private getTodayDateString(): string {
    const today = new Date();
    return this.formatDateToString(today);
  }

  /**
   * Format date to YYYY-MM-DD string
   */
  private formatDateToString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getTodayStart(): Date {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return todayStart;
  }

  private async countDeviceShardsToday(manager: any, deviceId: string): Promise<number> {
    const todayStart = this.getTodayStart();
    const repo = manager.getRepository(ShardTransaction);

    // PostgreSQL preserves camelCase for JSONB columns, but TypeORM QueryBuilder may need quoted column name
    // Use raw SQL with proper column name quoting for JSONB access
    const result = await repo
      .createQueryBuilder('tx')
      .where("tx.\"metaJson\"->>'deviceId' = :deviceId", { deviceId })
      .andWhere('tx.createdAt >= :todayStart', { todayStart })
      .getCount();

    return result;
  }

  private async hasDeviceReceivedDailyRewardToday(
    manager: any,
    deviceId: string,
    reason: ShardReason,
  ): Promise<boolean> {
    const todayStart = this.getTodayStart();
    const repo = manager.getRepository(ShardTransaction);

    // PostgreSQL preserves camelCase for JSONB columns, but TypeORM QueryBuilder may need quoted column name
    // Use raw SQL with proper column name quoting for JSONB access
    const count = await repo
      .createQueryBuilder('tx')
      .where("tx.\"metaJson\"->>'deviceId' = :deviceId", { deviceId })
      .andWhere('tx.reason = :reason', { reason })
      .andWhere('tx.createdAt >= :todayStart', { todayStart })
      .getCount();

    return count > 0;
  }
}
