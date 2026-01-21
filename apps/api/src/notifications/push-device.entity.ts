import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('push_devices')
export class PushDevice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet_address' })
  @Index()
  walletAddress: string;

  @Column({ name: 'push_token', unique: true })
  pushToken: string;

  @Column({ default: 'ios' })
  platform: 'ios' | 'android';

  @Column({ name: 'device_name', nullable: true })
  deviceName: string;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
