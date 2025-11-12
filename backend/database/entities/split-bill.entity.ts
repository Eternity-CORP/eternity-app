import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum SplitBillStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

export enum SplitMode {
  EQUAL = 'EQUAL',
  CUSTOM = 'CUSTOM',
}

@Entity('split_bills')
export class SplitBill {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { eager: true, nullable: false })
  @Index('idx_split_bill_creator')
  creator!: User;

  @Column({ type: 'numeric', precision: 30, scale: 18 })
  totalAmount!: string;

  @Column({ type: 'varchar', length: 16, default: 'ETH' })
  currency!: string;

  @Column({ type: 'enum', enum: SplitMode, default: SplitMode.EQUAL })
  mode!: SplitMode;

  @Column({ type: 'int' })
  participantsCount!: number;

  @Column({ type: 'enum', enum: SplitBillStatus, default: SplitBillStatus.DRAFT })
  @Index('idx_split_bill_status')
  status!: SplitBillStatus;

  @Column({ type: 'text', nullable: true })
  message!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  emoji!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  shareableLink!: string | null;

  @OneToMany(() => SplitBillParticipant, (participant) => participant.splitBill)
  participants!: SplitBillParticipant[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('split_bill_participants')
export class SplitBillParticipant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => SplitBill, (splitBill) => splitBill.participants, {
    onDelete: 'CASCADE',
  })
  @Index('idx_split_bill_participant_split_bill')
  splitBill!: SplitBill;

  @Column({ type: 'varchar', length: 64 })
  @Index('idx_split_bill_participant_address')
  participantAddress!: string;

  @Column({ type: 'numeric', precision: 30, scale: 18 })
  amount!: string;

  @Column({ type: 'boolean', default: false })
  paid!: boolean;

  @Column({ type: 'varchar', length: 128, nullable: true })
  transactionHash!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  notificationSent!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
