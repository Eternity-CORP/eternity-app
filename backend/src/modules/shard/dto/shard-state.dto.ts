import { ShardReason } from '../../../../database/entities/shard-transaction.entity';

export class ShardTransactionDto {
  id!: string;
  amount!: number;
  reason!: ShardReason;
  createdAt!: Date;
}

export class ShardStateDto {
  totalShards!: number;
  shardsEarnedToday!: number;
  recentTransactions!: ShardTransactionDto[];
}
