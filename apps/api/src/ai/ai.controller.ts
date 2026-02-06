import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { AiSecurityService } from './security';
import { ProactiveService } from './proactive';
import { SendChatDto, AiResponseDto } from './dto';
import { ChatMessage } from './providers';

const SYSTEM_PROMPT = `You are E (pronounced "EE"), the AI financial assistant inside the Eternity (E-Y) crypto wallet.

<personality>
- Friendly, concise, helpful
- 1-3 sentences per response unless user asks for details
- Detect user's language from their message and always respond in that language
</personality>

<rules>
- NEVER ask for seed phrases, private keys, or passwords
- NEVER simulate transactions — always use tools
- ALWAYS show amounts in both crypto and USD equivalent
- For financial operations, provide clear previews before execution
- If unsure about user intent, ask for clarification
</rules>

<tools>
You have access to these tools:
- get_balance: Check wallet balance (ETH and tokens)
- prepare_send: Prepare a send transaction (supports @username and addresses)
- get_history: Get transaction history
- blik_generate: Generate a BLIK code for receiving crypto
- blik_lookup: Look up a BLIK code to pay it
- get_contacts: List saved contacts
- get_scheduled: Show scheduled payments
- prepare_swap: Prepare a token swap
</tools>

<blik>
BLIK is a 6-digit code system for instant crypto transfers:
- Receiver generates a code (valid 2 minutes)
- Sender enters the code to pay
- No addresses needed
</blik>`;

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly securityService: AiSecurityService,
    private readonly proactiveService: ProactiveService,
  ) {}

  @Get('health')
  async getHealth() {
    return this.aiService.getHealth();
  }

  @Get('providers')
  getProviders() {
    return {
      available: this.aiService.availableProviders,
      active: this.aiService.activeProvider,
    };
  }

  @Get('tools')
  getTools() {
    return {
      tools: this.aiService.getToolDefinitions(),
      available: this.aiService.registeredTools,
    };
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: SendChatDto): Promise<AiResponseDto> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const startTime = Date.now();

    // Validate user address
    if (!dto.userAddress) {
      throw new HttpException(
        { code: 'MISSING_ADDRESS', message: 'User address is required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Security check
    const securityCheck = await this.securityService.checkMessage(
      dto.userAddress,
      dto.content,
      requestId,
    );

    if (!securityCheck.allowed) {
      throw new HttpException(
        {
          code: securityCheck.code,
          message: securityCheck.reason,
          rateLimit: securityCheck.rateLimit,
        },
        securityCheck.code === 'RATE_LIMIT_EXCEEDED'
          ? HttpStatus.TOO_MANY_REQUESTS
          : HttpStatus.BAD_REQUEST,
      );
    }

    // Sanitize message
    const validated = this.securityService.validateMessage(dto.content);

    const messages: ChatMessage[] = [];

    // Add history if provided
    if (dto.history) {
      for (const msg of dto.history) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: validated.content,
    });

    // Get tool definitions for AI
    const tools = this.aiService.getToolDefinitions();

    const response = await this.aiService.chat({
      messages,
      tools,
      systemPrompt: SYSTEM_PROMPT,
      userAddress: dto.userAddress,
    });

    // Record the request for rate limiting
    this.securityService.recordRequest(dto.userAddress);

    // If AI wants to call tools, validate and execute them
    let toolResults: { name: string; result: unknown }[] | undefined;
    if (response.toolCalls && response.toolCalls.length > 0) {
      toolResults = [];

      for (const toolCall of response.toolCalls) {
        // Validate tool call
        const toolCheck = this.securityService.validateToolCall(
          dto.userAddress,
          toolCall.name,
          toolCall.arguments,
          requestId,
        );

        if (!toolCheck.allowed) {
          toolResults.push({
            name: toolCall.name,
            result: { success: false, error: toolCheck.reason },
          });
          continue;
        }

        // Execute tool
        const result = await this.aiService.executeTool(
          toolCall.name,
          toolCall.arguments,
          dto.userAddress,
        );

        this.securityService.logToolResult(
          dto.userAddress,
          toolCall.name,
          result.success,
          requestId,
        );

        toolResults.push({ name: toolCall.name, result });
      }
    }

    // Log response
    this.securityService.logChatResponse(
      dto.userAddress,
      response.content.length,
      this.aiService.activeProvider,
      Date.now() - startTime,
      requestId,
    );

    return {
      content: response.content,
      toolCalls: response.toolCalls,
      toolResults,
    };
  }

  @Post('tool')
  @HttpCode(HttpStatus.OK)
  async executeTool(
    @Body() dto: { tool: string; args: Record<string, unknown>; userAddress: string },
  ) {
    const requestId = `tool_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (!dto.userAddress) {
      throw new HttpException(
        { code: 'MISSING_ADDRESS', message: 'User address is required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate tool call
    const toolCheck = this.securityService.validateToolCall(
      dto.userAddress,
      dto.tool,
      dto.args,
      requestId,
    );

    if (!toolCheck.allowed) {
      throw new HttpException(
        { code: toolCheck.code, message: toolCheck.reason },
        HttpStatus.BAD_REQUEST,
      );
    }

    const result = await this.aiService.executeTool(dto.tool, dto.args, dto.userAddress);

    this.securityService.logToolResult(
      dto.userAddress,
      dto.tool,
      result.success,
      requestId,
    );

    return result;
  }

  @Get('rate-limit')
  getRateLimit(@Body() dto: { userAddress: string }) {
    if (!dto.userAddress) {
      throw new HttpException(
        { code: 'MISSING_ADDRESS', message: 'User address is required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.securityService.getRateLimitUsage(dto.userAddress);
  }

  // ========================================
  // Suggestion Endpoints
  // ========================================

  @Get('suggestions')
  async getSuggestions(@Query('address') address: string) {
    if (!address) {
      throw new HttpException(
        { code: 'MISSING_ADDRESS', message: 'Address query parameter is required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const suggestions = await this.proactiveService.getPendingSuggestions(address);

    return {
      suggestions: suggestions.map((s) => ({
        id: s.id,
        type: s.type,
        title: s.title,
        message: s.message,
        priority: s.priority,
        action: s.action,
        createdAt: s.createdAt,
      })),
    };
  }

  @Post('suggestions/:id/dismiss')
  @HttpCode(HttpStatus.OK)
  async dismissSuggestion(@Param('id') id: string) {
    const suggestion = await this.proactiveService.getSuggestionById(id);

    if (!suggestion) {
      throw new HttpException(
        { code: 'NOT_FOUND', message: 'Suggestion not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.proactiveService.dismissSuggestion(id);

    return { success: true };
  }

  @Post('suggestions/:id/action')
  @HttpCode(HttpStatus.OK)
  async actionSuggestion(@Param('id') id: string) {
    const suggestion = await this.proactiveService.getSuggestionById(id);

    if (!suggestion) {
      throw new HttpException(
        { code: 'NOT_FOUND', message: 'Suggestion not found' },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.proactiveService.markAsActioned(id);

    return { success: true };
  }

  // ========================================
  // Security Alert Endpoints
  // ========================================

  @Post('security/large-transaction')
  @HttpCode(HttpStatus.CREATED)
  async reportLargeTransaction(
    @Body()
    dto: {
      userAddress: string;
      txHash: string;
      amount: string;
      token: string;
      usdValue: number;
    },
  ) {
    if (!dto.userAddress || !dto.txHash) {
      throw new HttpException(
        { code: 'INVALID_PARAMS', message: 'userAddress and txHash are required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const suggestion = await this.proactiveService.createLargeTransactionAlert(dto);

    return {
      success: true,
      suggestionId: suggestion.id,
    };
  }

  @Post('security/alert')
  @HttpCode(HttpStatus.CREATED)
  async reportSecurityAlert(
    @Body()
    dto: {
      userAddress: string;
      alertType: 'new_device' | 'failed_auth' | 'unusual_activity';
      title: string;
      message: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    if (!dto.userAddress || !dto.alertType || !dto.title || !dto.message) {
      throw new HttpException(
        { code: 'INVALID_PARAMS', message: 'userAddress, alertType, title, and message are required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const suggestion = await this.proactiveService.createSecurityAlert(dto);

    return {
      success: true,
      suggestionId: suggestion.id,
    };
  }

  // ========================================
  // Smart Suggestion Endpoints
  // ========================================

  @Post('smart/suggest-username')
  @HttpCode(HttpStatus.OK)
  async suggestUsername(
    @Body() dto: { userAddress: string; transactionCount: number },
  ) {
    if (!dto.userAddress) {
      throw new HttpException(
        { code: 'INVALID_PARAMS', message: 'userAddress is required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const suggestion = await this.proactiveService.suggestUsernameSetup(
      dto.userAddress,
      dto.transactionCount || 0,
    );

    return {
      success: true,
      suggestionId: suggestion?.id || null,
      created: !!suggestion,
    };
  }

  @Post('smart/suggest-contact')
  @HttpCode(HttpStatus.OK)
  async suggestContact(
    @Body()
    dto: {
      userAddress: string;
      recipientAddress: string;
      transactionCount: number;
    },
  ) {
    if (!dto.userAddress || !dto.recipientAddress) {
      throw new HttpException(
        { code: 'INVALID_PARAMS', message: 'userAddress and recipientAddress are required' },
        HttpStatus.BAD_REQUEST,
      );
    }

    const suggestion = await this.proactiveService.suggestAddContact(dto);

    return {
      success: true,
      suggestionId: suggestion?.id || null,
      created: !!suggestion,
    };
  }
}
