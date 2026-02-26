import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  HttpException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

const ETH_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
import { AiService } from './ai.service';
import { AiSecurityService } from './security';
import { ProactiveService } from './proactive';
import {
  SendChatDto,
  AiResponseDto,
  ExecuteToolDto,
  AddressQueryDto,
  LargeTransactionAlertDto,
  SecurityAlertDto,
  SuggestUsernameDto,
  SuggestContactDto,
} from './dto';
import { ChatMessage } from './providers';
import { buildSystemPrompt } from './constants';

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
  async chat(
    @Body() dto: SendChatDto,
    @Headers('x-wallet-address') walletAddress?: string,
  ): Promise<AiResponseDto> {
    this.verifyWalletOwnership(walletAddress, dto.userAddress, 'chat');

    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const startTime = Date.now();

    const systemPrompt = buildSystemPrompt({
      userAddress: dto.userAddress,
      network: 'sepolia',
    });

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
      systemPrompt,
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
    @Body() dto: ExecuteToolDto,
    @Headers('x-wallet-address') walletAddress?: string,
  ) {
    this.verifyWalletOwnership(walletAddress, dto.userAddress, 'executeTool');

    const requestId = `tool_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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
  getRateLimit(@Query() query: AddressQueryDto) {
    return this.securityService.getRateLimitUsage(query.address);
  }

  // ========================================
  // Suggestion Endpoints
  // ========================================

  @Get('suggestions')
  async getSuggestions(@Query() query: AddressQueryDto) {
    const suggestions = await this.proactiveService.getPendingSuggestions(query.address);

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
    @Body() dto: LargeTransactionAlertDto,
    @Headers('x-wallet-address') walletAddress?: string,
  ) {
    this.verifyWalletOwnership(walletAddress, dto.userAddress, 'reportLargeTransaction');
    const suggestion = await this.proactiveService.createLargeTransactionAlert(dto);

    return {
      success: true,
      suggestionId: suggestion.id,
    };
  }

  @Post('security/alert')
  @HttpCode(HttpStatus.CREATED)
  async reportSecurityAlert(
    @Body() dto: SecurityAlertDto,
    @Headers('x-wallet-address') walletAddress?: string,
  ) {
    this.verifyWalletOwnership(walletAddress, dto.userAddress, 'reportSecurityAlert');
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
    @Body() dto: SuggestUsernameDto,
    @Headers('x-wallet-address') walletAddress?: string,
  ) {
    this.verifyWalletOwnership(walletAddress, dto.userAddress, 'suggestUsername');
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
    @Body() dto: SuggestContactDto,
    @Headers('x-wallet-address') walletAddress?: string,
  ) {
    this.verifyWalletOwnership(walletAddress, dto.userAddress, 'suggestContact');
    const suggestion = await this.proactiveService.suggestAddContact(dto);

    return {
      success: true,
      suggestionId: suggestion?.id || null,
      created: !!suggestion,
    };
  }

  // ========================================
  // Auth Helper
  // ========================================

  private verifyWalletOwnership(
    headerAddress: string | undefined,
    bodyAddress: string,
    action: string,
  ): void {
    if (!headerAddress || !ETH_ADDRESS_RE.test(headerAddress)) {
      throw new BadRequestException('Valid x-wallet-address header required');
    }
    if (headerAddress.toLowerCase() !== bodyAddress.toLowerCase()) {
      throw new ForbiddenException(
        `Wallet address mismatch on ${action}: header and body addresses must match`,
      );
    }
  }
}
