import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { HealthModule } from './health/health.module';
import { BlikModule } from './blik/blik.module';
import { TransactionModule } from './transaction/transaction.module';
import { UsernameModule } from './username/username.module';
import { SplitModule } from './split/split.module';
import { ScheduledModule } from './scheduled/scheduled.module';
import { WaitlistModule } from './waitlist/waitlist.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiModule } from './ai/ai.module';
import { PreferencesModule } from './preferences/preferences.module';
import { SupabaseModule } from './supabase';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    SupabaseModule,
    HealthModule,
    BlikModule,
    TransactionModule,
    UsernameModule,
    SplitModule,
    ScheduledModule,
    WaitlistModule,
    NotificationsModule,
    AiModule,
    PreferencesModule,
  ],
})
export class AppModule {}
