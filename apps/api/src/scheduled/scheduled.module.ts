import { Module } from '@nestjs/common';
import { ScheduledService } from './scheduled.service';
import { ScheduledController } from './scheduled.controller';
import { ScheduledGateway } from './scheduled.gateway';

@Module({
  imports: [],
  controllers: [ScheduledController],
  providers: [ScheduledService, ScheduledGateway],
  exports: [ScheduledService],
})
export class ScheduledModule {}
