import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiProvider, GroqProvider } from './providers';

@Module({
  imports: [ConfigModule],
  controllers: [AiController],
  providers: [AiService, GeminiProvider, GroqProvider],
  exports: [AiService],
})
export class AiModule {}
