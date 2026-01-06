import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AIIntentService } from './ai-intent.service';
import {
  ParseIntentRequestDto,
  ParseIntentResponseDto,
  ChatRequestDto,
  ChatResponseDto,
} from './dto/ai-intent.dto';
import { JwtAuthGuard } from '../shared/jwt-auth.guard';

@Controller('ai')
export class AIController {
  constructor(private readonly aiIntentService: AIIntentService) {}

  /**
   * POST /api/ai/parse-intent
   * Parse natural language command into structured intent
   * Accepts EN/RU text, returns intent with type, params, confidence
   */
  @Post('parse-intent')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async parseIntent(
    @Body() dto: ParseIntentRequestDto,
  ): Promise<ParseIntentResponseDto> {
    return this.aiIntentService.parseIntent(dto.text, dto.locale);
  }

  /**
   * POST /api/ai/chat
   * Full AI chat - can answer any question and execute wallet commands
   * Returns response text + optional action (navigate, show data, etc.)
   */
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async chat(@Body() dto: ChatRequestDto): Promise<ChatResponseDto> {
    return this.aiIntentService.chat(dto);
  }
}
