import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Token symbol -> preferred network ID (null = any network)
 */
export type TokenNetworkPreferences = Record<string, string | null>;

@Entity('usernames')
export class Username {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  @Index()
  username: string;

  @Column({ type: 'varchar', length: 42, unique: true })
  @Index()
  address: string;

  @Column({ type: 'text' })
  signature: string;

  /**
   * Network preferences for receiving tokens
   * { "USDC": "arbitrum", "USDT": null, ... }
   * null means "any network" (receive on sender's network)
   */
  @Column({ type: 'jsonb', default: {} })
  networkPreferences: TokenNetworkPreferences;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
