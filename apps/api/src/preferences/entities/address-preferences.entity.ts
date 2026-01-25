import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('address_preferences')
export class AddressPreferences {
  @PrimaryColumn({ type: 'varchar', length: 42 })
  address: string;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'default_network' })
  defaultNetwork: string | null;

  @Column({ type: 'jsonb', default: '{}', name: 'token_overrides' })
  tokenOverrides: Record<string, string>;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
