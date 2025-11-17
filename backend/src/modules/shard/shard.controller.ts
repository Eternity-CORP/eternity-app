import { Controller, Get, UseGuards, Request, Logger } from '@nestjs/common';
import { ShardService } from './shard.service';
import { JwtAuthGuard } from '../shared/jwt-auth.guard';
import { ShardStateDto, ShardTransactionDto } from './dto/shard-state.dto';

@Controller('shards')
@UseGuards(JwtAuthGuard)
export class ShardController {
  private readonly logger = new Logger(ShardController.name);

  constructor(private readonly shardService: ShardService) {}

  @Get('me')
  async getMyShards(@Request() req: any): Promise<ShardStateDto> {
    const userId = req.user.userId;

    try {
      const state = await this.shardService.getUserShardState(userId);
      const transactions = await this.shardService.getUserShardTransactions(userId, 10);

      if (!state) {
        return {
          totalShards: 0,
          shardsEarnedToday: 0,
          recentTransactions: [],
        };
      }

      const recentTransactions: ShardTransactionDto[] = transactions.map((tx) => ({
        id: tx.id,
        amount: tx.amount,
        reason: tx.reason,
        createdAt: tx.createdAt,
      }));

      return {
        totalShards: state.totalShards,
        shardsEarnedToday: state.shardsEarnedToday,
        recentTransactions,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get shard state for user ${userId}: ${error.message}`);
      throw error;
    }
  }
}
