import { Body, Controller, NotFoundException, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../database/entities/user.entity';
import { ShardIntegrationService } from './shard-integration.service';
import { ShardService } from './shard.service';

class WalletDto {
  walletAddress!: string;
  deviceId?: string;
}

class SendShardDto extends WalletDto {
  amountEth!: string;
  txHash?: string;
  recipientAddress?: string;
  network?: string;
}

class ReceiveShardDto extends WalletDto {
  amountEth!: string;
  txHash?: string;
  senderAddress?: string;
  network?: string;
}

class ScheduledShardDto extends WalletDto {
  amountEth?: string;
  recipientAddress?: string;
}

class SplitBillShardDto extends WalletDto {
  totalAmount?: string;
  participantsCount?: number;
}

@Controller('shards/actions')
export class ShardActionsController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly shardIntegration: ShardIntegrationService,
    private readonly shardService: ShardService,
  ) {}

  private async findUserOrThrow(rawAddress: string): Promise<User> {
    const walletAddress = rawAddress.toLowerCase();
    const user = await this.userRepo.findOne({ where: { walletAddress } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

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
  async reportSend(@Body() dto: SendShardDto) {
    const user = await this.findUserOrThrow(dto.walletAddress);

    const meta: Record<string, any> = {};
    if (dto.txHash) meta.txHash = dto.txHash;
    if (dto.recipientAddress) meta.recipientAddress = dto.recipientAddress;
    if (dto.network) meta.network = dto.network;
    if (dto.deviceId) meta.deviceId = dto.deviceId;

    const { earnedShards, limitReason } = await this.shardIntegration.handleTokenSent(
      user.id,
      dto.amountEth,
      meta,
    );

    return this.withState(user.id, earnedShards, limitReason);
  }

  @Post('receive')
  async reportReceive(@Body() dto: ReceiveShardDto) {
    const user = await this.findUserOrThrow(dto.walletAddress);

    const meta: Record<string, any> = {};
    if (dto.txHash) meta.txHash = dto.txHash;
    if (dto.senderAddress) meta.senderAddress = dto.senderAddress;
    if (dto.network) meta.network = dto.network;
    if (dto.deviceId) meta.deviceId = dto.deviceId;

    const { earnedShards } = await this.shardIntegration.handleTokenReceived(
      user.id,
      dto.amountEth,
      meta,
    );

    return this.withState(user.id, earnedShards);
  }

  @Post('scheduled-payment')
  async reportScheduledPayment(@Body() dto: ScheduledShardDto) {
    const user = await this.findUserOrThrow(dto.walletAddress);

    const meta: Record<string, any> = {};
    if (dto.amountEth) meta.amount = dto.amountEth;
    if (dto.recipientAddress) meta.recipientAddress = dto.recipientAddress;
    if (dto.deviceId) meta.deviceId = dto.deviceId;

    const { earnedShards, limitReason } =
      await this.shardIntegration.handleScheduledPaymentCreated(user.id, meta);

    return this.withState(user.id, earnedShards, limitReason);
  }

  @Post('split-bill')
  async reportSplitBill(@Body() dto: SplitBillShardDto) {
    const user = await this.findUserOrThrow(dto.walletAddress);

    const meta: Record<string, any> = {};
    if (dto.totalAmount) meta.totalAmount = dto.totalAmount;
    if (typeof dto.participantsCount === 'number') {
      meta.participantsCount = dto.participantsCount;
    }
    if (dto.deviceId) meta.deviceId = dto.deviceId;

    const { earnedShards, limitReason } = await this.shardIntegration.handleSplitBillCreated(
      user.id,
      meta,
    );

    return this.withState(user.id, earnedShards, limitReason);
  }
}
