import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { BlikModule } from './blik/blik.module';
import { TransactionModule } from './transaction/transaction.module';

@Module({
  imports: [HealthModule, BlikModule, TransactionModule],
})
export class AppModule {}
