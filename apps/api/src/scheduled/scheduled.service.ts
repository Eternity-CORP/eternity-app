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
import { JsonRpcProvider } from 'ethers';
import { ScheduledPayment, RecurringInterval } from './entities';
import { CreateScheduledDto, UpdateScheduledDto, ExecuteScheduledDto } from './dto';
import { ScheduledGateway } from './scheduled.gateway';
import { SupabaseService } from '../supabase/supabase.service';
import { ScheduledPaymentStatus } from './entities';

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

// Chain ID to RPC URL mapping (subset of commonly used chains)
const CHAIN_RPC_URLS: Record<number, string> = {
  // Mainnets
  1: 'https://eth-mainnet.g.alchemy.com/v2/', // Ethereum
  137: 'https://polygon-mainnet.g.alchemy.com/v2/', // Polygon
  10: 'https://opt-mainnet.g.alchemy.com/v2/', // Optimism
  42161: 'https://arb-mainnet.g.alchemy.com/v2/', // Arbitrum
  8453: 'https://base-mainnet.g.alchemy.com/v2/', // Base
  // Testnets (public RPCs — Alchemy 500s from Railway)
  11155111: 'https://ethereum-sepolia-rpc.publicnode.com', // Sepolia
  80002: 'https://polygon-amoy.g.alchemy.com/v2/', // Amoy
  11155420: 'https://opt-sepolia.g.alchemy.com/v2/', // Optimism Sepolia
  421614: 'https://arb-sepolia.g.alchemy.com/v2/', // Arbitrum Sepolia
  84532: 'https://base-sepolia.g.alchemy.com/v2/', // Base Sepolia
};

// Gas price increase threshold (50%)
const GAS_PRICE_THRESHOLD_PERCENT = 150n;

@Injectable()
export class ScheduledService {
  private readonly logger = new Logger(ScheduledService.name);
  private readonly providerCache: Map<number, JsonRpcProvider> = new Map();
  private readonly alchemyApiKey: string;

  constructor(
    private readonly supabaseService: SupabaseService,
    @Inject(forwardRef(() => ScheduledGateway))
    private readonly scheduledGateway: ScheduledGateway,
    private readonly configService: ConfigService,
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

    if (payment.status !== 'pending') {
      throw new BadRequestException('Can only update pending payments');
    }

    // Build update object
    const updateData: any = {};
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

    if (payment.status !== 'pending') {
      throw new BadRequestException('Payment is not pending');
    }

    const { data, error } = await this.supabaseService
      .from('scheduled_payments')
      .update({
        status: 'executed',
        executed_tx_hash: dto.txHash,
        executed_at: new Date().toISOString(),
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
   * Create next occurrence for recurring payment
   */
  private async createNextOccurrence(payment: ScheduledPayment): Promise<void> {
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
   * Cron job: Auto-execute pre-signed scheduled payments
   * Runs every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async executeScheduledPayments(): Promise<void> {
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

      // If gas price increased more than 50%, mark as failed
      if (currentGasPrice > (estimatedGas * GAS_PRICE_THRESHOLD_PERCENT) / 100n) {
        this.logger.warn(`Gas price too high for payment ${payment.id}`);
        await this.supabaseService
          .from('scheduled_payments')
          .update({
            status: 'failed',
            failure_reason: `Gas price increased significantly (from ${estimatedGas.toString()} to ${currentGasPrice.toString()} wei)`,
          })
          .eq('id', payment.id);
        this.scheduledGateway.notifyUser(payment.creatorAddress, 'scheduled:failed', {
          payment,
          reason: 'Gas price increased more than 50% since signing',
        });
        return;
      }

      // Broadcast the signed transaction
      const txResponse = await provider.broadcastTransaction(payment.signedTransaction);
      this.logger.log(`Transaction broadcast: ${txResponse.hash}`);

      // Wait for confirmation (with timeout)
      const receipt = await Promise.race([
        txResponse.wait(),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Transaction confirmation timeout')), 120000),
        ),
      ]);

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

      // Notify user
      this.scheduledGateway.notifyPaymentExecuted(payment);

      // Handle recurring payments - need to create next occurrence
      // Note: Recurring payments will need to be re-signed by the user
      if (payment.recurringInterval) {
        await this.createNextRecurringPayment(payment);
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
    }
  }

  /**
   * Create next occurrence for recurring payment (without signed tx)
   * User will need to re-sign the transaction
   */
  private async createNextRecurringPayment(payment: ScheduledPayment): Promise<void> {
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
        // Note: No signed transaction - user needs to re-sign
        // This is important because nonce and gas prices will have changed
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create next recurring payment: ${error.message}`);
      return;
    }

    const saved = this.mapToEntity(data);
    this.logger.log(`Created next recurring payment ${saved.id} scheduled for ${nextDate} (requires re-signing)`);

    // Notify via WebSocket that a new recurring payment was created and needs signing
    this.scheduledGateway.notifyPaymentCreated(saved);
    this.scheduledGateway.notifyUser(payment.creatorAddress, 'scheduled:needs_signing', {
      payment: saved,
      reason: 'Recurring payment created - please sign the transaction',
    });
  }
}
