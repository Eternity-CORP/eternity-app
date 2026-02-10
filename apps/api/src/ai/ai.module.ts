import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiGateway } from './ai.gateway';
import { ClaudeProvider } from './providers';
import {
  BalanceTool,
  SendTool,
  HistoryTool,
  ContactsTool,
  ScheduledTool,
  CreateScheduledTool,
  CancelScheduledTool,
  BlikGenerateTool,
  BlikLookupTool,
  SwapTool,
  CreateSplitTool,
  GetSplitsTool,
  CheckUsernameTool,
  RegisterUsernameTool,
} from './tools';
import {
  AiSecurityService,
  AiRateLimiter,
  AiAuditLogger,
} from './security';
import { IntentParser } from './intent-parser';
import { ProactiveService } from './proactive';
import { BalanceServiceAi, HistoryServiceAi } from './services';
import { ScheduledModule } from '../scheduled/scheduled.module';
import { UsernameModule } from '../username/username.module';
import { BlikModule } from '../blik/blik.module';
import { SplitModule } from '../split/split.module';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => ScheduledModule),
    UsernameModule,
    BlikModule,
    SplitModule,
  ],
  controllers: [AiController],
  providers: [
    AiService,
    AiGateway,
    IntentParser,
    ClaudeProvider,
    BalanceServiceAi,
    HistoryServiceAi,
    BalanceTool,
    SendTool,
    HistoryTool,
    ContactsTool,
    ScheduledTool,
    CreateScheduledTool,
    CancelScheduledTool,
    BlikGenerateTool,
    BlikLookupTool,
    SwapTool,
    CreateSplitTool,
    GetSplitsTool,
    CheckUsernameTool,
    RegisterUsernameTool,
    AiSecurityService,
    AiRateLimiter,
    AiAuditLogger,
    ProactiveService,
  ],
  exports: [AiService, AiGateway, AiSecurityService, ProactiveService],
})
export class AiModule {}
