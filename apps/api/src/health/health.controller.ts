import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import * as Sentry from '@sentry/node';

@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'e-y-api',
      sentry: this.getSentryStatus(),
    };
  }

  /**
   * Detailed health check including Sentry connectivity.
   * Useful for deployment verification and monitoring dashboards.
   */
  @Get('detailed')
  async checkDetailed() {
    const sentryStatus = this.getSentryStatus();
    let sentryTest: 'ok' | 'skipped' | 'error' = 'skipped';

    // Only test Sentry connectivity if it is initialized
    if (sentryStatus === 'initialized') {
      try {
        Sentry.captureMessage('Health check ping', 'debug');
        // Flush to ensure the message is sent (with a short timeout)
        const flushed = await Sentry.flush(2000);
        sentryTest = flushed ? 'ok' : 'error';
      } catch {
        sentryTest = 'error';
      }
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'e-y-api',
      version: process.env.npm_package_version || '0.1.0',
      uptime: Math.round(process.uptime()),
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      sentry: sentryStatus,
      sentryTest,
    };
  }

  private getSentryStatus(): 'initialized' | 'disabled' {
    try {
      const client = Sentry.getClient();
      return client ? 'initialized' : 'disabled';
    } catch {
      return 'disabled';
    }
  }
}
