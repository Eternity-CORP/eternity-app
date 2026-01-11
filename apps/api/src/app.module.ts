import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { BlikGateway } from './gateways/blik.gateway';
import configuration from './config/configuration';

const logger = new Logger('AppModule');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig = {
          type: 'postgres' as const,
          host: configService.get('database.host'),
          port: configService.get('database.port'),
          username: configService.get('database.username'),
          password: configService.get('database.password'),
          database: configService.get('database.database'),
          entities: [],
          synchronize: process.env.NODE_ENV !== 'production',
          autoLoadEntities: true,
          retryAttempts: 3,
          retryDelay: 1000,
        };
        logger.log(`Database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
        return dbConfig;
      },
    }),
  ],
  controllers: [HealthController],
  providers: [BlikGateway],
})
export class AppModule {}
