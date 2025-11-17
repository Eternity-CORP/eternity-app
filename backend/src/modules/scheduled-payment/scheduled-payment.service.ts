import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduledPayment, ScheduledPaymentStatus } from '../../../database/entities/scheduled-payment.entity';
import { User } from '../../../database/entities/user.entity';
import { ShardIntegrationService } from '../shard/shard-integration.service';

@Injectable()
export class ScheduledPaymentService {
  private readonly logger = new Logger(ScheduledPaymentService.name);

  constructor(
    @InjectRepository(ScheduledPayment)
    private scheduledPaymentRepository: Repository<ScheduledPayment>,
    private readonly shardIntegration: ShardIntegrationService,
  ) {}

  async create(dto: any, user: User): Promise<ScheduledPayment> {
    const scheduledPayment = this.scheduledPaymentRepository.create({
      user,
      recipientAddress: dto.recipientAddress.toLowerCase(),
      amount: dto.amount,
      currency: dto.currency || 'ETH',
      message: dto.message,
      emoji: dto.emoji,
      scheduledFor: new Date(dto.scheduledFor),
      status: ScheduledPaymentStatus.PENDING,
    });

    const saved = await this.scheduledPaymentRepository.save(scheduledPayment);

    // Award shards for creating scheduled payment
    try {
      await this.shardIntegration.handleScheduledPaymentCreated(user.id, {
        scheduledPaymentId: saved.id,
        amount: dto.amount,
        recipientAddress: dto.recipientAddress,
      });
    } catch (error: any) {
      this.logger.error(`Failed to award scheduled payment shards: ${error.message}`);
    }

    return saved;
  }

  async getUserScheduledPayments(userId: string): Promise<ScheduledPayment[]> {
    return this.scheduledPaymentRepository.find({
      where: { user: { id: userId } },
      order: { scheduledFor: 'ASC' },
    });
  }

  async cancel(paymentId: string, userId: string): Promise<void> {
    const payment = await this.scheduledPaymentRepository.findOne({
      where: { id: paymentId, user: { id: userId } },
    });

    if (!payment) {
      throw new Error('Scheduled payment not found');
    }

    if (payment.status !== ScheduledPaymentStatus.PENDING) {
      throw new Error('Can only cancel pending payments');
    }

    payment.status = ScheduledPaymentStatus.CANCELLED;
    await this.scheduledPaymentRepository.save(payment);
  }

  async markCompleted(
    paymentId: string,
    transactionHash: string,
  ): Promise<void> {
    const payment = await this.scheduledPaymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error('Scheduled payment not found');
    }

    payment.status = ScheduledPaymentStatus.COMPLETED;
    payment.transactionHash = transactionHash;
    payment.executedAt = new Date();
    await this.scheduledPaymentRepository.save(payment);
  }

  async markFailed(paymentId: string, errorMessage: string): Promise<void> {
    const payment = await this.scheduledPaymentRepository.findOne({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error('Scheduled payment not found');
    }

    payment.status = ScheduledPaymentStatus.FAILED;
    payment.errorMessage = errorMessage;
    payment.executedAt = new Date();
    await this.scheduledPaymentRepository.save(payment);
  }
}
