import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import {
  ParsedIntentDto,
  IntentType,
  ParseIntentResponseDto,
  ChatRequestDto,
  ChatResponseDto,
} from './dto/ai-intent.dto';

@Injectable()
export class AIIntentService {
  private readonly logger = new Logger(AIIntentService.name);
  private readonly groq: Groq;
  private readonly model = 'llama-3.3-70b-versatile';

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      this.logger.warn('GROQ_API_KEY not set - AI features will be disabled');
    }
    this.groq = new Groq({ apiKey });
  }

  async parseIntent(
    text: string,
    locale?: string,
  ): Promise<ParseIntentResponseDto> {
    const startTime = Date.now();
    const detectedLocale = locale || this.detectLocale(text);

    try {
      const prompt = this.buildPrompt(text, detectedLocale);

      const response = await this.groq.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1, // Low for consistency
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Groq');
      }

      const parsed = this.parseResponse(content);
      const processingTimeMs = Date.now() - startTime;

      this.logger.log(
        `Intent parsed: ${parsed.type} (confidence: ${parsed.confidence}) in ${processingTimeMs}ms`,
      );

      return {
        intent: parsed,
        suggestions: parsed.type === IntentType.UNKNOWN ? this.getSuggestions(detectedLocale) : [],
        rawText: text,
        detectedLocale,
        processingTimeMs,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Failed to parse intent: ${err.message}`, err.stack);

      // Return unknown intent on error
      return {
        intent: {
          type: IntentType.UNKNOWN,
          confidence: 0,
        },
        suggestions: this.getSuggestions(detectedLocale),
        rawText: text,
        detectedLocale,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  private buildPrompt(text: string, locale: string): string {
    return `You are a crypto wallet assistant. Parse the following command into a structured intent.

Command: "${text}"
Locale: ${locale}

Return a JSON object with these fields:
- type: one of ["balance", "send", "swap", "fees", "price", "unknown"]
- amount: string or null (numeric value, e.g., "0.5", "100")
- token: string or null (ETH, USDC, USDT, ARB, MATIC, etc.)
- recipient: string or null (@username, 0x address, or nickname)
- fromToken: string or null (for swaps - source token)
- toToken: string or null (for swaps - destination token)
- chain: string or null (ethereum, arbitrum, polygon, etc.)
- period: string or null (for fees - "day", "week", "month", "year")
- confidence: number 0-1 (how confident you are in the parsing)

Intent type rules:
- "balance": asking about wallet balance, money amount, portfolio
- "send": transferring tokens to someone (отправь, send, transfer, переведи)
- "swap": exchanging one token for another (обменяй, swap, exchange, поменяй)
- "fees": asking about gas fees, commissions spent (комиссии, газ, fees, gas)
- "price": asking token price (сколько стоит, price, курс, цена)
- "unknown": if intent is unclear or not crypto-related

Examples:
"Сколько у меня денег?" → {"type":"balance","confidence":0.99}
"What's my balance?" → {"type":"balance","confidence":0.99}
"Send 0.1 ETH to @alice" → {"type":"send","amount":"0.1","token":"ETH","recipient":"@alice","confidence":0.95}
"Отправь 100 USDC на 0x742d35Cc6634C0532925a3b844Bc9e7595f8fDc5" → {"type":"send","amount":"100","token":"USDC","recipient":"0x742d35Cc6634C0532925a3b844Bc9e7595f8fDc5","confidence":0.98}
"Обменяй весь USDC на ETH" → {"type":"swap","fromToken":"USDC","toToken":"ETH","amount":"all","confidence":0.92}
"Swap 50 USDC for ARB" → {"type":"swap","fromToken":"USDC","toToken":"ARB","amount":"50","confidence":0.95}
"Сколько потратил на газ?" → {"type":"fees","period":"month","confidence":0.90}
"How much gas did I spend this week?" → {"type":"fees","period":"week","confidence":0.92}
"Сколько стоит ETH?" → {"type":"price","token":"ETH","confidence":0.98}
"What's Bitcoin price?" → {"type":"price","token":"BTC","confidence":0.98}
"Hello" → {"type":"unknown","confidence":0.10}

Return ONLY valid JSON, no explanation or markdown.`;
  }

  private parseResponse(content: string): ParsedIntentDto {
    try {
      const json = JSON.parse(content);

      return {
        type: this.validateIntentType(json.type),
        amount: json.amount || undefined,
        token: json.token?.toUpperCase() || undefined,
        recipient: json.recipient || undefined,
        fromToken: json.fromToken?.toUpperCase() || undefined,
        toToken: json.toToken?.toUpperCase() || undefined,
        chain: json.chain?.toLowerCase() || undefined,
        period: json.period || undefined,
        confidence: Math.min(1, Math.max(0, json.confidence || 0)),
      };
    } catch (error) {
      this.logger.error(`Failed to parse JSON response: ${content}`);
      return {
        type: IntentType.UNKNOWN,
        confidence: 0,
      };
    }
  }

  private validateIntentType(type: string): IntentType {
    const validTypes = Object.values(IntentType);
    const normalized = type?.toLowerCase();

    if (validTypes.includes(normalized as IntentType)) {
      return normalized as IntentType;
    }

    return IntentType.UNKNOWN;
  }

  private detectLocale(text: string): string {
    // Simple heuristic: check for Cyrillic characters
    const cyrillicPattern = /[\u0400-\u04FF]/;
    return cyrillicPattern.test(text) ? 'ru' : 'en';
  }

  private getSuggestions(locale: string): string[] {
    if (locale === 'ru') {
      return [
        'Проверить баланс',
        'Отправить токены',
        'Обменять токены',
        'Посмотреть комиссии',
        'Узнать цену токена',
      ];
    }

    return [
      'Check balance',
      'Send tokens',
      'Swap tokens',
      'View fees spent',
      'Check token price',
    ];
  }

  /**
   * Full chat endpoint - can answer any question and execute wallet commands
   */
  async chat(dto: ChatRequestDto): Promise<ChatResponseDto> {
    const startTime = Date.now();
    const detectedLocale = dto.locale || this.detectLocale(dto.message);

    try {
      const prompt = this.buildChatPrompt(dto, detectedLocale);

      const response = await this.groq.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from Groq');
      }

      const parsed = this.parseChatResponse(content);
      const processingTimeMs = Date.now() - startTime;

      this.logger.log(
        `Chat response generated in ${processingTimeMs}ms, action: ${parsed.action?.type || 'none'}`,
      );

      return {
        ...parsed,
        detectedLocale,
        processingTimeMs,
      };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`Chat failed: ${err.message}`, err.stack);

      const fallbackResponse = detectedLocale === 'ru'
        ? 'Извините, произошла ошибка. Попробуйте ещё раз.'
        : 'Sorry, something went wrong. Please try again.';

      return {
        response: fallbackResponse,
        action: { type: 'none' },
        detectedLocale,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  private buildChatPrompt(dto: ChatRequestDto, locale: string): string {
    // Build wallet context
    let contextInfo = '';
    
    if (dto.balance) {
      contextInfo += `ETH Balance: ${dto.balance} ETH\n`;
    }
    
    if (dto.tokens && dto.tokens.length > 0) {
      contextInfo += 'Tokens in wallet:\n';
      for (const token of dto.tokens) {
        const usd = token.usdValue ? ` (~${token.usdValue})` : '';
        const network = token.network ? ` on ${token.network}` : '';
        contextInfo += `- ${token.symbol}: ${token.balance}${usd}${network}\n`;
      }
    } else if (!dto.balance) {
      contextInfo = 'Wallet information not available';
    }
    
    if (dto.network) {
      contextInfo += `Current network: ${dto.network}\n`;
    }

    return `You are E-Y, a friendly and helpful crypto wallet AI assistant. You can:
1. Answer questions about crypto, blockchain, and the wallet
2. Execute wallet commands (send, swap, check balance, etc.)
3. Split bills between friends
4. Create BLIK codes for quick payments
5. Schedule future payments and swaps
6. Rebalance portfolio
7. Have casual conversations

User's message: "${dto.message}"
Language: ${locale === 'ru' ? 'Russian' : 'English'}
${contextInfo}

Respond in JSON format with these fields:
- response: string (your friendly response to the user, in their language)
- intent: object or null (if this is a wallet command)
  - type: one of ["balance", "send", "swap", "fees", "price", "split_bill", "blik_create", "blik_pay", "schedule", "conditional_swap", "rebalance"]
  - amount: string or null
  - token: string or null  
  - recipient: string or null
  - fromToken: string or null
  - toToken: string or null
  - participants: array of strings or null (for split_bill, e.g., ["@denis", "@maxim"])
  - description: string or null (note for transaction, e.g., "Dinner", "Birthday gift")
  - scheduleTime: string or null (for scheduled payments, e.g., "2024-05-25T09:00", "4 hours", "every 1st of month")
  - recurring: string or null ("daily", "weekly", "monthly" for recurring payments)
  - expirationMinutes: number or null (for BLIK, default 5)
  - condition: string or null (for conditional_swap, e.g., "gas < 15 gwei", "ETH price < 3000")
  - targetAllocation: object or null (for rebalance, e.g., {"ETH": 50, "USDT": 50})
- action: object
  - type: "navigate" | "show_balance" | "show_data" | "confirm" | "none"
  - screen: string or null (Send, Swap, Receive, SplitBill, CreateBlikCode, SchedulePayment, TransactionHistory, Settings)
  - params: object or null

INTENT TYPES:
1. "split_bill" - Splitting expenses between friends
   Example: "Раздели 120 USDT за ужин между мной, @denis, @maxim и @anton"
   → participants: ["@denis", "@maxim", "@anton"], amount: "120", token: "USDT", description: "ужин"

2. "blik_create" - Create a BLIK code to receive payment
   Example: "Создай Блик-код на 50 USDT для получения оплаты, действителен 5 минут"
   → amount: "50", token: "USDT", expirationMinutes: 5

3. "blik_pay" - Pay using a BLIK code
   Example: "Оплати блик код 123456"
   → No special params, just navigate to PayBlikCode

4. "schedule" - Schedule a future payment or swap
   Example: "Отправь 0.1 ETH маме @mom 25 мая в 9 утра с сообщением 'С днем рождения!'"
   → recipient: "@mom", amount: "0.1", token: "ETH", scheduleTime: "2024-05-25T09:00", description: "С днем рождения!"
   
   Example: "Каждое 1-е число месяца дели счет за квартиру 800 USDC поровну с @roommate"
   → type: "split_bill" with recurring: "monthly", scheduleTime: "1st", participants: ["@roommate"]

5. "conditional_swap" - Swap when condition is met
   Example: "Обменяй токены на SOL, когда газ будет меньше 15 gwei"
   → fromToken: "ETH", toToken: "SOL", condition: "gas < 15 gwei"
   
   Example: "Через 4 часа обменяй 1000 USDT на ETH"
   → amount: "1000", fromToken: "USDT", toToken: "ETH", scheduleTime: "4 hours"

6. "rebalance" - Rebalance portfolio to target allocation
   Example: "Сделай так, чтобы у меня было ровно 50/50 ETH и USDT"
   → targetAllocation: {"ETH": 50, "USDT": 50}

Rules:
1. Be helpful and friendly, use emojis occasionally
2. If it's a wallet command, set appropriate intent and action
3. For split_bill, calculate per-person amount and explain it in response
4. For scheduled tasks, confirm the schedule in response
5. For conditional swaps, explain you'll monitor and notify when conditions are met
6. For non-crypto questions (weather, jokes, etc.), answer them with action.type = "none"
7. Always respond in the user's language (Russian or English)

Examples:
"Раздели 120 USDT за ужин между мной, @denis, @maxim и @anton" → {"response":"🍽️ Разделяю 120 USDT на 4 человека — по 30 USDT каждому.\\n\\nСоздаю запросы для:\\n• @denis — 30 USDT\\n• @maxim — 30 USDT\\n• @anton — 30 USDT\\n\\nПодтвердить?","intent":{"type":"split_bill","amount":"120","token":"USDT","participants":["@denis","@maxim","@anton"],"description":"ужин"},"action":{"type":"navigate","screen":"SplitBill","params":{"amount":"120","token":"USDT","participants":["@denis","@maxim","@anton"],"description":"ужин","perPerson":"30"}}}

"Создай Блик-код на 50 USDT, действителен 5 минут" → {"response":"🔢 Создаю BLIK-код на получение 50 USDT...\\n\\nКод будет действителен 5 минут.","intent":{"type":"blik_create","amount":"50","token":"USDT","expirationMinutes":5},"action":{"type":"navigate","screen":"CreateBlikCode","params":{"amount":"50","token":"USDT","expirationMinutes":5}}}

"Отправь 0.1 ETH маме @mom 25 мая в 9 утра" → {"response":"🎁 Планирую отправку 0.1 ETH для @mom на 25 мая в 9:00.\\n\\nНапомню перед отправкой!","intent":{"type":"schedule","amount":"0.1","token":"ETH","recipient":"@mom","scheduleTime":"2024-05-25T09:00","description":""},"action":{"type":"navigate","screen":"SchedulePayment","params":{"amount":"0.1","token":"ETH","recipient":"@mom","scheduleTime":"2024-05-25T09:00"}}}

"Через 4 часа обменяй 1000 USDT на ETH" → {"response":"⏰ Запланирован обмен 1000 USDT → ETH через 4 часа.\\n\\nПришлю уведомление с текущей ценой перед выполнением!","intent":{"type":"conditional_swap","amount":"1000","fromToken":"USDT","toToken":"ETH","scheduleTime":"4 hours"},"action":{"type":"navigate","screen":"SchedulePayment","params":{"type":"swap","amount":"1000","fromToken":"USDT","toToken":"ETH","delayHours":4}}}

"Сделай 50/50 ETH и USDT" → {"response":"⚖️ Анализирую ваш портфель для ребалансировки 50% ETH / 50% USDT...\\n\\nТекущий баланс: ${dto.balance || '...'} ETH\\nРассчитаю необходимый обмен.","intent":{"type":"rebalance","targetAllocation":{"ETH":50,"USDT":50}},"action":{"type":"navigate","screen":"Swap","params":{"rebalance":true,"target":{"ETH":50,"USDT":50}}}}

"Какая сегодня погода?" → {"response":"☀️ Я специализируюсь на криптовалютах, но могу сказать — надеюсь, у тебя отличный день! Чем могу помочь с кошельком?","intent":null,"action":{"type":"none"}}

Return ONLY valid JSON.`;
  }

  private parseChatResponse(content: string): Omit<ChatResponseDto, 'detectedLocale' | 'processingTimeMs'> {
    try {
      const json = JSON.parse(content);

      return {
        response: json.response || 'I received your message.',
        intent: json.intent ? {
          type: this.validateIntentType(json.intent.type),
          amount: json.intent.amount || undefined,
          token: json.intent.token?.toUpperCase() || undefined,
          recipient: json.intent.recipient || undefined,
          fromToken: json.intent.fromToken?.toUpperCase() || undefined,
          toToken: json.intent.toToken?.toUpperCase() || undefined,
          participants: json.intent.participants || undefined,
          description: json.intent.description || undefined,
          scheduleTime: json.intent.scheduleTime || undefined,
          recurring: json.intent.recurring || undefined,
          expirationMinutes: json.intent.expirationMinutes || undefined,
          condition: json.intent.condition || undefined,
          targetAllocation: json.intent.targetAllocation || undefined,
          confidence: json.intent.confidence || 0.9,
        } : undefined,
        action: json.action || { type: 'none' },
      };
    } catch (error) {
      this.logger.error(`Failed to parse chat response: ${content}`);
      return {
        response: 'I had trouble understanding that. Could you try again?',
        action: { type: 'none' },
      };
    }
  }
}
