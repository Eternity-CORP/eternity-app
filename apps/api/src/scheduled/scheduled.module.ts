import { Module } from '@nestjs/common';
import { ScheduledService } from './scheduled.service';
import { ScheduledController } from './scheduled.controller';
import { ScheduledGateway } from './scheduled.gateway';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ScheduledController],
  providers: [ScheduledService, ScheduledGateway],
  exports: [ScheduledService],
})
export class ScheduledModule {}
