import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthModule } from './health/health.module';
import { BlikModule } from './blik/blik.module';
import { TransactionModule } from './transaction/transaction.module';
import { UsernameModule } from './username/username.module';
import { SplitModule } from './split/split.module';
import { ScheduledModule } from './scheduled/scheduled.module';
import { Username } from './username/username.entity';
import { SplitBill, SplitParticipant } from './split/entities';
import { ScheduledPayment } from './scheduled/entities';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        entities: [Username, SplitBill, SplitParticipant, ScheduledPayment],
        synchronize: configService.get<string>('NODE_ENV') !== 'production',
        logging: configService.get<string>('NODE_ENV') === 'development',
      }),
    }),
    ScheduleModule.forRoot(),
    HealthModule,
    BlikModule,
    TransactionModule,
    UsernameModule,
    SplitModule,
    ScheduledModule,
  ],
})
export class AppModule {}
