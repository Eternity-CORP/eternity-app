import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiService } from './ai.service';
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
  constructor(private readonly aiService: AiService) {}

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

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: SendChatDto): Promise<AiResponseDto> {
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
      content: dto.content,
    });

    const response = await this.aiService.chat({
      messages,
      systemPrompt: SYSTEM_PROMPT,
      userAddress: dto.userAddress,
    });

    return {
      content: response.content,
      toolCalls: response.toolCalls,
    };
  }
}
