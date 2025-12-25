import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { ScheduledPayment, ScheduledPaymentStatus } from '../../../database/entities/scheduled-payment.entity';
import { PushNotificationService } from '../../services/push-notification.service';

@Injectable()
export class ScheduledPaymentWorker {
  private readonly logger = new Logger(ScheduledPaymentWorker.name);

  constructor(
    @InjectRepository(ScheduledPayment)
    private scheduledPaymentRepository: Repository<ScheduledPayment>,
    private pushService: PushNotificationService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkScheduledPayments() {
    const now = new Date();

    const duePayments = await this.scheduledPaymentRepository.find({
      where: {
        scheduledFor: LessThanOrEqual(now),
        status: ScheduledPaymentStatus.PENDING,
      },
      relations: ['user'],
    });

    if (duePayments.length > 0) {
      this.logger.log(`Found ${duePayments.length} due scheduled payments`);
    }

    for (const payment of duePayments) {
      await this.notifyUser(payment);
    }
  }

  private async notifyUser(payment: ScheduledPayment) {
    try {
      await this.pushService.sendToUser(
        payment.user,
        '⏰ Scheduled Payment Due',
        `${payment.emoji || '💸'} Time to send ${payment.amount} ${payment.currency}${payment.message ? ` - ${payment.message}` : ''}`,
        { scheduledPaymentId: payment.id, action: 'execute' },
      );

      this.logger.log(`Notified user for scheduled payment ${payment.id}`);
    } catch (error) {
      this.logger.error(`Failed to notify for payment ${payment.id}:`, error);
    }
  }
}
