import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SplitBill, SplitBillParticipant } from '../../../database/entities/split-bill.entity';
import { User } from '../../../database/entities/user.entity';
import { PushToken } from '../../../database/entities/push-token.entity';
import { SplitBillController } from './split-bill.controller';
import { SplitBillService } from './split-bill.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SplitBill,
      SplitBillParticipant,
      User,
      PushToken,
    ]),
    UserModule,
  ],
  controllers: [SplitBillController],
  providers: [SplitBillService, PushNotificationService],
  exports: [SplitBillService],
})
export class SplitBillModule {}
