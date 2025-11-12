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
import { User } from '../database/entities/user.entity';
import { Payment } from '../database/entities/payment.entity';
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
    TypeOrmModule.forFeature([User, Payment]),
    HealthModule,
    MetricsModule,
    AuthModule,
    PaymentsModule,
    WebhooksModule,
    UserModule,
    SplitBillModule,
    ScheduledPaymentModule
  ]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
