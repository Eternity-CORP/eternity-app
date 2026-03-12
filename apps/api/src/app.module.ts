import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
import { FaucetModule } from './faucet/faucet.module';
import { InviteModule } from './invite/invite.module';
import { SupabaseModule } from './supabase';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
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
    FaucetModule,
    InviteModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
