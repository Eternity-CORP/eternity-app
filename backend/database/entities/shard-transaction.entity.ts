import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

export enum ShardTransactionType {
  EARN = 'earn',
  // SPEND = 'spend', // Reserved for future use
}

export enum ShardReason {
  // Onboarding rewards (one-time)
  ONBOARD_PROFILE_CREATED = 'ONBOARD_PROFILE_CREATED',
  ONBOARD_FIRST_TX_SENT = 'ONBOARD_FIRST_TX_SENT',
  ONBOARD_FIRST_TX_RECEIVED = 'ONBOARD_FIRST_TX_RECEIVED',
  ONBOARD_FIRST_SCHEDULED_PAYMENT = 'ONBOARD_FIRST_SCHEDULED_PAYMENT',
  ONBOARD_FIRST_SPLIT_BILL = 'ONBOARD_FIRST_SPLIT_BILL',

  // Daily rewards (repeatable)
  DAILY_FIRST_SEND = 'DAILY_FIRST_SEND',
  DAILY_ADVANCED_FEATURE = 'DAILY_ADVANCED_FEATURE',
}

@Entity('shard_transactions')
@Index('idx_shard_tx_user_id', ['userId'])
@Index('idx_shard_tx_created_at', ['createdAt'])
@Index('idx_shard_tx_user_reason', ['userId', 'reason'])
export class ShardTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'int' })
  amount!: number;

  @Column({ type: 'varchar', length: 20 })
  type!: ShardTransactionType;

  @Column({ type: 'varchar', length: 50 })
  reason!: ShardReason;

  @Column({ type: 'jsonb', nullable: true })
  metaJson!: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
