import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FaucetController } from './faucet.controller';
import { FaucetService } from './faucet.service';

@Module({
  imports: [ConfigModule],
  controllers: [FaucetController],
  providers: [FaucetService],
})
export class FaucetModule {}
