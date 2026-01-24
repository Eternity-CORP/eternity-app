import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiGateway } from './ai.gateway';
import { GeminiProvider, GroqProvider } from './providers';
import {
  BalanceTool,
  SendTool,
  HistoryTool,
  ContactsTool,
  ScheduledTool,
} from './tools';
import {
  AiSecurityService,
  AiRateLimiter,
  AiAuditLogger,
} from './security';
import { ProactiveService } from './proactive';
import { AiSuggestion } from './entities';
import { ScheduledModule } from '../scheduled/scheduled.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([AiSuggestion]),
    forwardRef(() => ScheduledModule),
  ],
  controllers: [AiController],
  providers: [
    AiService,
    AiGateway,
    GeminiProvider,
    GroqProvider,
    BalanceTool,
    SendTool,
    HistoryTool,
    ContactsTool,
    ScheduledTool,
    AiSecurityService,
    AiRateLimiter,
    AiAuditLogger,
    ProactiveService,
  ],
  exports: [AiService, AiGateway, AiSecurityService, ProactiveService],
})
export class AiModule {}
