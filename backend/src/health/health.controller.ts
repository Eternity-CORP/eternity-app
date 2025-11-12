import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import Redis from 'ioredis';

@Controller('health')
export class HealthController {
  private redis: Redis;

  constructor(@InjectDataSource() private readonly dataSource: DataSource, private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('redisUrl');
    this.redis = new Redis(redisUrl!, { lazyConnect: true });
  }

  @Get()
  async check() {
    const result = {
      status: 'ok',
      checks: {
        db: false,
        redis: false,
        external: false
      }
    } as const;

    // DB connectivity
    try {
      await this.dataSource.query('SELECT 1');
      (result as any).checks.db = true;
    } catch (e) {
      (result as any).status = 'error';
    }

    // Redis connectivity
    try {
      await this.redis.connect();
      await this.redis.ping();
      await this.redis.quit();
      (result as any).checks.redis = true;
    } catch (e) {
      (result as any).status = 'error';
    }

    // External service availability
    try {
      const url = this.configService.get<string>('ethersRpcUrl');
      await axios.get(url!, { timeout: 5000 });
      (result as any).checks.external = true;
    } catch (e) {
      (result as any).status = 'error';
    }

    return result;
  }
}
