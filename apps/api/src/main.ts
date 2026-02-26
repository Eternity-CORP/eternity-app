import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';
import { SentryInterceptor } from './common/sentry.interceptor';

const logger = new Logger('Bootstrap');

// Initialize Sentry before app creation
const SENTRY_DSN = process.env.SENTRY_DSN;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: `e-y-api@${process.env.npm_package_version || '0.1.0'}`,
    serverName: process.env.RAILWAY_SERVICE_NAME || 'e-y-api',

    // Performance monitoring
    tracesSampleRate: IS_PRODUCTION ? 0.2 : 1.0,
    // Profile 10% of sampled transactions in production
    profilesSampleRate: IS_PRODUCTION ? 0.1 : 1.0,

    debug: !IS_PRODUCTION,

    // Filter out noisy/expected errors
    beforeSend(event) {
      // Skip health-check related errors
      if (event.request?.url?.includes('/health')) {
        return null;
      }
      return event;
    },

    // Attach breadcrumbs for console logs so they appear in Sentry timeline
    beforeBreadcrumb(breadcrumb) {
      // Drop overly verbose debug breadcrumbs in production
      if (IS_PRODUCTION && breadcrumb.level === 'debug') {
        return null;
      }
      return breadcrumb;
    },
  });
  logger.log('Sentry initialized');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Add Sentry interceptor for error tracking
  if (SENTRY_DSN) {
    app.useGlobalInterceptors(new SentryInterceptor());
  }

  // Enable validation pipes for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS with env-based origins
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3001', 'https://e-y-app.vercel.app'];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  logger.log(`E-Y API is running on: http://localhost:${port}`);
  logger.log(`BLIK WebSocket: ws://localhost:${port}/blik`);
  logger.log(`Transactions WebSocket: ws://localhost:${port}/transactions`);
}

bootstrap();
