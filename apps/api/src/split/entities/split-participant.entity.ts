import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SplitBill } from './split-bill.entity';

export type ParticipantStatus = 'pending' | 'paid';

@Entity('split_participants')
export class SplitParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'split_id' })
  splitId: string;

  @ManyToOne(() => SplitBill, (bill) => bill.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'split_id' })
  splitBill: SplitBill;

  @Column({ length: 42 })
  address: string;

  @Column({ length: 20, nullable: true })
  username: string | null;

  @Column({ length: 50, nullable: true })
  name: string | null;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  amount: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: ParticipantStatus;

  @Column({ name: 'paid_tx_hash', length: 66, nullable: true })
  paidTxHash: string | null;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date | null;
}
