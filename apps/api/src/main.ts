import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for mobile app
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  console.log(`🚀 E-Y API is running on: http://localhost:${port}`);
  console.log(`📡 WebSocket gateway available at: ws://localhost:${port}/blik`);
}

bootstrap();
