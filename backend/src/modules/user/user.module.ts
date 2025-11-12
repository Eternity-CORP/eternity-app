import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../../database/entities/user.entity';
import { PushToken } from '../../../database/entities/push-token.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PushNotificationService } from '../../services/push-notification.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, PushToken])],
  controllers: [UserController],
  providers: [UserService, PushNotificationService],
  exports: [UserService, PushNotificationService],
})
export class UserModule {}
