import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { PaymentRequest } from './PaymentRequest.entity';
import { ChainId } from './UserWallet.entity';

export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

@Entity('transactions_log')
export class TransactionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true, name: 'from_user_id' })
  @Index('idx_transactions_log_from_user_id', { where: 'from_user_id IS NOT NULL' })
  fromUserId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'to_user_id' })
  @Index('idx_transactions_log_to_user_id', { where: 'to_user_id IS NOT NULL' })
  toUserId: string | null;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  amount: string;

  @Column({ type: 'varchar', length: 16, name: 'token_symbol' })
  tokenSymbol: string;

  @Column({
    type: 'varchar',
    length: 32,
    name: 'chain_id',
    enum: ChainId,
  })
  chainId: ChainId;

  @Column({ type: 'varchar', length: 128, name: 'tx_hash' })
  @Index('idx_transactions_log_tx_hash')
  txHash: string;

  @Column({
    type: 'varchar',
    length: 16,
    name: 'tx_status',
    default: TransactionStatus.PENDING,
    enum: TransactionStatus,
  })
  @Index('idx_transactions_log_tx_status')
  txStatus: TransactionStatus;

  @Column({ type: 'uuid', nullable: true, name: 'payment_request_id' })
  @Index('idx_transactions_log_payment_request_id', { where: 'payment_request_id IS NOT NULL' })
  paymentRequestId: string | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  @Index('idx_transactions_log_created_at')
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'confirmed_at' })
  confirmedAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  // Relations
  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'from_user_id' })
  fromUser: User | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'to_user_id' })
  toUser: User | null;

  @ManyToOne(() => PaymentRequest, (request) => request.transactionLogs, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'payment_request_id' })
  paymentRequest: PaymentRequest | null;
}
