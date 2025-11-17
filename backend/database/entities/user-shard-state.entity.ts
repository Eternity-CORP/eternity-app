import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_shard_states')
export class UserShardState {
  @PrimaryColumn('uuid')
  userId!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'int', default: 0 })
  totalShards!: number;

  @Column({ type: 'int', default: 0 })
  shardsEarnedToday!: number;

  @Column({ type: 'date', nullable: true })
  shardsDayStartedAt!: Date | null;

  // Onboarding quest flags
  @Column({ type: 'boolean', default: false })
  hasProfileCreationShard!: boolean;

  @Column({ type: 'boolean', default: false })
  hasFirstSendShard!: boolean;

  @Column({ type: 'boolean', default: false })
  hasFirstReceiveShard!: boolean;

  @Column({ type: 'boolean', default: false })
  hasFirstScheduledPaymentShard!: boolean;

  @Column({ type: 'boolean', default: false })
  hasFirstSplitBillShard!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
