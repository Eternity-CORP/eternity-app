import { IsString, IsOptional } from 'class-validator';

export enum IntentType {
  BALANCE = 'balance',
  SEND = 'send',
  SWAP = 'swap',
  FEES = 'fees',
  PRICE = 'price',
  SPLIT_BILL = 'split_bill',
  BLIK_CREATE = 'blik_create',
  BLIK_PAY = 'blik_pay',
  SCHEDULE = 'schedule',
  CONDITIONAL_SWAP = 'conditional_swap',
  REBALANCE = 'rebalance',
  UNKNOWN = 'unknown',
}

export class ParseIntentRequestDto {
  /** Natural language command from user */
  @IsString()
  text: string;

  /** Locale for language detection (auto-detect if not provided) */
  @IsOptional()
  @IsString()
  locale?: string;
}

export class ParsedIntentDto {
  /** Detected intent type */
  type: IntentType;

  /** Amount for send/swap operations */
  amount?: string;

  /** Token symbol (ETH, USDC, etc.) */
  token?: string;

  /** Recipient (@username, address, or EY-ID) */
  recipient?: string;

  /** Source token for swaps */
  fromToken?: string;

  /** Destination token for swaps */
  toToken?: string;

  /** Chain identifier */
  chain?: string;

  /** Time period for fees query */
  period?: string;

  /** Participants for split bill (@user1, @user2, etc.) */
  participants?: string[];

  /** Description/note for transactions */
  description?: string;

  /** Schedule time for scheduled payments (ISO string or relative like "4 hours") */
  scheduleTime?: string;

  /** Recurring schedule (daily, weekly, monthly) */
  recurring?: string;

  /** BLIK code expiration in minutes */
  expirationMinutes?: number;

  /** Condition for conditional swaps (e.g., "gas < 15 gwei") */
  condition?: string;

  /** Target allocation for rebalance (e.g., {"ETH": 50, "USDT": 50}) */
  targetAllocation?: Record<string, number>;

  /** Confidence score (0-1) */
  confidence: number;
}

export class ParseIntentResponseDto {
  /** Parsed intent object */
  intent: ParsedIntentDto;

  /** Suggestions if intent is unclear */
  suggestions: string[];

  /** Original input text */
  rawText: string;

  /** Detected language */
  detectedLocale: string;

  /** Processing time in ms */
  processingTimeMs: number;
}

// Token balance interface
export class TokenBalanceDto {
  symbol: string;
  balance: string;
  usdValue?: string;
  network?: string;
}

// Chat endpoint DTOs
export class ChatRequestDto {
  /** User message */
  @IsString()
  message: string;

  /** Locale for response language */
  @IsOptional()
  @IsString()
  locale?: string;

  /** User's wallet address for context */
  @IsOptional()
  @IsString()
  walletAddress?: string;

  /** Current ETH balance for context */
  @IsOptional()
  @IsString()
  balance?: string;

  /** List of tokens with balances */
  @IsOptional()
  tokens?: TokenBalanceDto[];

  /** Current network */
  @IsOptional()
  @IsString()
  network?: string;
}

export class ChatResponseDto {
  /** AI response text */
  response: string;

  /** Parsed intent if command detected */
  intent?: ParsedIntentDto;

  /** Action to perform (navigate, show data, etc.) */
  action?: {
    type: 'navigate' | 'show_balance' | 'show_data' | 'none';
    screen?: string;
    params?: Record<string, unknown>;
    data?: unknown;
  };

  /** Detected language */
  detectedLocale: string;

  /** Processing time in ms */
  processingTimeMs: number;
}
