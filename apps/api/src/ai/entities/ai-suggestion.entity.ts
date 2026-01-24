/**
 * AI Suggestion Entity
 * Stores proactive suggestions for users
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type SuggestionType =
  | 'payment_reminder'
  | 'security_alert'
  | 'transaction_tip'
  | 'savings_tip'
  | 'contact_suggestion';

export type SuggestionPriority = 'low' | 'medium' | 'high';

export type SuggestionStatus = 'pending' | 'shown' | 'dismissed' | 'actioned';

export interface SuggestionAction {
  label: string;
  route?: string;
  type?: string;
  payload?: Record<string, unknown>;
}

@Entity('ai_suggestions')
@Index(['userAddress', 'status'])
@Index(['userAddress', 'createdAt'])
export class AiSuggestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_address', length: 42 })
  @Index()
  userAddress: string;

  @Column({ type: 'varchar', length: 50 })
  type: SuggestionType;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  action: SuggestionAction | null;

  @Column({ type: 'varchar', length: 20, default: 'low' })
  priority: SuggestionPriority;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: SuggestionStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'shown_at', type: 'timestamp', nullable: true })
  shownAt: Date | null;

  @Column({ name: 'dismissed_at', type: 'timestamp', nullable: true })
  dismissedAt: Date | null;

  @Column({ name: 'actioned_at', type: 'timestamp', nullable: true })
  actionedAt: Date | null;

  @Column({ name: 'expires_at', type: 'timestamp', nullable: true })
  expiresAt: Date | null;
}
