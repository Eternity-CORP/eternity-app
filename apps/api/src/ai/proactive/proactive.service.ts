/**
 * Proactive AI Service
 * Handles cron-based suggestion generation and delivery
 */

import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  AiSuggestion,
  SuggestionType,
  SuggestionPriority,
  SuggestionAction,
} from '../entities';
import { AiGateway } from '../ai.gateway';
import { ScheduledService } from '../../scheduled/scheduled.service';
import { UsernameService } from '../../username/username.service';
import { SupabaseService } from '../../supabase/supabase.service';

/**
 * Database row type (snake_case)
 */
interface AiSuggestionRow {
  id: string;
  user_address: string;
  type: SuggestionType;
  title: string;
  message: string;
  action: SuggestionAction | null;
  priority: SuggestionPriority;
  status: 'pending' | 'shown' | 'dismissed' | 'actioned';
  metadata: Record<string, unknown> | null;
  created_at: string;
  shown_at: string | null;
  dismissed_at: string | null;
  actioned_at: string | null;
  expires_at: string | null;
}

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
    private readonly supabase: SupabaseService,
    @Inject(forwardRef(() => AiGateway))
    private readonly aiGateway: AiGateway,
    @Inject(forwardRef(() => ScheduledService))
    private readonly scheduledService: ScheduledService,
    private readonly usernameService: UsernameService,
  ) {}

  /**
   * Create a new suggestion for a user
   */
  async createSuggestion(params: CreateSuggestionParams): Promise<AiSuggestion> {
    const { data, error } = await this.supabase
      .from('ai_suggestions')
      .insert({
        user_address: params.userAddress.toLowerCase(),
        type: params.type,
        title: params.title,
        message: params.message,
        priority: params.priority || 'low',
        action: params.action || null,
        metadata: params.metadata || null,
        expires_at: params.expiresAt || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create suggestion: ${error.message}`);
    }

    // Convert snake_case to camelCase
    const saved = this.mapToEntity(data);
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

    const { data, error } = await this.supabase
      .from('ai_suggestions')
      .select('*')
      .eq('user_address', userAddress.toLowerCase())
      .eq('status', 'pending')
      .or('expires_at.is.null,expires_at.gt.' + now.toISOString())
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      throw new Error(`Failed to get pending suggestions: ${error.message}`);
    }

    return data ? data.map((row) => this.mapToEntity(row)) : [];
  }

  /**
   * Mark suggestion as shown
   */
  async markAsShown(suggestionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('ai_suggestions')
      .update({
        status: 'shown',
        shown_at: new Date().toISOString(),
      })
      .eq('id', suggestionId);

    if (error) {
      throw new Error(`Failed to mark suggestion as shown: ${error.message}`);
    }
  }

  /**
   * Dismiss a suggestion
   */
  async dismissSuggestion(suggestionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('ai_suggestions')
      .update({
        status: 'dismissed',
        dismissed_at: new Date().toISOString(),
      })
      .eq('id', suggestionId);

    if (error) {
      throw new Error(`Failed to dismiss suggestion: ${error.message}`);
    }

    this.logger.log(`Dismissed suggestion ${suggestionId}`);
  }

  /**
   * Mark suggestion as actioned (user took the action)
   */
  async markAsActioned(suggestionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('ai_suggestions')
      .update({
        status: 'actioned',
        actioned_at: new Date().toISOString(),
      })
      .eq('id', suggestionId);

    if (error) {
      throw new Error(`Failed to mark suggestion as actioned: ${error.message}`);
    }

    this.logger.log(`Actioned suggestion ${suggestionId}`);
  }

  /**
   * Get suggestion by ID
   */
  async getSuggestionById(id: string): Promise<AiSuggestion | null> {
    const { data, error } = await this.supabase
      .from('ai_suggestions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get suggestion: ${error.message}`);
    }

    return data ? this.mapToEntity(data) : null;
  }

  /**
   * Clean up expired suggestions
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSuggestions(): Promise<void> {
    const now = new Date();

    const { data, error } = await this.supabase
      .from('ai_suggestions')
      .update({
        status: 'dismissed',
        dismissed_at: now.toISOString(),
      })
      .eq('status', 'pending')
      .lt('expires_at', now.toISOString())
      .select();

    if (error) {
      throw new Error(`Failed to cleanup expired suggestions: ${error.message}`);
    }

    if (data && data.length > 0) {
      this.logger.log(`Cleaned up ${data.length} expired suggestions`);
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

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Get all unique user addresses with pending payments in next 24 hours
    const { data, error } = await this.supabase
      .from('scheduled_payments')
      .select('creator_address')
      .eq('status', 'pending')
      .gt('scheduled_at', now.toISOString())
      .lte('scheduled_at', tomorrow.toISOString());

    if (error) {
      this.logger.error(`Failed to check payment reminders: ${error.message}`);
      return;
    }

    if (!data) return;

    // Get unique addresses
    const addressSet = new Set<string>();
    for (const row of data as { creator_address: string }[]) {
      addressSet.add(String(row.creator_address));
    }

    for (const address of addressSet) {
      await this.checkUserPaymentReminders(address);
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
      const { data: existingReminder } = await this.supabase
        .from('ai_suggestions')
        .select('*')
        .eq('user_address', userAddress.toLowerCase())
        .eq('type', 'payment_reminder')
        .contains('metadata', { paymentId: payment.id })
        .limit(1)
        .single();

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
    const { data: existingAlert } = await this.supabase
      .from('ai_suggestions')
      .select('*')
      .eq('user_address', userAddress.toLowerCase())
      .eq('type', 'security_alert')
      .contains('metadata', { txHash })
      .limit(1)
      .single();

    if (existingAlert) {
      this.logger.debug(`Already alerted for transaction ${txHash}`);
      return this.mapToEntity(existingAlert);
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

  // ========================================
  // Smart Suggestion Methods
  // ========================================

  /**
   * Suggest username setup for users who don't have one
   * Called when user makes transactions
   */
  async suggestUsernameSetup(userAddress: string, transactionCount: number): Promise<AiSuggestion | null> {
    // Only suggest after 5+ transactions
    if (transactionCount < 5) {
      return null;
    }

    // Check if user already has a username
    const existingUsername = await this.usernameService.lookupByAddress(userAddress);
    if (existingUsername) {
      return null;
    }

    // Check if we already suggested this
    const { data: existingSuggestion } = await this.supabase
      .from('ai_suggestions')
      .select('*')
      .eq('user_address', userAddress.toLowerCase())
      .eq('type', 'transaction_tip')
      .contains('metadata', { suggestionType: 'setup_username' })
      .limit(1)
      .single();

    if (existingSuggestion) {
      return null;
    }

    return this.createSuggestion({
      userAddress,
      type: 'transaction_tip',
      title: 'Создай @username',
      message: 'Друзьям будет проще отправлять тебе крипту!',
      priority: 'low',
      action: {
        label: 'Создать',
        route: '/profile/username',
        type: 'navigate',
        payload: { suggestionType: 'setup_username' },
      },
      metadata: { suggestionType: 'setup_username' },
    });
  }

  /**
   * Suggest adding frequent recipient to contacts
   * Called from frontend when pattern is detected
   */
  async suggestAddContact(params: {
    userAddress: string;
    recipientAddress: string;
    transactionCount: number;
  }): Promise<AiSuggestion | null> {
    const { userAddress, recipientAddress, transactionCount } = params;

    // Only suggest for 3+ transactions
    if (transactionCount < 3) {
      return null;
    }

    // Check if we already suggested this
    const { data: existingSuggestion } = await this.supabase
      .from('ai_suggestions')
      .select('*')
      .eq('user_address', userAddress.toLowerCase())
      .eq('type', 'transaction_tip')
      .contains('metadata', { recipientAddress: recipientAddress.toLowerCase() })
      .limit(1)
      .single();

    if (existingSuggestion) {
      return null;
    }

    // Format short address
    const shortAddress = `${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`;

    return this.createSuggestion({
      userAddress,
      type: 'transaction_tip',
      title: 'Добавить в контакты?',
      message: `Ты часто отправляешь на ${shortAddress}. Дать имя?`,
      priority: 'low',
      action: {
        label: 'Добавить',
        route: '/contacts/add',
        type: 'navigate',
        payload: { address: recipientAddress },
      },
      metadata: { recipientAddress: recipientAddress.toLowerCase(), suggestionType: 'add_contact' },
    });
  }

  /**
   * Map database row (snake_case) to entity (camelCase)
   */
  private mapToEntity(row: AiSuggestionRow): AiSuggestion {
    return {
      id: row.id,
      userAddress: row.user_address,
      type: row.type,
      title: row.title,
      message: row.message,
      action: row.action,
      priority: row.priority,
      status: row.status,
      metadata: row.metadata,
      createdAt: new Date(row.created_at),
      shownAt: row.shown_at ? new Date(row.shown_at) : null,
      dismissedAt: row.dismissed_at ? new Date(row.dismissed_at) : null,
      actionedAt: row.actioned_at ? new Date(row.actioned_at) : null,
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
    };
  }
}
