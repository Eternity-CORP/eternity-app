import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SwapController } from './swap.controller';
import { SwapService } from './swap.service';
import { SwapExecution } from '../../entities/SwapExecution.entity';
import { CrosschainModule } from '../crosschain/crosschain.module';
import { EthereumRpcService } from '../../services/EthereumRpc.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SwapExecution]),
    CrosschainModule,
    ConfigModule,
  ],
  controllers: [SwapController],
  providers: [SwapService, EthereumRpcService],
})
export class SwapModule {}
