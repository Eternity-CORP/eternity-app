import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ScheduledPaymentStatus = 'pending' | 'executed' | 'cancelled' | 'failed';
export type RecurringInterval = 'daily' | 'weekly' | 'monthly';

@Entity('scheduled_payments')
export class ScheduledPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'creator_address', length: 42 })
  creatorAddress: string;

  @Column({ length: 42 })
  recipient: string;

  @Column({ name: 'recipient_username', length: 20, nullable: true })
  recipientUsername: string | null;

  @Column({ name: 'recipient_name', length: 50, nullable: true })
  recipientName: string | null;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  amount: string;

  @Column({ name: 'token_symbol', length: 10 })
  tokenSymbol: string;

  @Column({ name: 'scheduled_at', type: 'timestamp' })
  scheduledAt: Date;

  @Column({ name: 'recurring_interval', type: 'varchar', length: 20, nullable: true })
  recurringInterval: RecurringInterval | null;

  @Column({ name: 'recurring_end_date', type: 'timestamp', nullable: true })
  recurringEndDate: Date | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: ScheduledPaymentStatus;

  @Column({ name: 'executed_tx_hash', length: 66, nullable: true })
  executedTxHash: string | null;

  @Column({ name: 'executed_at', type: 'timestamp', nullable: true })
  executedAt: Date | null;

  @Column({ name: 'reminder_sent', type: 'boolean', default: false })
  reminderSent: boolean;

  @Column({ name: 'signed_transaction', type: 'text', nullable: true })
  signedTransaction: string | null;

  @Column({ name: 'estimated_gas_price', type: 'bigint', nullable: true })
  estimatedGasPrice: string | null;

  @Column({ type: 'integer', nullable: true })
  nonce: number | null;

  @Column({ name: 'chain_id', type: 'integer', nullable: true })
  chainId: number | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
