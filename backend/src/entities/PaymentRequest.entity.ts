import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { TransactionLog } from './TransactionLog.entity';
import { ChainId } from './UserWallet.entity';

export enum PaymentRequestStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('payment_requests')
export class PaymentRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 8, unique: true })
  @Index('idx_payment_requests_code')
  code: string;

  @Column({ type: 'uuid', name: 'to_user_id' })
  @Index('idx_payment_requests_to_user_id')
  toUserId: string;

  @Column({ type: 'uuid', nullable: true, name: 'from_user_id' })
  @Index('idx_payment_requests_from_user_id', { where: 'from_user_id IS NOT NULL' })
  fromUserId: string | null;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  amount: string;

  @Column({ type: 'varchar', length: 16, name: 'token_symbol' })
  tokenSymbol: string;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
    name: 'preferred_chain_id',
    enum: ChainId,
  })
  preferredChainId: ChainId | null;

  @Column({
    type: 'varchar',
    length: 16,
    default: PaymentRequestStatus.PENDING,
    enum: PaymentRequestStatus,
  })
  @Index('idx_payment_requests_status')
  status: PaymentRequestStatus;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  @Index('idx_payment_requests_created_at')
  createdAt: Date;

  @Column({ type: 'timestamp', name: 'expires_at' })
  @Index('idx_payment_requests_expires_at', { where: "status = 'pending'" })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'executed_at' })
  executedAt: Date | null;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'tx_hash' })
  @Index('idx_payment_requests_tx_hash', { where: 'tx_hash IS NOT NULL' })
  txHash: string | null;

  @Column({
    type: 'varchar',
    length: 32,
    nullable: true,
    name: 'actual_chain_id',
    enum: ChainId,
  })
  actualChainId: ChainId | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'to_user_id' })
  toUser: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'from_user_id' })
  fromUser: User | null;

  @OneToMany(() => TransactionLog, (log) => log.paymentRequest)
  transactionLogs: TransactionLog[];
}
