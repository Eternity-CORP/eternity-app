import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateShardTables1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_shard_states table
    await queryRunner.createTable(
      new Table({
        name: 'user_shard_states',
        columns: [
          {
            name: 'userId',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'totalShards',
            type: 'int',
            default: 0,
          },
          {
            name: 'shardsEarnedToday',
            type: 'int',
            default: 0,
          },
          {
            name: 'shardsDayStartedAt',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'hasProfileCreationShard',
            type: 'boolean',
            default: false,
          },
          {
            name: 'hasFirstSendShard',
            type: 'boolean',
            default: false,
          },
          {
            name: 'hasFirstReceiveShard',
            type: 'boolean',
            default: false,
          },
          {
            name: 'hasFirstScheduledPaymentShard',
            type: 'boolean',
            default: false,
          },
          {
            name: 'hasFirstSplitBillShard',
            type: 'boolean',
            default: false,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Add foreign key to users table
    await queryRunner.createForeignKey(
      'user_shard_states',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create shard_transactions table
    await queryRunner.createTable(
      new Table({
        name: 'shard_transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'amount',
            type: 'int',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'reason',
            type: 'varchar',
            length: '50',
          },
          {
            name: 'metaJson',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Add foreign key to users table
    await queryRunner.createForeignKey(
      'shard_transactions',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes for shard_transactions
    await queryRunner.createIndex(
      'shard_transactions',
      new TableIndex({
        name: 'idx_shard_tx_user_id',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'shard_transactions',
      new TableIndex({
        name: 'idx_shard_tx_created_at',
        columnNames: ['createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'shard_transactions',
      new TableIndex({
        name: 'idx_shard_tx_user_reason',
        columnNames: ['userId', 'reason'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('shard_transactions', 'idx_shard_tx_user_reason');
    await queryRunner.dropIndex('shard_transactions', 'idx_shard_tx_created_at');
    await queryRunner.dropIndex('shard_transactions', 'idx_shard_tx_user_id');

    // Drop tables
    await queryRunner.dropTable('shard_transactions');
    await queryRunner.dropTable('user_shard_states');
  }
}
