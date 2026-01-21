import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';
import { SentryInterceptor } from './common/sentry.interceptor';

// Initialize Sentry before app creation
const SENTRY_DSN = process.env.SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    debug: process.env.NODE_ENV !== 'production',
  });
  console.log('✅ Sentry initialized');
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

  // Enable CORS for mobile app
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 E-Y API is running on: http://localhost:${port}`);
  console.log(`📡 BLIK WebSocket: ws://localhost:${port}/blik`);
  console.log(`📡 Transactions WebSocket: ws://localhost:${port}/transactions`);
}

bootstrap();
