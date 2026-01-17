import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduledPayment } from './entities';
import { ScheduledService } from './scheduled.service';
import { ScheduledController } from './scheduled.controller';
import { ScheduledGateway } from './scheduled.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([ScheduledPayment])],
  controllers: [ScheduledController],
  providers: [ScheduledService, ScheduledGateway],
  exports: [ScheduledService],
})
export class ScheduledModule {}
