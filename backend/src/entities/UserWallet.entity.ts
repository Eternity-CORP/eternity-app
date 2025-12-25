import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './User.entity';

export enum ChainId {
  ETHEREUM = 'ethereum',
  MAINNET = 'mainnet',
  SEPOLIA = 'sepolia',
  HOLESKY = 'holesky',
  POLYGON = 'polygon',
  BSC = 'bsc',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  AVALANCHE = 'avalanche',
  SOLANA = 'solana',
  BITCOIN = 'bitcoin',
}

@Entity('user_wallets')
@Unique('user_wallets_unique_address', ['userId', 'chainId', 'address'])
@Unique('user_wallets_one_primary_per_chain', ['userId', 'chainId', 'isPrimary'])
export class UserWallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index('idx_user_wallets_user_id')
  userId: string;

  @Column({
    type: 'varchar',
    length: 32,
    name: 'chain_id',
    enum: ChainId,
  })
  @Index('idx_user_wallets_chain_id')
  chainId: ChainId;

  @Column({ type: 'varchar', length: 128 })
  @Index('idx_user_wallets_address')
  address: string;

  @Column({ type: 'boolean', default: false, name: 'is_primary' })
  @Index('idx_user_wallets_primary', { where: 'is_primary = TRUE' })
  isPrimary: boolean;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  @Index('idx_user_wallets_active', { where: 'is_active = TRUE' })
  isActive: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true })
  label: string | null;

  @CreateDateColumn({ type: 'timestamp', name: 'added_at' })
  addedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.wallets, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
