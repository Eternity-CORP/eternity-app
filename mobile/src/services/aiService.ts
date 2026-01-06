import { networkLogger } from './networkLogger';
import { API_BASE_URL } from '../config/env';

export type IntentType = 'balance' | 'send' | 'swap' | 'fees' | 'price' | 'unknown';

export interface ParsedIntent {
  type: IntentType;
  amount?: string;
  token?: string;
  recipient?: string;
  fromToken?: string;
  toToken?: string;
  period?: string;
  confidence: number;
}

export interface AIResponse {
  type: 'text' | 'balance' | 'transaction' | 'price' | 'fees' | 'error';
  content: any;
}

export interface BalanceResponse {
  total: string;
  totalUsd: string;
  breakdown: Array<{
    network: string;
    balance: string;
    tokens: string[];
  }>;
}

export interface FeesResponse {
  total: string;
  period: string;
  breakdown: Array<{
    network: string;
    spent: string;
    txCount: number;
  }>;
  insight: string | null;
}

export interface PriceResponse {
  token: string;
  price: string;
  change24h: string;
  change7d: string;
  sparkline?: number[];
}

export interface TransactionIntent {
  type: 'send' | 'swap';
  recipient?: string;
  recipientAddress?: string;
  amount: string;
  token: string;
  fromToken?: string;
  toToken?: string;
  fee?: string;
  network?: string;
}

export interface TransactionResponse {
  intent: TransactionIntent;
  riskLevel: 'safe' | 'caution' | 'warning';
  riskReasons: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
}

/**
 * Parse user text into structured intent using backend AI
 */
export const parseIntent = async (
  text: string,
  locale: string = 'en'
): Promise<ParsedIntent> => {
  try {
    const response = await networkLogger.loggedFetch(`${API_BASE_URL}/api/ai/parse-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, locale }),
    });

    if (!response.ok) {
      throw new Error(`Intent parsing failed: ${response.status}`);
    }

    const data = await response.json();
    return data.intent;
  } catch (error) {
    console.error('Intent parsing error:', error);
    return {
      type: 'unknown',
      confidence: 0,
    };
  }
};

/**
 * Process user command and return appropriate response
 */
export const processCommand = async (
  text: string,
  locale: string = 'en'
): Promise<AIResponse> => {
  try {
    const intent = await parseIntent(text, locale);

    switch (intent.type) {
      case 'balance':
        return handleBalanceIntent();

      case 'send':
        return handleSendIntent(intent);

      case 'swap':
        return handleSwapIntent(intent);

      case 'fees':
        return handleFeesIntent(intent.period || 'month');

      case 'price':
        return handlePriceIntent(intent.token || 'ETH');

      default:
        return {
          type: 'text',
          content: getUnknownIntentResponse(locale),
        };
    }
  } catch (error) {
    console.error('Command processing error:', error);
    return {
      type: 'error',
      content: locale === 'ru'
        ? 'Извините, произошла ошибка. Попробуйте еще раз.'
        : 'Sorry, something went wrong. Please try again.',
    };
  }
};

/**
 * Handle balance intent
 */
const handleBalanceIntent = async (): Promise<AIResponse> => {
  // This would integrate with actual balance service
  // For now, return mock data
  return {
    type: 'balance',
    content: {
      total: '$12,450.00',
      totalUsd: '$12,450.00',
      breakdown: [
        { network: 'Ethereum', balance: '$11,200', tokens: ['3.5 ETH', '1000 USDC'] },
        { network: 'Arbitrum', balance: '$1,000', tokens: ['500 ARB', '500 USDC'] },
        { network: 'Polygon', balance: '$250', tokens: ['250 MATIC'] },
      ],
    } as BalanceResponse,
  };
};

/**
 * Handle send intent
 */
const handleSendIntent = async (intent: ParsedIntent): Promise<AIResponse> => {
  // Would resolve recipient and get risk score
  // For now, return mock transaction
  return {
    type: 'transaction',
    content: {
      intent: {
        type: 'send',
        recipient: intent.recipient || 'Unknown',
        recipientAddress: '0x742d...3f4a',
        amount: intent.amount || '0',
        token: intent.token || 'ETH',
        fee: '~$0.50',
        network: 'Ethereum',
      },
      riskLevel: 'safe',
      riskReasons: [],
    } as TransactionResponse,
  };
};

/**
 * Handle swap intent
 */
const handleSwapIntent = async (intent: ParsedIntent): Promise<AIResponse> => {
  return {
    type: 'transaction',
    content: {
      intent: {
        type: 'swap',
        fromToken: intent.fromToken || 'USDC',
        toToken: intent.toToken || 'ETH',
        amount: intent.amount || '100',
        token: intent.fromToken || 'USDC',
        fee: '~$1.50',
        network: 'Ethereum',
      },
      riskLevel: 'safe',
      riskReasons: [],
    } as TransactionResponse,
  };
};

/**
 * Handle fees intent
 */
const handleFeesIntent = async (period: string): Promise<AIResponse> => {
  try {
    const response = await networkLogger.loggedFetch(
      `${API_BASE_URL}/api/analytics/fees?period=${period}`,
      { method: 'GET' }
    );

    if (response.ok) {
      const data = await response.json();
      return { type: 'fees', content: data };
    }
  } catch (error) {
    console.error('Fees fetch error:', error);
  }

  // Fallback mock response
  return {
    type: 'fees',
    content: {
      total: '$45.30',
      period: 'Last 30 days',
      breakdown: [
        { network: 'Ethereum', spent: '$35.00', txCount: 12 },
        { network: 'Arbitrum', spent: '$8.30', txCount: 25 },
        { network: 'Polygon', spent: '$2.00', txCount: 50 },
      ],
      insight: 'You saved $120 by using L2s for 75 transactions',
    } as FeesResponse,
  };
};

/**
 * Handle price intent
 */
const handlePriceIntent = async (token: string): Promise<AIResponse> => {
  try {
    const response = await networkLogger.loggedFetch(
      `${API_BASE_URL}/api/prices/${token}`,
      { method: 'GET' }
    );

    if (response.ok) {
      const data = await response.json();
      return { type: 'price', content: data };
    }
  } catch (error) {
    console.error('Price fetch error:', error);
  }

  // Fallback mock response
  return {
    type: 'price',
    content: {
      token: token.toUpperCase(),
      price: '$3,200.00',
      change24h: '+2.5%',
      change7d: '-1.2%',
    } as PriceResponse,
  };
};

/**
 * Get response for unknown intent
 */
const getUnknownIntentResponse = (locale: string): string => {
  if (locale === 'ru') {
    return (
      'Я могу помочь вам с:\n' +
      '• Проверить баланс\n' +
      '• Отправить криптовалюту\n' +
      '• Обменять токены\n' +
      '• Посмотреть траты на газ\n' +
      '• Узнать цену токена\n\n' +
      'Просто скажите, что вы хотите сделать!'
    );
  }

  return (
    "I can help you with:\n" +
    "• Check your balance\n" +
    "• Send crypto to @username\n" +
    "• Swap tokens\n" +
    "• View gas spending\n" +
    "• Check token prices\n\n" +
    "Just tell me what you'd like to do!"
  );
};

/**
 * Get suggested commands for display
 */
export const getSuggestedCommands = (locale: string = 'en'): string[] => {
  if (locale === 'ru') {
    return [
      'Какой у меня баланс?',
      'Отправь 0.1 ETH на @alice',
      'Обменяй USDC на ETH',
      'Сколько потратил на газ?',
      'Сколько стоит ETH?',
    ];
  }

  return [
    "What's my balance?",
    'Send 0.1 ETH to @alice',
    'Swap 100 USDC for ETH',
    'How much did I spend on gas?',
    "What's ETH price?",
  ];
};

export const aiService = {
  parseIntent,
  processCommand,
  getSuggestedCommands,
};

export default aiService;
