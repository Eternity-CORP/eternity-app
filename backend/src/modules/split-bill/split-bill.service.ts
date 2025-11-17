import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SplitBill, SplitBillParticipant } from '../../../database/entities/split-bill.entity';
import { User } from '../../../database/entities/user.entity';
import { PushNotificationService } from '../../services/push-notification.service';
import { ShardIntegrationService } from '../shard/shard-integration.service';

@Injectable()
export class SplitBillService {
  private readonly logger = new Logger(SplitBillService.name);

  constructor(
    @InjectRepository(SplitBill)
    private splitBillRepository: Repository<SplitBill>,
    @InjectRepository(SplitBillParticipant)
    private participantRepository: Repository<SplitBillParticipant>,
    private pushService: PushNotificationService,
    private readonly shardIntegration: ShardIntegrationService,
  ) {}

  async create(dto: any, creator: User): Promise<SplitBill> {
    const splitBill = this.splitBillRepository.create({
      creator,
      totalAmount: dto.totalAmount,
      currency: dto.currency || 'ETH',
      mode: dto.mode,
      participantsCount: dto.participants.length,
      message: dto.message,
      emoji: dto.emoji,
      shareableLink: dto.shareableLink,
    });

    const saved = await this.splitBillRepository.save(splitBill);

    // Create participants
    const participants = dto.participants.map((p: any) =>
      this.participantRepository.create({
        splitBill: saved,
        participantAddress: p.address.toLowerCase(),
        amount: p.amount,
      }),
    );

    await this.participantRepository.save(participants);

    const result = await this.splitBillRepository.findOne({
      where: { id: saved.id },
      relations: ['participants'],
    });

    if (!result) {
      throw new Error('Failed to create split bill');
    }

    // Award shards for creating split bill
    try {
      await this.shardIntegration.handleSplitBillCreated(creator.id, {
        splitBillId: result.id,
        totalAmount: dto.totalAmount,
        participantsCount: dto.participants.length,
      });
    } catch (error: any) {
      this.logger.error(`Failed to award split bill shards: ${error.message}`);
    }

    return result;
  }

  async notifyParticipants(splitBillId: string): Promise<void> {
    const splitBill = await this.splitBillRepository.findOne({
      where: { id: splitBillId },
      relations: ['creator', 'participants'],
    });

    if (!splitBill) throw new Error('Split bill not found');

    for (const participant of splitBill.participants) {
      if (!participant.notificationSent) {
        await this.pushService.sendToWalletAddress(
          participant.participantAddress,
          '💸 Split Bill Request',
          `${splitBill.emoji || ''} Pay ${participant.amount} ${splitBill.currency} ${splitBill.message || ''}`,
          { splitBillId: splitBill.id },
        );

        participant.notificationSent = true;
        await this.participantRepository.save(participant);
      }
    }
  }

  async markParticipantPaid(
    participantId: string,
    transactionHash: string,
  ): Promise<void> {
    const participant = await this.participantRepository.findOne({
      where: { id: participantId },
      relations: ['splitBill', 'splitBill.creator'],
    });

    if (!participant) throw new Error('Participant not found');

    participant.paid = true;
    participant.transactionHash = transactionHash;
    participant.paidAt = new Date();
    await this.participantRepository.save(participant);

    // Notify creator
    await this.pushService.sendToUser(
      participant.splitBill.creator,
      '✅ Payment Received',
      `Received ${participant.amount} ${participant.splitBill.currency}`,
      { splitBillId: participant.splitBill.id },
    );
  }
}
