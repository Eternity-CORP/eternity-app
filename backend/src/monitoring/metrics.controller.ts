import { Controller, Get, Header } from '@nestjs/common';
import { register, collectDefaultMetrics } from 'prom-client';

collectDefaultMetrics({ prefix: 'eternity_wallet_' });

@Controller('metrics')
export class MetricsController {
  @Get()
  @Header('Content-Type', register.contentType)
  async metrics() {
    return await register.metrics();
  }
}
