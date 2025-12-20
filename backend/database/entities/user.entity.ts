import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_user_wallet_address')
  @Column({ type: 'varchar', length: 64, unique: true })
  walletAddress!: string;

  @Index('idx_user_nickname')
  @Column({ type: 'varchar', length: 50, nullable: true, unique: true })
  nickname!: string | null;

  @Column({ type: 'text', nullable: true })
  encryptedDeviceToken!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
