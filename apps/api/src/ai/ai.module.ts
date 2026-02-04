import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
  BlikGenerateTool,
  BlikLookupTool,
  SwapTool,
} from './tools';
import {
  AiSecurityService,
  AiRateLimiter,
  AiAuditLogger,
} from './security';
import { ProactiveService } from './proactive';
import { BalanceServiceAi, HistoryServiceAi } from './services';
import { ScheduledModule } from '../scheduled/scheduled.module';
import { UsernameModule } from '../username/username.module';
import { BlikModule } from '../blik/blik.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => ScheduledModule),
    UsernameModule,
    BlikModule,
  ],
  controllers: [AiController],
  providers: [
    AiService,
    AiGateway,
    GeminiProvider,
    GroqProvider,
    BalanceServiceAi,
    HistoryServiceAi,
    BalanceTool,
    SendTool,
    HistoryTool,
    ContactsTool,
    ScheduledTool,
    BlikGenerateTool,
    BlikLookupTool,
    SwapTool,
    AiSecurityService,
    AiRateLimiter,
    AiAuditLogger,
    ProactiveService,
  ],
  exports: [AiService, AiGateway, AiSecurityService, ProactiveService],
})
export class AiModule {}
