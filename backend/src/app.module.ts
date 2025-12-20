import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { validateEnv } from './config/validation';
import { DatabaseConfig } from './config/database.config';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './monitoring/metrics.module';
import { AuthModule } from './modules/auth/auth.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { UserModule } from './modules/user/user.module';
import { SplitBillModule } from './modules/split-bill/split-bill.module';
import { ScheduledPaymentModule } from './modules/scheduled-payment/scheduled-payment.module';
import { ShardModule } from './modules/shard/shard.module';
import { IdentityModule } from './modules/identity/identity.module';
import { BlikModule } from './modules/blik/blik.module';
import { CrosschainModule } from './modules/crosschain/crosschain.module';
import { SwapModule } from './modules/swap/swap.module';
import { User } from '../database/entities/user.entity';
import { Payment } from '../database/entities/payment.entity';
import { UserWallet } from './entities/UserWallet.entity';
import { TokenPreference } from './entities/TokenPreference.entity';
import { LoggingMiddleware } from './common/logging.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
      expandVariables: true
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        return DatabaseConfig(configService);
      },
      inject: [ConfigService]
    }),
    TypeOrmModule.forFeature([User, Payment, UserWallet, TokenPreference]),
    HealthModule,
    MetricsModule,
    AuthModule,
    PaymentsModule,
    WebhooksModule,
    UserModule,
    SplitBillModule,
    ScheduledPaymentModule,
    ShardModule,
    IdentityModule,
    BlikModule,
    CrosschainModule,
    SwapModule
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
