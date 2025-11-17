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
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('redisUrl');
        if (!redisUrl) {
          // Return a comprehensive mock Redis client
          const mockRedis = {
            get: async () => null,
            set: async () => 'OK',
            del: async () => 1,
            exists: async () => 0,
            expire: async () => 1,
            ttl: async () => -1,
            keys: async () => [],
            flushall: async () => 'OK',
            // Event emitter methods to prevent errors
            on: () => mockRedis,
            off: () => mockRedis,
            emit: () => false,
            removeAllListeners: () => mockRedis,
            // Connection status
            status: 'ready',
            disconnect: async () => {},
            quit: async () => {},
          };
          console.log('🔧 [Redis] Using in-memory mock (Redis not configured)');
          return mockRedis;
        }
        console.log('🔧 [Redis] Connecting to Redis at', redisUrl);
        return new Redis(redisUrl);
      },
      inject: [ConfigService]
    }
  ],
  controllers: [PaymentsController]
})
export class PaymentsModule {}
