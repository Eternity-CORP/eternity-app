import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { ShardIntegrationService } from './shard-integration.service';
import { ShardService } from './shard.service';
import { JwtAuthGuard } from '../shared/jwt-auth.guard';

class BaseShardActionDto {
  deviceId?: string;
}

class SendShardDto extends BaseShardActionDto {
  amountEth!: string;
  txHash?: string;
  recipientAddress?: string;
  network?: string;
}

class ReceiveShardDto extends BaseShardActionDto {
  amountEth!: string;
  txHash?: string;
  senderAddress?: string;
  network?: string;
}

class ScheduledShardDto extends BaseShardActionDto {
  amountEth?: string;
  recipientAddress?: string;
}

class SplitBillShardDto extends BaseShardActionDto {
  totalAmount?: string;
  participantsCount?: number;
}

@Controller('shards/actions')
@UseGuards(JwtAuthGuard)
export class ShardActionsController {
  constructor(
    private readonly shardIntegration: ShardIntegrationService,
    private readonly shardService: ShardService,
  ) {}

  private async withState(userId: string, earnedShards: number, limitReason?: string) {
    const state = await this.shardService.getUserShardState(userId);
    return {
      earnedShards,
      totalShards: state?.totalShards ?? 0,
      shardsEarnedToday: state?.shardsEarnedToday ?? 0,
      limitReason,
    };
  }

  @Post('send')
  async reportSend(@Request() req: any, @Body() dto: SendShardDto) {
    const userId = req.user.userId;

    const meta: Record<string, any> = {};
    if (dto.txHash) meta.txHash = dto.txHash;
    if (dto.recipientAddress) meta.recipientAddress = dto.recipientAddress;
    if (dto.network) meta.network = dto.network;
    if (dto.deviceId) meta.deviceId = dto.deviceId;

    const { earnedShards, limitReason } = await this.shardIntegration.handleTokenSent(
      userId,
      dto.amountEth,
      meta,
    );

    return this.withState(userId, earnedShards, limitReason);
  }

  @Post('receive')
  async reportReceive(@Request() req: any, @Body() dto: ReceiveShardDto) {
    const userId = req.user.userId;

    const meta: Record<string, any> = {};
    if (dto.txHash) meta.txHash = dto.txHash;
    if (dto.senderAddress) meta.senderAddress = dto.senderAddress;
    if (dto.network) meta.network = dto.network;
    if (dto.deviceId) meta.deviceId = dto.deviceId;

    const { earnedShards } = await this.shardIntegration.handleTokenReceived(
      userId,
      dto.amountEth,
      meta,
    );

    return this.withState(userId, earnedShards);
  }

  @Post('scheduled-payment')
  async reportScheduledPayment(@Request() req: any, @Body() dto: ScheduledShardDto) {
    const userId = req.user.userId;

    const meta: Record<string, any> = {};
    if (dto.amountEth) meta.amount = dto.amountEth;
    if (dto.recipientAddress) meta.recipientAddress = dto.recipientAddress;
    if (dto.deviceId) meta.deviceId = dto.deviceId;

    const { earnedShards, limitReason } =
      await this.shardIntegration.handleScheduledPaymentCreated(userId, meta);

    return this.withState(userId, earnedShards, limitReason);
  }

  @Post('split-bill')
  async reportSplitBill(@Request() req: any, @Body() dto: SplitBillShardDto) {
    const userId = req.user.userId;

    const meta: Record<string, any> = {};
    if (dto.totalAmount) meta.totalAmount = dto.totalAmount;
    if (typeof dto.participantsCount === 'number') {
      meta.participantsCount = dto.participantsCount;
    }
    if (dto.deviceId) meta.deviceId = dto.deviceId;

    const { earnedShards, limitReason } = await this.shardIntegration.handleSplitBillCreated(
      userId,
      meta,
    );

    return this.withState(userId, earnedShards, limitReason);
  }
}
