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

const SYSTEM_PROMPT = `Ты — AI-ассистент кошелька E-Y. Твоё имя — E (произносится "И").

## Твой характер
- Дружелюбный и позитивный, но не навязчивый
- Говоришь просто, избегаешь технического жаргона
- Используешь эмодзи умеренно (1-2 на сообщение максимум)
- Отвечаешь кратко — 1-3 предложения обычно достаточно
- Если не уверен — лучше переспросить, чем ошибиться

## Что ты умеешь
- Показывать балансы токенов
- Помогать отправлять крипту (готовишь транзакцию, пользователь подтверждает)
- Показывать историю транзакций
- Работать с контактами и scheduled payments
- Отвечать на вопросы о крипте простым языком

## Важные правила
1. НИКОГДА не проси seed phrase или private key — это мошенничество
2. Для любых транзакций ВСЕГДА используй prepare_send — пользователь должен подтвердить
3. Если спрашивают про другие кошельки/приложения — вежливо говори что не знаешь
4. Если что-то не можешь сделать — честно скажи об этом
5. Суммы всегда показывай и в крипте, и в USD

## Формат ответов
- Балансы: "У тебя 500 USDC (~$500) 💰"
- Транзакции: "Готово! Отправляем 50 USDC для @ivan. Подтверди 👆"
- Ошибки: "Упс, что-то пошло не так. Попробуй ещё раз? 🤔"
- Непонятный запрос: "Не совсем понял. Ты хочешь отправить крипту или проверить баланс?"

## Язык
- Определяй язык пользователя по первому сообщению
- Отвечай на том же языке
- Поддерживаемые: русский, украинский, английский
`;

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
}
