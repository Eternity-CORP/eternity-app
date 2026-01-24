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
}
