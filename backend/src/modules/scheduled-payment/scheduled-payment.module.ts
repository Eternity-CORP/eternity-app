import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduledPayment } from '../../../database/entities/scheduled-payment.entity';
import { User } from '../../../database/entities/user.entity';
import { PushToken } from '../../../database/entities/push-token.entity';
import { ScheduledPaymentController } from './scheduled-payment.controller';
import { ScheduledPaymentService } from './scheduled-payment.service';
import { ScheduledPaymentWorker } from './scheduled-payment.worker';
import { PushNotificationService } from '../../services/push-notification.service';
import { UserModule } from '../user/user.module';
import { ShardModule } from '../shard/shard.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduledPayment, User, PushToken]),
    UserModule,
    ShardModule,
  ],
  controllers: [ScheduledPaymentController],
  providers: [
    ScheduledPaymentService,
    ScheduledPaymentWorker,
    PushNotificationService,
  ],
  exports: [ScheduledPaymentService],
})
export class ScheduledPaymentModule {}
