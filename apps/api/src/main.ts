import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: configService.get('cors.origin'),
  });

  const port = configService.get('port') || 3000;
  await app.listen(port);

  logger.log(`API running on http://localhost:${port}`);
  logger.log(`WebSocket BLIK gateway available at ws://localhost:${port}/blik`);
}

bootstrap();
