import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JsonRpcProvider, Transaction } from 'ethers';
import { ScheduledPayment, RecurringInterval, ScheduledPaymentStatus } from './entities';
import { CreateScheduledDto, UpdateScheduledDto, ExecuteScheduledDto } from './dto';
import { ScheduledGateway } from './scheduled.gateway';
import { SupabaseService } from '../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CHAIN_RPC_URLS } from '@e-y/shared';

/**
 * Database row type (snake_case)
 */
interface ScheduledPaymentRow {
  id: string;
  creator_address: string;
  recipient: string;
  recipient_username: string | null;
  recipient_name: string | null;
  amount: string;
  token_symbol: string;
  scheduled_at: string;
  recurring_interval: RecurringInterval | null;
  recurring_end_date: string | null;
  description: string | null;
  status: ScheduledPaymentStatus;
  executed_tx_hash: string | null;
  executed_at: string | null;
  reminder_sent: boolean;
  signed_transaction: string | null;
  estimated_gas_price: string | null;
  nonce: number | null;
  chain_id: number | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

// Gas price increase threshold (50%)
const GAS_PRICE_THRESHOLD_PERCENT = 150n;

@Injectable()
export class ScheduledService {
  private readonly logger = new Logger(ScheduledService.name);
  private readonly providerCache: Map<number, JsonRpcProvider> = new Map();
  private readonly alchemyApiKey: string;
  private isExecuting = false;

  constructor(
    private readonly supabaseService: SupabaseService,
    @Inject(forwardRef(() => ScheduledGateway))
    private readonly scheduledGateway: ScheduledGateway,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.alchemyApiKey = this.configService.get<string>('ALCHEMY_API_KEY') || '';
  }

  /**
   * Map Supabase row (snake_case) to entity (camelCase)
   */
  private mapToEntity(row: ScheduledPaymentRow): ScheduledPayment {
    return {
      id: row.id,
      creatorAddress: row.creator_address,
      recipient: row.recipient,
      recipientUsername: row.recipient_username,
      recipientName: row.recipient_name,
      amount: row.amount,
      tokenSymbol: row.token_symbol,
      scheduledAt: new Date(row.scheduled_at),
      recurringInterval: row.recurring_interval,
      recurringEndDate: row.recurring_end_date ? new Date(row.recurring_end_date) : null,
      description: row.description,
      status: row.status,
      executedTxHash: row.executed_tx_hash,
      executedAt: row.executed_at ? new Date(row.executed_at) : null,
      reminderSent: row.reminder_sent,
      signedTransaction: row.signed_transaction,
      estimatedGasPrice: row.estimated_gas_price,
      nonce: row.nonce,
      chainId: row.chain_id,
      failureReason: row.failure_reason,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Get or create provider for a chain
   */
  private getProvider(chainId: number): JsonRpcProvider {
    if (this.providerCache.has(chainId)) {
      return this.providerCache.get(chainId)!;
    }

    const baseUrl = CHAIN_RPC_URLS[chainId];
    if (!baseUrl) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const rpcUrl = baseUrl.includes('alchemy.com') ? baseUrl + this.alchemyApiKey : baseUrl;
    const provider = new JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
    this.providerCache.set(chainId, provider);

    return provider;
  }

  async create(dto: CreateScheduledDto): Promise<ScheduledPayment> {
    this.logger.log(`Creating scheduled payment for ${dto.creatorAddress}`);

    const { data, error } = await this.supabaseService
      .from('scheduled_payments')
      .insert({
        creator_address: dto.creatorAddress.toLowerCase(),
        recipient: dto.recipient.toLowerCase(),
        recipient_username: dto.recipientUsername,
        recipient_name: dto.recipientName,
        amount: dto.amount,
        token_symbol: dto.tokenSymbol,
        scheduled_at: new Date(dto.scheduledAt).toISOString(),
        recurring_interval: dto.recurringInterval,
        recurring_end_date: dto.recurringEndDate ? new Date(dto.recurringEndDate).toISOString() : null,
        description: dto.description,
        status: 'pending',
        signed_transaction: dto.signedTransaction || null,
        estimated_gas_price: dto.estimatedGasPrice || null,
        nonce: dto.nonce ?? null,
        chain_id: dto.chainId ?? null,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create scheduled payment: ${error.message}`);
      throw new BadRequestException(`Failed to create scheduled payment: ${error.message}`);
    }

    const saved = this.mapToEntity(data);
    this.logger.log(`Scheduled payment created: ${saved.id}`);

    // Notify via WebSocket
    this.scheduledGateway.notifyPaymentCreated(saved);

    return saved;
  }

  async findById(id: string): Promise<ScheduledPayment> {
    const { data, error } = await this.supabaseService
      .from('scheduled_payments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Scheduled payment ${id} not found`);
    }

    return this.mapToEntity(data);
  }

  async findByCreator(creatorAddress: string): Promise<ScheduledPayment[]> {
    const normalizedAddress = creatorAddress.toLowerCase();
    this.logger.debug(`findByCreator: querying for creator_address=${normalizedAddress}`);

    const { data, error } = await this.supabaseService
      .from('scheduled_payments')
      .select('*')
      .eq('creator_address', normalizedAddress)
      .order('scheduled_at', { ascending: true });

    if (error) {
      this.logger.error(`findByCreator failed: ${error.message} (code: ${error.code}, details: ${error.details})`);
      throw new BadRequestException(`Failed to query scheduled payments: ${error.message}`);
    }

    this.logger.debug(`findByCreator: found ${data?.length || 0} payments for ${normalizedAddress}`);
    return (data || []).map(item => this.mapToEntity(item));
  }

  async findByRecipient(recipientAddress: string): Promise<ScheduledPayment[]> {
    const normalizedAddress = recipientAddress.toLowerCase();
    this.logger.debug(`findByRecipient: querying for recipient=${normalizedAddress}`);

    const { data, error } = await this.supabaseService
      .from('scheduled_payments')
      .select('*')
      .eq('recipient', normalizedAddress)
      .in('status', ['pending', 'executed'])
      .order('scheduled_at', { ascending: true });

    if (error) {
      this.logger.error(`findByRecipient failed: ${error.message} (code: ${error.code})`);
      throw new BadRequestException(`Failed to query incoming payments: ${error.message}`);
    }

    this.logger.debug(`findByRecipient: found ${data?.length || 0} payments for ${normalizedAddress}`);
    return (data || []).map(item => this.mapToEntity(item));
  }

  async findPending(creatorAddress: string): Promise<ScheduledPayment[]> {
    const normalizedAddress = creatorAddress.toLowerCase();
    this.logger.debug(`findPending: querying for creator_address=${normalizedAddress}`);

    const { data, error } = await this.supabaseService
      .from('scheduled_payments')
      .select('*')
      .eq('creator_address', normalizedAddress)
      .eq('status', 'pending')
      .order('scheduled_at', { ascending: true });

    if (error) {
      this.logger.error(`findPending failed: ${error.message} (code: ${error.code})`);
      throw new BadRequestException(`Failed to query pending payments: ${error.message}`);
    }

    this.logger.debug(`findPending: found ${data?.length || 0} pending payments for ${normalizedAddress}`);
    return (data || []).map(item => this.mapToEntity(item));
  }

  async findUpcoming(creatorAddress: string, days: number = 7): Promise<ScheduledPayment[]> {
    const normalizedAddress = creatorAddress.toLowerCase();
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    this.logger.debug(`findUpcoming: querying for creator_address=${normalizedAddress}, days=${days}`);

    const { data, error } = await this.supabaseService
      .from('scheduled_payments')
      .select('*')
      .eq('creator_address', normalizedAddress)
      .eq('status', 'pending')
      .lte('scheduled_at', futureDate.toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) {
      this.logger.error(`findUpcoming failed: ${error.message} (code: ${error.code})`);
      throw new BadRequestException(`Failed to query upcoming payments: ${error.message}`);
    }

    this.logger.debug(`findUpcoming: found ${data?.length || 0} upcoming payments for ${normalizedAddress}`);
    return (data || []).map(item => this.mapToEntity(item));
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

    if (payment.status !== 'pending' && payment.status !== 'needs_resigning') {
      throw new BadRequestException('Can only update pending or needs_resigning payments');
    }

    // Build update object
    const updateData: Partial<Omit<ScheduledPaymentRow, 'id' | 'creator_address' | 'created_at' | 'updated_at'>> = {};
    if (dto.recipient) updateData.recipient = dto.recipient.toLowerCase();
    if (dto.recipientUsername !== undefined) updateData.recipient_username = dto.recipientUsername;
    if (dto.recipientName !== undefined) updateData.recipient_name = dto.recipientName;
    if (dto.amount) updateData.amount = dto.amount;
    if (dto.tokenSymbol) updateData.token_symbol = dto.tokenSymbol;
    if (dto.scheduledAt) {
      updateData.scheduled_at = new Date(dto.scheduledAt).toISOString();
      updateData.reminder_sent = false; // Reset reminder if schedule changed
    }
    if (dto.recurringInterval !== undefined) updateData.recurring_interval = dto.recurringInterval;
    if (dto.recurringEndDate !== undefined) {
      updateData.recurring_end_date = dto.recurringEndDate ? new Date(dto.recurringEndDate).toISOString() : null;
    }
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.signedTransaction !== undefined) updateData.signed_transaction = dto.signedTransaction;
    if (dto.estimatedGasPrice !== undefined) updateData.estimated_gas_price = dto.estimatedGasPrice;
    if (dto.nonce !== undefined) updateData.nonce = dto.nonce;
    if (dto.chainId !== undefined) updateData.chain_id = dto.chainId;

    // If payment was needs_resigning and user provides a new signed tx, move back to pending
    if (payment.status === 'needs_resigning' && dto.signedTransaction) {
      updateData.status = 'pending';
      updateData.failure_reason = null;
    }

    const { data, error } = await this.supabaseService
      .from('scheduled_payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update scheduled payment: ${error.message}`);
      throw new BadRequestException(`Failed to update scheduled payment: ${error.message}`);
    }

    const updated = this.mapToEntity(data);

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

    if (payment.status !== 'pending' && payment.status !== 'needs_resigning') {
      throw new BadRequestException('Payment is not in an executable state');
    }

    const { data, error } = await this.supabaseService
      .from('scheduled_payments')
      .update({
        status: 'executed',
        executed_tx_hash: dto.txHash,
        executed_at: new Date().toISOString(),
        failure_reason: null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to execute scheduled payment: ${error.message}`);
      throw new BadRequestException(`Failed to execute scheduled payment: ${error.message}`);
    }

    const executed = this.mapToEntity(data);

    this.logger.log(`Scheduled payment ${id} executed with tx ${dto.txHash}`);

    // Notify via WebSocket
    this.scheduledGateway.notifyPaymentExecuted(executed);

    // If recurring, create next occurrence
    if (payment.recurringInterval) {
      await this.createNextRecurrence(payment);
    }

    return executed;
  }

  async cancel(id: string, requesterAddress: string): Promise<ScheduledPayment> {
    const payment = await this.findById(id);

    if (payment.creatorAddress.toLowerCase() !== requesterAddress.toLowerCase()) {
      throw new BadRequestException('Only creator can cancel scheduled payment');
    }

    if (payment.status !== 'pending' && payment.status !== 'needs_resigning') {
      throw new BadRequestException('Can only cancel pending or needs_resigning payments');
    }

    const { data, error } = await this.supabaseService
      .from('scheduled_payments')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to cancel scheduled payment: ${error.message}`);
      throw new BadRequestException(`Failed to cancel scheduled payment: ${error.message}`);
    }

    const cancelled = this.mapToEntity(data);

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

    const { error } = await this.supabaseService
      .from('scheduled_payments')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete scheduled payment: ${error.message}`);
      throw new BadRequestException(`Failed to delete scheduled payment: ${error.message}`);
    }

    this.logger.log(`Scheduled payment ${id} deleted`);
  }

  /**
   * Create next occurrence for recurring payment.
   * @param notifyNeedsSigning - if true, also sends a 'scheduled:needs_signing' WS event
   */
  private async createNextRecurrence(
    payment: ScheduledPayment,
    options: { notifyNeedsSigning: boolean } = { notifyNeedsSigning: false },
  ): Promise<void> {
    const nextDate = this.calculateNextDate(payment.scheduledAt, payment.recurringInterval!);

    // Check if next date is before end date
    if (payment.recurringEndDate && nextDate > payment.recurringEndDate) {
      this.logger.log(`Recurring payment ${payment.id} has reached end date`);
      return;
    }

    const { data, error } = await this.supabaseService
      .from('scheduled_payments')
      .insert({
        creator_address: payment.creatorAddress,
        recipient: payment.recipient,
        recipient_username: payment.recipientUsername,
        recipient_name: payment.recipientName,
        amount: payment.amount,
        token_symbol: payment.tokenSymbol,
        scheduled_at: nextDate.toISOString(),
        recurring_interval: payment.recurringInterval,
        recurring_end_date: payment.recurringEndDate ? payment.recurringEndDate.toISOString() : null,
        description: payment.description,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create next recurring payment: ${error.message}`);
      return;
    }

    const saved = this.mapToEntity(data);
    const suffix = options.notifyNeedsSigning ? ' (requires re-signing)' : '';
    this.logger.log(`Created next recurring payment ${saved.id} scheduled for ${nextDate}${suffix}`);

    // Notify via WebSocket
    this.scheduledGateway.notifyPaymentCreated(saved);

    if (options.notifyNeedsSigning) {
      this.scheduledGateway.notifyUser(payment.creatorAddress, 'scheduled:needs_signing', {
        payment: saved,
        reason: 'Recurring payment created - please sign the transaction',
      });
    }
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
    const { data, error } = await this.supabaseService
      .from('scheduled_payments')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', reminderThreshold.toISOString())
      .eq('reminder_sent', false);

    if (error) {
      this.logger.error(`Failed to fetch upcoming payments: ${error.message}`);
      return;
    }

    const upcomingPayments = (data || []).map(item => this.mapToEntity(item));

    for (const payment of upcomingPayments) {
      this.logger.log(`Sending reminder for payment ${payment.id}`);

      // Send reminder via WebSocket
      this.scheduledGateway.notifyPaymentReminder(payment);

      // Send push notification reminder (non-blocking)
      this.notificationsService.sendScheduledReminderNotification(
        payment.creatorAddress,
        payment.recipient,
        payment.amount,
        payment.tokenSymbol,
        payment.id,
      ).catch((err) => {
        this.logger.warn(`Failed to send scheduled reminder push notification: ${err.message}`);
      });

      // Mark reminder as sent
      await this.supabaseService
        .from('scheduled_payments')
        .update({ reminder_sent: true })
        .eq('id', payment.id);
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
    const { data, error } = await this.supabaseService
      .from('scheduled_payments')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', overdueThreshold.toISOString());

    if (error) {
      this.logger.error(`Failed to fetch overdue payments: ${error.message}`);
      return;
    }

    const overduePayments = (data || []).map(item => this.mapToEntity(item));

    for (const payment of overduePayments) {
      this.logger.warn(`Marking payment ${payment.id} as failed (overdue)`);

      await this.supabaseService
        .from('scheduled_payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);

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

  /**
   * Cron job: Check pending_confirmation transactions and resolve their status
   * Runs every 2 minutes
   */
  @Cron('*/2 * * * *')
  async checkPendingConfirmations(): Promise<void> {
    this.logger.debug('Checking pending_confirmation payments...');

    const { data, error } = await this.supabaseService
      .from('scheduled_payments')
      .select('*')
      .eq('status', 'pending_confirmation');

    if (error) {
      this.logger.error(`Failed to fetch pending_confirmation payments: ${error.message}`);
      return;
    }

    const pendingPayments = (data || []).map(item => this.mapToEntity(item));

    for (const payment of pendingPayments) {
      if (!payment.executedTxHash || !payment.chainId) {
        // Should not happen, but mark as failed if no tx hash
        this.logger.error(
          `pending_confirmation payment ${payment.id} has no tx hash or chain ID`,
        );
        await this.supabaseService
          .from('scheduled_payments')
          .update({
            status: 'failed',
            failure_reason: 'Missing transaction hash for confirmation check',
          })
          .eq('id', payment.id);
        continue;
      }

      try {
        const provider = this.getProvider(payment.chainId);
        const receipt = await provider.getTransactionReceipt(payment.executedTxHash);

        if (receipt && receipt.status === 1) {
          // Confirmed successfully
          await this.supabaseService
            .from('scheduled_payments')
            .update({
              status: 'executed',
              executed_at: new Date().toISOString(),
              failure_reason: null,
            })
            .eq('id', payment.id);

          payment.status = 'executed';
          payment.executedAt = new Date();
          payment.failureReason = null;

          this.logger.log(
            `Payment ${payment.id} confirmed on-chain (tx: ${payment.executedTxHash})`,
          );
          this.scheduledGateway.notifyPaymentExecuted(payment);

          // Handle recurring
          if (payment.recurringInterval) {
            await this.createNextRecurrence(payment, { notifyNeedsSigning: true });
          }
        } else if (receipt && receipt.status === 0) {
          // Reverted on-chain
          await this.supabaseService
            .from('scheduled_payments')
            .update({
              status: 'failed',
              failure_reason: `Transaction reverted on-chain (tx: ${payment.executedTxHash})`,
            })
            .eq('id', payment.id);

          this.scheduledGateway.notifyUser(payment.creatorAddress, 'scheduled:failed', {
            payment,
            reason: `Transaction reverted on-chain (tx: ${payment.executedTxHash})`,
          });
        } else {
          // Still pending — check if it's been too long (> 30 minutes)
          const updatedAt = payment.updatedAt.getTime();
          const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;

          if (updatedAt < thirtyMinutesAgo) {
            this.logger.warn(
              `Payment ${payment.id} tx ${payment.executedTxHash} has been pending_confirmation for >30min, marking failed`,
            );
            await this.supabaseService
              .from('scheduled_payments')
              .update({
                status: 'failed',
                failure_reason: `Transaction ${payment.executedTxHash} was not confirmed within 30 minutes`,
              })
              .eq('id', payment.id);

            this.scheduledGateway.notifyUser(payment.creatorAddress, 'scheduled:failed', {
              payment,
              reason: 'Transaction was not confirmed within 30 minutes and may have been dropped',
            });
          }
          // else: still within 30min window, keep waiting
        }
      } catch (checkError) {
        this.logger.error(
          `Error checking confirmation for payment ${payment.id}:`,
          checkError,
        );
        // Don't mark as failed — we'll retry next cron cycle
      }
    }
  }

  /**
   * Cron job: Auto-execute pre-signed scheduled payments
   * Runs every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async executeScheduledPayments(): Promise<void> {
    // Bug 3 fix: concurrency guard — skip if previous run is still executing
    if (this.isExecuting) {
      this.logger.warn('Previous executeScheduledPayments run still in progress, skipping');
      return;
    }

    this.isExecuting = true;
    try {
      this.logger.debug('Checking for payments to execute...');

      const now = new Date();

      // Find pending payments with signed transactions that are due
      const { data, error } = await this.supabaseService
        .from('scheduled_payments')
        .select('*')
        .eq('status', 'pending')
        .not('signed_transaction', 'is', null)
        .lte('scheduled_at', now.toISOString());

      if (error) {
        this.logger.error(`Failed to fetch due payments: ${error.message}`);
        return;
      }

      const duePayments = (data || []).map(item => this.mapToEntity(item));

      if (duePayments.length === 0) {
        return;
      }

      this.logger.log(`Found ${duePayments.length} payments to execute`);

      for (const payment of duePayments) {
        await this.executeSignedTransaction(payment);
      }
    } finally {
      this.isExecuting = false;
    }
  }

  /**
   * Execute a pre-signed transaction for a scheduled payment
   */
  private async executeSignedTransaction(payment: ScheduledPayment): Promise<void> {
    try {
      this.logger.log(`Executing payment ${payment.id} on chain ${payment.chainId}`);

      if (!payment.chainId || !payment.signedTransaction || !payment.estimatedGasPrice) {
        this.logger.error(`Payment ${payment.id} missing required fields for execution`);
        await this.supabaseService
          .from('scheduled_payments')
          .update({
            status: 'failed',
            failure_reason: 'Missing signed transaction data',
          })
          .eq('id', payment.id);
        return;
      }

      const provider = this.getProvider(payment.chainId);

      // --- Bug 1 fix: Verify nonce before broadcast ---
      const parsedTx = Transaction.from(payment.signedTransaction);
      const senderAddress = parsedTx.from;

      if (senderAddress && parsedTx.nonce !== null && parsedTx.nonce !== undefined) {
        const currentNonce = await provider.getTransactionCount(senderAddress, 'pending');

        if (parsedTx.nonce < currentNonce) {
          // Nonce already used — the user made another tx since signing
          this.logger.warn(
            `Stale nonce for payment ${payment.id}: tx nonce=${parsedTx.nonce}, current=${currentNonce}`,
          );
          await this.supabaseService
            .from('scheduled_payments')
            .update({
              status: 'needs_resigning' as ScheduledPaymentStatus,
              failure_reason: `Stale nonce: transaction nonce ${parsedTx.nonce} is behind current nonce ${currentNonce}. Please re-sign.`,
              signed_transaction: null,
              nonce: null,
              estimated_gas_price: null,
            })
            .eq('id', payment.id);

          this.scheduledGateway.notifyUser(payment.creatorAddress, 'scheduled:needs_signing', {
            payment: { ...payment, status: 'needs_resigning' as ScheduledPaymentStatus },
            reason: `Transaction nonce is stale (expected ${currentNonce}, got ${parsedTx.nonce}). Please re-sign the transaction.`,
          });
          return;
        }

        if (parsedTx.nonce > currentNonce) {
          // Nonce is ahead — there are pending txs that need to confirm first
          this.logger.warn(
            `Nonce gap for payment ${payment.id}: tx nonce=${parsedTx.nonce}, current=${currentNonce}. Skipping for now.`,
          );
          // Don't mark as failed — just skip this cycle, the gap may close
          return;
        }
      }

      // Check current gas price vs estimated
      const currentFeeData = await provider.getFeeData();
      const currentGasPrice = currentFeeData.gasPrice;

      if (!currentGasPrice) {
        this.logger.error(`Failed to fetch current gas price for payment ${payment.id}`);
        await this.supabaseService
          .from('scheduled_payments')
          .update({
            status: 'failed',
            failure_reason: 'Unable to fetch current gas price',
          })
          .eq('id', payment.id);
        this.scheduledGateway.notifyUser(payment.creatorAddress, 'scheduled:failed', {
          payment,
          reason: 'Unable to fetch current gas price',
        });
        return;
      }

      const estimatedGas = BigInt(payment.estimatedGasPrice);

      // If gas price increased more than 50%, mark as needs_resigning (not failed)
      if (currentGasPrice > (estimatedGas * GAS_PRICE_THRESHOLD_PERCENT) / 100n) {
        this.logger.warn(`Gas price too high for payment ${payment.id}`);
        await this.supabaseService
          .from('scheduled_payments')
          .update({
            status: 'needs_resigning' as ScheduledPaymentStatus,
            failure_reason: `Gas price increased significantly (from ${estimatedGas.toString()} to ${currentGasPrice.toString()} wei). Please re-sign.`,
            signed_transaction: null,
            nonce: null,
            estimated_gas_price: null,
          })
          .eq('id', payment.id);
        this.scheduledGateway.notifyUser(payment.creatorAddress, 'scheduled:needs_signing', {
          payment: { ...payment, status: 'needs_resigning' as ScheduledPaymentStatus },
          reason: 'Gas price increased more than 50% since signing. Please re-sign the transaction.',
        });
        return;
      }

      // Broadcast the signed transaction
      const txResponse = await provider.broadcastTransaction(payment.signedTransaction);
      this.logger.log(`Transaction broadcast: ${txResponse.hash}`);

      // --- Bug 2 fix: Improved timeout handling ---
      // Wait for confirmation (with timeout)
      let receipt: Awaited<ReturnType<typeof txResponse.wait>> | null = null;
      let timedOut = false;

      try {
        receipt = await Promise.race([
          txResponse.wait(),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('TX_CONFIRMATION_TIMEOUT')), 120000),
          ),
        ]);
      } catch (waitError) {
        const isTimeout =
          waitError instanceof Error && waitError.message === 'TX_CONFIRMATION_TIMEOUT';

        if (isTimeout) {
          timedOut = true;
          this.logger.warn(
            `Timeout waiting for confirmation of payment ${payment.id}, tx ${txResponse.hash}. Checking on-chain status...`,
          );
        } else {
          // Re-throw non-timeout errors (e.g., tx reverted)
          throw waitError;
        }
      }

      // If timed out, check the transaction status on-chain before deciding
      if (timedOut) {
        const txReceipt = await provider.getTransactionReceipt(txResponse.hash);

        if (txReceipt && txReceipt.status === 1) {
          // Transaction actually confirmed successfully
          this.logger.log(
            `Payment ${payment.id} tx ${txResponse.hash} confirmed on-chain despite timeout`,
          );
          receipt = txReceipt;
        } else if (txReceipt && txReceipt.status === 0) {
          // Transaction reverted on-chain
          throw new Error(`Transaction reverted on-chain (tx: ${txResponse.hash})`);
        } else {
          // Still pending — mark as pending_confirmation so we don't re-broadcast
          this.logger.log(
            `Payment ${payment.id} tx ${txResponse.hash} still pending on-chain, marking as pending_confirmation`,
          );
          await this.supabaseService
            .from('scheduled_payments')
            .update({
              status: 'pending_confirmation' as ScheduledPaymentStatus,
              executed_tx_hash: txResponse.hash,
              failure_reason: 'Transaction broadcast but awaiting confirmation',
            })
            .eq('id', payment.id);

          this.scheduledGateway.notifyUser(
            payment.creatorAddress,
            'scheduled:pending_confirmation',
            {
              payment: {
                ...payment,
                status: 'pending_confirmation' as ScheduledPaymentStatus,
                executedTxHash: txResponse.hash,
              },
              reason: 'Transaction was broadcast but confirmation is taking longer than expected',
            },
          );
          return;
        }
      }

      if (!receipt) {
        throw new Error('Transaction confirmation failed');
      }

      // Update payment status
      await this.supabaseService
        .from('scheduled_payments')
        .update({
          status: 'executed',
          executed_tx_hash: receipt.hash,
          executed_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      payment.status = 'executed';
      payment.executedTxHash = receipt.hash;
      payment.executedAt = new Date();

      this.logger.log(`Payment ${payment.id} executed successfully with tx ${receipt.hash}`);

      // Notify user via WebSocket
      this.scheduledGateway.notifyPaymentExecuted(payment);

      // Send push notification for successful execution (non-blocking)
      this.notificationsService.sendScheduledExecutedNotification(
        payment.creatorAddress,
        payment.recipient,
        payment.amount,
        payment.tokenSymbol,
        receipt.hash,
      ).catch((err) => {
        this.logger.warn(`Failed to send scheduled executed push notification: ${err.message}`);
      });

      // Handle recurring payments - need to create next occurrence
      // Note: Recurring payments will need to be re-signed by the user
      if (payment.recurringInterval) {
        await this.createNextRecurrence(payment, { notifyNeedsSigning: true });
      }
    } catch (error) {
      this.logger.error(`Failed to execute payment ${payment.id}:`, error);

      const failureReason = error instanceof Error ? error.message : 'Unknown error';

      await this.supabaseService
        .from('scheduled_payments')
        .update({
          status: 'failed',
          failure_reason: failureReason,
        })
        .eq('id', payment.id);

      payment.status = 'failed';
      payment.failureReason = failureReason;

      this.scheduledGateway.notifyUser(payment.creatorAddress, 'scheduled:failed', {
        payment,
        reason: failureReason,
      });

      // Send push notification for failure (non-blocking)
      this.notificationsService.sendScheduledFailedNotification(
        payment.creatorAddress,
        payment.recipient,
        payment.amount,
        payment.tokenSymbol,
        failureReason,
        payment.id,
      ).catch((err) => {
        this.logger.warn(`Failed to send scheduled failed push notification: ${err.message}`);
      });
    }
  }

}
