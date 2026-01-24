import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiProvider, GroqProvider } from './providers';
import {
  BalanceTool,
  SendTool,
  HistoryTool,
  ContactsTool,
  ScheduledTool,
} from './tools';
import { ScheduledModule } from '../scheduled/scheduled.module';

@Module({
  imports: [ConfigModule, forwardRef(() => ScheduledModule)],
  controllers: [AiController],
  providers: [
    AiService,
    GeminiProvider,
    GroqProvider,
    BalanceTool,
    SendTool,
    HistoryTool,
    ContactsTool,
    ScheduledTool,
  ],
  exports: [AiService],
})
export class AiModule {}
