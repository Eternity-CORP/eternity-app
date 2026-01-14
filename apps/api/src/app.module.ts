import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from './health/health.module';
import { BlikModule } from './blik/blik.module';
import { TransactionModule } from './transaction/transaction.module';
import { UsernameModule } from './username/username.module';
import { Username } from './username/username.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: process.env.DATABASE_PATH || 'data/ey.sqlite',
      entities: [Username],
      synchronize: true, // Auto-create tables (dev only)
      logging: process.env.NODE_ENV === 'development',
    }),
    HealthModule,
    BlikModule,
    TransactionModule,
    UsernameModule,
  ],
})
export class AppModule {}
