import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import Redis from 'ioredis';

@Controller('health')
export class HealthController {
  private redis: Redis | null = null;
  private redisUrl: string | undefined;

  constructor(@InjectDataSource() private readonly dataSource: DataSource, private readonly configService: ConfigService) {
    this.redisUrl = this.configService.get<string>('redisUrl');
    if (this.redisUrl) {
      this.redis = new Redis(this.redisUrl, { lazyConnect: true });
    }
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

    // Redis connectivity (skip if not configured)
    if (this.redis) {
      try {
        await this.redis.connect();
        await this.redis.ping();
        await this.redis.quit();
        (result as any).checks.redis = true;
      } catch (e) {
        (result as any).status = 'error';
      }
    } else {
      (result as any).checks.redis = 'skipped';
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
