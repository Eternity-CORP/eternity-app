import { ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

export function DatabaseConfig(configService: ConfigService): DataSourceOptions {
  const databaseUrl = configService.get<string>('databaseUrl');
  const ssl = configService.get<boolean>('databaseSsl');

  return {
    type: 'postgres',
    url: databaseUrl,
    ssl: ssl
      ? {
          rejectUnauthorized: true
        }
      : false,
    entities: [
      __dirname + '/../../database/entities/*.entity{.ts,.js}',
      __dirname + '/../entities/*.entity{.ts,.js}'
    ],
    migrations: [__dirname + '/../../database/migrations/*{.ts,.js}'],
    synchronize: false,
    logging: ['error', 'warn'],
    poolSize: 10
  } as DataSourceOptions;
}
