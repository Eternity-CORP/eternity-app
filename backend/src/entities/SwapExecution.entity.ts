import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum SwapStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

@Entity('swap_executions')
export class SwapExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @Column()
  routeId: string;

  @Column()
  router: string;

  @Column()
  fromChainId: number;

  @Column()
  toChainId: number;

  @Column()
  fromTokenAddress: string;

  @Column()
  toTokenAddress: string;

  @Column()
  fromAmount: string;

  @Column()
  toAmount: string;

  @Column({ nullable: true })
  transactionHash: string;

  @Column({
    type: 'enum',
    enum: SwapStatus,
    default: SwapStatus.PENDING,
  })
  status: SwapStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
