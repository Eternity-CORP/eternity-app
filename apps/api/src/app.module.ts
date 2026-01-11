import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { BlikModule } from './blik/blik.module';

@Module({
  imports: [HealthModule, BlikModule],
})
export class AppModule {}
