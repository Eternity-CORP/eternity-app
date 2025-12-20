import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UserWallet } from './UserWallet.entity';
import { TokenPreference } from './TokenPreference.entity';
import { PaymentRequest } from './PaymentRequest.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 64, unique: true, name: 'global_id' })
  @Index('idx_users_global_id')
  globalId: string;

  @Column({
    type: 'varchar',
    length: 32,
    unique: true,
    nullable: true,
  })
  @Index('idx_users_nickname', { where: 'nickname IS NOT NULL' })
  nickname: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true, name: 'avatar_url' })
  avatarUrl: string | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  @Index('idx_users_created_at')
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => UserWallet, (wallet) => wallet.user, { cascade: true })
  wallets: UserWallet[];

  @OneToMany(() => TokenPreference, (preference) => preference.user, { cascade: true })
  tokenPreferences: TokenPreference[];

  @OneToMany(() => PaymentRequest, (request) => request.toUser)
  receivedPaymentRequests: PaymentRequest[];

  @OneToMany(() => PaymentRequest, (request) => request.fromUser)
  sentPaymentRequests: PaymentRequest[];
}
