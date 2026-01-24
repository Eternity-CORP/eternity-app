/**
 * Proactive AI Service
 * Handles cron-based suggestion generation and delivery
 */

import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, IsNull } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AiSuggestion,
  SuggestionType,
  SuggestionPriority,
  SuggestionAction,
} from '../entities';
import { AiGateway } from '../ai.gateway';
import { ScheduledService } from '../../scheduled/scheduled.service';

export interface CreateSuggestionParams {
  userAddress: string;
  type: SuggestionType;
  title: string;
  message: string;
  priority?: SuggestionPriority;
  action?: SuggestionAction;
  metadata?: Record<string, unknown>;
  expiresAt?: Date;
}

@Injectable()
export class ProactiveService {
  private readonly logger = new Logger(ProactiveService.name);

  constructor(
    @InjectRepository(AiSuggestion)
    private readonly suggestionRepository: Repository<AiSuggestion>,
    @Inject(forwardRef(() => AiGateway))
    private readonly aiGateway: AiGateway,
    @Inject(forwardRef(() => ScheduledService))
    private readonly scheduledService: ScheduledService,
  ) {}

  /**
   * Create a new suggestion for a user
   */
  async createSuggestion(params: CreateSuggestionParams): Promise<AiSuggestion> {
    const suggestion = this.suggestionRepository.create({
      userAddress: params.userAddress.toLowerCase(),
      type: params.type,
      title: params.title,
      message: params.message,
      priority: params.priority || 'low',
      action: params.action || null,
      metadata: params.metadata || null,
      expiresAt: params.expiresAt || null,
      status: 'pending',
    });

    const saved = await this.suggestionRepository.save(suggestion);
    this.logger.log(`Created suggestion ${saved.id} for ${params.userAddress}`);

    // Try to send via WebSocket immediately
    this.sendSuggestionToUser(saved);

    return saved;
  }

  /**
   * Get pending suggestions for a user
   */
  async getPendingSuggestions(userAddress: string): Promise<AiSuggestion[]> {
    const now = new Date();

    return this.suggestionRepository.find({
      where: [
        {
          userAddress: userAddress.toLowerCase(),
          status: 'pending',
          expiresAt: IsNull(),
        },
        {
          userAddress: userAddress.toLowerCase(),
          status: 'pending',
          expiresAt: MoreThan(now),
        },
      ],
      order: {
        priority: 'DESC',
        createdAt: 'DESC',
      },
      take: 10,
    });
  }

  /**
   * Mark suggestion as shown
   */
  async markAsShown(suggestionId: string): Promise<void> {
    await this.suggestionRepository.update(suggestionId, {
      status: 'shown',
      shownAt: new Date(),
    });
  }

  /**
   * Dismiss a suggestion
   */
  async dismissSuggestion(suggestionId: string): Promise<void> {
    await this.suggestionRepository.update(suggestionId, {
      status: 'dismissed',
      dismissedAt: new Date(),
    });
    this.logger.log(`Dismissed suggestion ${suggestionId}`);
  }

  /**
   * Mark suggestion as actioned (user took the action)
   */
  async markAsActioned(suggestionId: string): Promise<void> {
    await this.suggestionRepository.update(suggestionId, {
      status: 'actioned',
      actionedAt: new Date(),
    });
    this.logger.log(`Actioned suggestion ${suggestionId}`);
  }

  /**
   * Get suggestion by ID
   */
  async getSuggestionById(id: string): Promise<AiSuggestion | null> {
    return this.suggestionRepository.findOne({ where: { id } });
  }

  /**
   * Clean up expired suggestions
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSuggestions(): Promise<void> {
    const now = new Date();

    const result = await this.suggestionRepository.update(
      {
        status: 'pending',
        expiresAt: LessThan(now),
      },
      {
        status: 'dismissed',
        dismissedAt: now,
      },
    );

    if (result.affected && result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} expired suggestions`);
    }
  }

  /**
   * Send suggestion to user via WebSocket
   */
  private sendSuggestionToUser(suggestion: AiSuggestion): void {
    try {
      this.aiGateway.sendSuggestion(suggestion.userAddress, {
        id: suggestion.id,
        type: suggestion.type,
        title: suggestion.title,
        message: suggestion.message,
        priority: suggestion.priority,
        action: suggestion.action,
        createdAt: suggestion.createdAt,
      });
    } catch (error) {
      this.logger.debug(`User ${suggestion.userAddress} not connected, suggestion stored`);
    }
  }

  /**
   * Batch send pending suggestions to a user who just connected
   */
  async sendPendingSuggestionsToUser(userAddress: string): Promise<void> {
    const suggestions = await this.getPendingSuggestions(userAddress);

    for (const suggestion of suggestions) {
      this.sendSuggestionToUser(suggestion);
      await this.markAsShown(suggestion.id);
    }

    if (suggestions.length > 0) {
      this.logger.log(`Sent ${suggestions.length} pending suggestions to ${userAddress}`);
    }
  }

  /**
   * Check for upcoming scheduled payments and create reminders
   * Runs every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkPaymentReminders(): Promise<void> {
    this.logger.debug('Checking for upcoming payment reminders...');

    // Get all unique user addresses with pending payments in next 24 hours
    const result = await this.suggestionRepository.query(`
      SELECT DISTINCT creator_address
      FROM scheduled_payments
      WHERE status = 'pending'
        AND scheduled_at > NOW()
        AND scheduled_at <= NOW() + INTERVAL '24 hours'
    `);

    for (const row of result) {
      await this.checkUserPaymentReminders(row.creator_address);
    }
  }

  /**
   * Check payment reminders for a specific user
   */
  private async checkUserPaymentReminders(userAddress: string): Promise<void> {
    // Get payments due within 24 hours
    const upcoming = await this.scheduledService.findUpcoming(userAddress, 1);

    for (const payment of upcoming) {
      // Check if we already reminded for this payment
      const existingReminder = await this.suggestionRepository.findOne({
        where: {
          userAddress: userAddress.toLowerCase(),
          type: 'payment_reminder',
          metadata: { paymentId: payment.id } as any,
        },
      });

      if (existingReminder) continue;

      // Calculate hours until payment
      const now = new Date();
      const hoursUntil = Math.round(
        (payment.scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60),
      );

      // Determine recipient display name
      const recipientDisplay =
        payment.recipientName || payment.recipientUsername || payment.recipient;

      // Create reminder suggestion
      await this.createSuggestion({
        userAddress,
        type: 'payment_reminder',
        title: 'Запланированный платёж',
        message: `Через ${hoursUntil}ч: ${payment.amount} ${payment.tokenSymbol} → ${recipientDisplay}`,
        priority: 'medium',
        action: {
          label: 'Посмотреть',
          route: `/scheduled/${payment.id}`,
          type: 'navigate',
          payload: { paymentId: payment.id },
        },
        metadata: { paymentId: payment.id },
        expiresAt: payment.scheduledAt,
      });

      this.logger.log(`Created payment reminder for ${userAddress}, payment ${payment.id}`);
    }
  }

  // ========================================
  // Security Alert Methods
  // ========================================

  /**
   * Create security alert for large transaction
   * Called from frontend when a large transaction is detected
   */
  async createLargeTransactionAlert(params: {
    userAddress: string;
    txHash: string;
    amount: string;
    token: string;
    usdValue: number;
  }): Promise<AiSuggestion> {
    const { userAddress, txHash, amount, token, usdValue } = params;

    // Check if we already alerted for this transaction
    const existingAlert = await this.suggestionRepository.findOne({
      where: {
        userAddress: userAddress.toLowerCase(),
        type: 'security_alert',
        metadata: { txHash } as any,
      },
    });

    if (existingAlert) {
      this.logger.debug(`Already alerted for transaction ${txHash}`);
      return existingAlert;
    }

    return this.createSuggestion({
      userAddress,
      type: 'security_alert',
      title: 'Крупная транзакция',
      message: `Отправлено ${amount} ${token} (~$${usdValue.toFixed(0)})`,
      priority: 'high',
      action: {
        label: 'Посмотреть',
        route: `/transaction/${txHash}`,
        type: 'navigate',
        payload: { txHash },
      },
      metadata: { txHash, amount, token, usdValue },
    });
  }

  /**
   * Create security alert for suspicious activity
   */
  async createSecurityAlert(params: {
    userAddress: string;
    alertType: 'new_device' | 'failed_auth' | 'unusual_activity';
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<AiSuggestion> {
    const { userAddress, alertType, title, message, metadata } = params;

    return this.createSuggestion({
      userAddress,
      type: 'security_alert',
      title,
      message,
      priority: 'high',
      action: {
        label: 'Проверить',
        route: '/settings/security',
        type: 'navigate',
        payload: { alertType },
      },
      metadata: { alertType, ...metadata },
    });
  }
}
