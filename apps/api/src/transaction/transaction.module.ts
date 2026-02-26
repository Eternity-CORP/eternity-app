import { Module } from '@nestjs/common';
import { TransactionGateway } from './transaction.gateway';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [TransactionGateway],
})
export class TransactionModule {}
