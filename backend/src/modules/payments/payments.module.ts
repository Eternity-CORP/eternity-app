import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../../../database/entities/payment.entity';
import { User } from '../../../database/entities/user.entity';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, User]),
    ThrottlerModule.forRoot([{ ttl: 60, limit: 30 }])
  ],
  providers: [
    PaymentsService,
    {
      provide: 'REDIS',
      useFactory: (configService: ConfigService) => new Redis(configService.get<string>('redisUrl')!),
      inject: [ConfigService]
    }
  ],
  controllers: [PaymentsController]
})
export class PaymentsModule {}
