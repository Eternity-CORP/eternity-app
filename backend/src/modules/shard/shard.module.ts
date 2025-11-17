import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ShardService } from './shard.service';
import { ShardIntegrationService } from './shard-integration.service';
import { ShardController } from './shard.controller';
import { UserShardState } from '../../../database/entities/user-shard-state.entity';
import { ShardTransaction } from '../../../database/entities/shard-transaction.entity';
import { User } from '../../../database/entities/user.entity';
import { ShardActionsController } from './shard-actions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserShardState, ShardTransaction, User]),
    ConfigModule,
  ],
  controllers: [ShardController, ShardActionsController],
  providers: [ShardService, ShardIntegrationService],
  exports: [ShardService, ShardIntegrationService],
})
export class ShardModule {}
