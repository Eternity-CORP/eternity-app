import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { SplitParticipant } from './split-participant.entity';

export type SplitBillStatus = 'active' | 'completed' | 'cancelled';

@Entity('split_bills')
export class SplitBill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'creator_address', length: 42 })
  creatorAddress: string;

  @Column({ name: 'creator_username', length: 20, nullable: true })
  creatorUsername: string | null;

  @Column({ name: 'total_amount', type: 'decimal', precision: 36, scale: 18 })
  totalAmount: string;

  @Column({ name: 'token_symbol', length: 10 })
  tokenSymbol: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: SplitBillStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => SplitParticipant, (participant) => participant.splitBill, {
    cascade: true,
    eager: true,
  })
  participants: SplitParticipant[];
}
