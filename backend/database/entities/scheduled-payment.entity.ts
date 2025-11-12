import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum ScheduledPaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('scheduled_payments')
export class ScheduledPayment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { eager: true, nullable: false })
  @Index('idx_scheduled_payment_user')
  user!: User;

  @Column({ type: 'varchar', length: 64 })
  recipientAddress!: string;

  @Column({ type: 'numeric', precision: 30, scale: 18 })
  amount!: string;

  @Column({ type: 'varchar', length: 16, default: 'ETH' })
  currency!: string;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  emoji!: string | null;

  @Column({ type: 'timestamptz' })
  @Index('idx_scheduled_payment_scheduled_for')
  scheduledFor!: Date;

  @Column({
    type: 'enum',
    enum: ScheduledPaymentStatus,
    default: ScheduledPaymentStatus.PENDING,
  })
  @Index('idx_scheduled_payment_status')
  status!: ScheduledPaymentStatus;

  @Column({ type: 'varchar', length: 128, nullable: true })
  transactionHash!: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  executedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
