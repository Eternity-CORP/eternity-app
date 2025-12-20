import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './User.entity';
import { ChainId } from './UserWallet.entity';

@Entity('token_preferences')
@Unique('token_preferences_unique_user_token', ['userId', 'tokenSymbol'])
export class TokenPreference {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index('idx_token_preferences_user_id')
  userId: string;

  @Column({ type: 'varchar', length: 16, name: 'token_symbol' })
  @Index('idx_token_preferences_token_symbol')
  tokenSymbol: string;

  @Column({
    type: 'varchar',
    length: 32,
    name: 'preferred_chain_id',
    enum: ChainId,
  })
  preferredChainId: ChainId;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.tokenPreferences, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
