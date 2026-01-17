import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScheduledPayment, RecurringInterval } from './entities';
import { CreateScheduledDto, UpdateScheduledDto, ExecuteScheduledDto } from './dto';
import { ScheduledGateway } from './scheduled.gateway';

@Injectable()
export class ScheduledService {
  private readonly logger = new Logger(ScheduledService.name);

  constructor(
    @InjectRepository(ScheduledPayment)
    private readonly scheduledRepository: Repository<ScheduledPayment>,
    @Inject(forwardRef(() => ScheduledGateway))
    private readonly scheduledGateway: ScheduledGateway,
  ) {}

  async create(dto: CreateScheduledDto): Promise<ScheduledPayment> {
    this.logger.log(`Creating scheduled payment for ${dto.creatorAddress}`);

    const payment = this.scheduledRepository.create({
      creatorAddress: dto.creatorAddress.toLowerCase(),
      recipient: dto.recipient.toLowerCase(),
      recipientUsername: dto.recipientUsername,
      recipientName: dto.recipientName,
      amount: dto.amount,
      tokenSymbol: dto.tokenSymbol,
      scheduledAt: new Date(dto.scheduledAt),
      recurringInterval: dto.recurringInterval,
      recurringEndDate: dto.recurringEndDate ? new Date(dto.recurringEndDate) : null,
      description: dto.description,
      status: 'pending',
    });

    const saved = await this.scheduledRepository.save(payment);
    this.logger.log(`Scheduled payment created: ${saved.id}`);

    // Notify via WebSocket
    this.scheduledGateway.notifyPaymentCreated(saved);

    return saved;
  }

  async findById(id: string): Promise<ScheduledPayment> {
    const payment = await this.scheduledRepository.findOne({ where: { id } });

    if (!payment) {
      throw new NotFoundException(`Scheduled payment ${id} not found`);
    }

    return payment;
  }

  async findByCreator(creatorAddress: string): Promise<ScheduledPayment[]> {
    return this.scheduledRepository.find({
      where: { creatorAddress: creatorAddress.toLowerCase() },
      order: { scheduledAt: 'ASC' },
    });
  }

  async findPending(creatorAddress: string): Promise<ScheduledPayment[]> {
    return this.scheduledRepository.find({
      where: {
        creatorAddress: creatorAddress.toLowerCase(),
        status: 'pending',
      },
      order: { scheduledAt: 'ASC' },
    });
  }

  async findUpcoming(creatorAddress: string, days: number = 7): Promise<ScheduledPayment[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return this.scheduledRepository.find({
      where: {
        creatorAddress: creatorAddress.toLowerCase(),
        status: 'pending',
        scheduledAt: LessThanOrEqual(futureDate),
      },
      order: { scheduledAt: 'ASC' },
    });
  }

  async update(
    id: string,
    dto: UpdateScheduledDto,
    requesterAddress: string,
  ): Promise<ScheduledPayment> {
    const payment = await this.findById(id);

    if (payment.creatorAddress.toLowerCase() !== requesterAddress.toLowerCase()) {
      throw new BadRequestException('Only creator can update scheduled payment');
    }

    if (payment.status !== 'pending') {
      throw new BadRequestException('Can only update pending payments');
    }

    // Update fields
    if (dto.recipient) payment.recipient = dto.recipient.toLowerCase();
    if (dto.recipientUsername !== undefined) payment.recipientUsername = dto.recipientUsername;
    if (dto.recipientName !== undefined) payment.recipientName = dto.recipientName;
    if (dto.amount) payment.amount = dto.amount;
    if (dto.tokenSymbol) payment.tokenSymbol = dto.tokenSymbol;
    if (dto.scheduledAt) payment.scheduledAt = new Date(dto.scheduledAt);
    if (dto.recurringInterval !== undefined) payment.recurringInterval = dto.recurringInterval;
    if (dto.recurringEndDate !== undefined) {
      payment.recurringEndDate = dto.recurringEndDate ? new Date(dto.recurringEndDate) : null;
    }
    if (dto.description !== undefined) payment.description = dto.description;

    // Reset reminder if schedule changed
    if (dto.scheduledAt) {
      payment.reminderSent = false;
    }

    const updated = await this.scheduledRepository.save(payment);

    // Notify via WebSocket
    this.scheduledGateway.notifyPaymentUpdated(updated);

    return updated;
  }

  async execute(
    id: string,
    dto: ExecuteScheduledDto,
    requesterAddress: string,
  ): Promise<ScheduledPayment> {
    const payment = await this.findById(id);

    if (payment.creatorAddress.toLowerCase() !== requesterAddress.toLowerCase()) {
      throw new BadRequestException('Only creator can execute scheduled payment');
    }

    if (payment.status !== 'pending') {
      throw new BadRequestException('Payment is not pending');
    }

    payment.status = 'executed';
    payment.executedTxHash = dto.txHash;
    payment.executedAt = new Date();

    const executed = await this.scheduledRepository.save(payment);

    this.logger.log(`Scheduled payment ${id} executed with tx ${dto.txHash}`);

    // Notify via WebSocket
    this.scheduledGateway.notifyPaymentExecuted(executed);

    // If recurring, create next occurrence
    if (payment.recurringInterval) {
      await this.createNextOccurrence(payment);
    }

    return executed;
  }

  async cancel(id: string, requesterAddress: string): Promise<ScheduledPayment> {
    const payment = await this.findById(id);

    if (payment.creatorAddress.toLowerCase() !== requesterAddress.toLowerCase()) {
      throw new BadRequestException('Only creator can cancel scheduled payment');
    }

    if (payment.status !== 'pending') {
      throw new BadRequestException('Payment is not pending');
    }

    payment.status = 'cancelled';
    const cancelled = await this.scheduledRepository.save(payment);

    this.logger.log(`Scheduled payment ${id} cancelled`);

    // Notify via WebSocket
    this.scheduledGateway.notifyPaymentCancelled(cancelled);

    return cancelled;
  }

  async delete(id: string, requesterAddress: string): Promise<void> {
    const payment = await this.findById(id);

    if (payment.creatorAddress.toLowerCase() !== requesterAddress.toLowerCase()) {
      throw new BadRequestException('Only creator can delete scheduled payment');
    }

    await this.scheduledRepository.remove(payment);
    this.logger.log(`Scheduled payment ${id} deleted`);
  }

  /**
   * Create next occurrence for recurring payment
   */
  private async createNextOccurrence(payment: ScheduledPayment): Promise<void> {
    const nextDate = this.calculateNextDate(payment.scheduledAt, payment.recurringInterval!);

    // Check if next date is before end date
    if (payment.recurringEndDate && nextDate > payment.recurringEndDate) {
      this.logger.log(`Recurring payment ${payment.id} has reached end date`);
      return;
    }

    const nextPayment = this.scheduledRepository.create({
      creatorAddress: payment.creatorAddress,
      recipient: payment.recipient,
      recipientUsername: payment.recipientUsername,
      recipientName: payment.recipientName,
      amount: payment.amount,
      tokenSymbol: payment.tokenSymbol,
      scheduledAt: nextDate,
      recurringInterval: payment.recurringInterval,
      recurringEndDate: payment.recurringEndDate,
      description: payment.description,
      status: 'pending',
    });

    const saved = await this.scheduledRepository.save(nextPayment);
    this.logger.log(`Created next recurring payment ${saved.id} scheduled for ${nextDate}`);

    // Notify via WebSocket
    this.scheduledGateway.notifyPaymentCreated(saved);
  }

  /**
   * Calculate next date based on interval
   */
  private calculateNextDate(currentDate: Date, interval: RecurringInterval): Date {
    const date = new Date(currentDate);

    switch (interval) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
    }

    return date;
  }

  /**
   * Cron job: Check for upcoming payments and send reminders
   * Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkUpcomingPayments(): Promise<void> {
    this.logger.debug('Checking for upcoming scheduled payments...');

    const now = new Date();
    const reminderThreshold = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes

    // Find pending payments due within 15 minutes that haven't had reminders sent
    const upcomingPayments = await this.scheduledRepository.find({
      where: {
        status: 'pending',
        scheduledAt: LessThanOrEqual(reminderThreshold),
        reminderSent: false,
      },
    });

    for (const payment of upcomingPayments) {
      this.logger.log(`Sending reminder for payment ${payment.id}`);

      // Send reminder via WebSocket
      this.scheduledGateway.notifyPaymentReminder(payment);

      // Mark reminder as sent
      payment.reminderSent = true;
      await this.scheduledRepository.save(payment);
    }

    if (upcomingPayments.length > 0) {
      this.logger.log(`Sent ${upcomingPayments.length} payment reminders`);
    }
  }

  /**
   * Cron job: Mark overdue payments as failed
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async markOverduePayments(): Promise<void> {
    this.logger.debug('Checking for overdue payments...');

    const now = new Date();
    const overdueThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

    // Find pending payments that are more than 24 hours overdue
    const overduePayments = await this.scheduledRepository.find({
      where: {
        status: 'pending',
        scheduledAt: LessThanOrEqual(overdueThreshold),
      },
    });

    for (const payment of overduePayments) {
      this.logger.warn(`Marking payment ${payment.id} as failed (overdue)`);

      payment.status = 'failed';
      await this.scheduledRepository.save(payment);

      // Notify user
      this.scheduledGateway.notifyUser(
        payment.creatorAddress,
        'scheduled:failed',
        {
          payment,
          reason: 'Payment was not executed within 24 hours of scheduled time',
        },
      );
    }

    if (overduePayments.length > 0) {
      this.logger.log(`Marked ${overduePayments.length} payments as failed`);
    }
  }
}
