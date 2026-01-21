import { Module } from '@nestjs/common';
import { BlikGateway } from './blik.gateway';
import { BlikService } from './blik.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [BlikGateway, BlikService],
  exports: [BlikService],
})
export class BlikModule {}
