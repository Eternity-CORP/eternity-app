import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIController } from './ai.controller';
import { AIIntentService } from './ai-intent.service';

@Module({
  imports: [ConfigModule],
  controllers: [AIController],
  providers: [AIIntentService],
  exports: [AIIntentService],
})
export class AIModule {}
