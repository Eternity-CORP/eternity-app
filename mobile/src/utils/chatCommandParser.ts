/**
 * Parser for extracting parameters from natural language chat commands
 */

export interface SendCommandParams {
  recipient?: string;
  amount?: string;
  token?: string;
}

export interface SwapCommandParams {
  fromToken?: string;
  toToken?: string;
  amount?: string;
}

export interface HistoryCommandParams {
  days?: number;
  filterType?: 'sent' | 'received' | 'all';
}

/**
 * Parse send command to extract recipient, amount, and token
 * Examples:
 * - "send @alice 0.5 ETH"
 * - "отправь 100 USDC на @bob"
 * - "перевод 0.1 ETH @test"
 */
export function parseSendCommand(input: string): SendCommandParams {
  const params: SendCommandParams = {};
  const text = input.toLowerCase();

  // Extract recipient (@username, 0x address, or EY-ID)
  const recipientPatterns = [
    /@[\w\d_]+/i,                           // @username
    /0x[a-fA-F0-9]{40}/i,                   // Ethereum address
    /ey-[\w\d]+/i,                          // EY-ID
  ];

  for (const pattern of recipientPatterns) {
    const match = input.match(pattern);
    if (match) {
      params.recipient = match[0];
      break;
    }
  }

  // Extract amount (number with optional decimals)
  const amountMatch = input.match(/(\d+(?:\.\d+)?)\s*(eth|usdc|usdt|matic|arb|bnb|btc)?/i);
  if (amountMatch) {
    params.amount = amountMatch[1];
    if (amountMatch[2]) {
      params.token = amountMatch[2].toUpperCase();
    }
  }

  // If token not found with amount, try to find standalone token
  if (!params.token) {
    const tokenPatterns = ['ETH', 'USDC', 'USDT', 'MATIC', 'ARB', 'BNB', 'WETH'];
    for (const token of tokenPatterns) {
      if (text.includes(token.toLowerCase())) {
        params.token = token;
        break;
      }
    }
  }

  // Default to ETH if no token specified
  if (!params.token && params.amount) {
    params.token = 'ETH';
  }

  return params;
}

/**
 * Parse swap command to extract tokens and amount
 * Examples:
 * - "swap 100 USDC to ETH"
 * - "обменяй USDC на ETH"
 * - "exchange 0.5 ETH for USDC"
 */
export function parseSwapCommand(input: string): SwapCommandParams {
  const params: SwapCommandParams = {};
  const text = input.toUpperCase();

  const tokens = ['ETH', 'USDC', 'USDT', 'MATIC', 'ARB', 'BNB', 'WETH', 'DAI'];
  const foundTokens: string[] = [];

  // Find all tokens mentioned
  for (const token of tokens) {
    if (text.includes(token)) {
      foundTokens.push(token);
    }
  }

  // Extract amount
  const amountMatch = input.match(/(\d+(?:\.\d+)?)/);
  if (amountMatch) {
    params.amount = amountMatch[1];
  }

  // Determine from/to based on position and keywords
  if (foundTokens.length >= 2) {
    // Check for "X to Y" or "X на Y" pattern
    const toPatterns = [' to ', ' for ', ' на ', ' в ', ' -> '];
    let toIndex = -1;
    
    for (const pattern of toPatterns) {
      const idx = input.toLowerCase().indexOf(pattern);
      if (idx !== -1) {
        toIndex = idx;
        break;
      }
    }

    if (toIndex !== -1) {
      // Find which token comes before and after the "to" keyword
      const beforeTo = input.substring(0, toIndex).toUpperCase();
      const afterTo = input.substring(toIndex).toUpperCase();

      for (const token of foundTokens) {
        if (beforeTo.includes(token) && !params.fromToken) {
          params.fromToken = token;
        } else if (afterTo.includes(token) && !params.toToken) {
          params.toToken = token;
        }
      }
    } else {
      // Just use order of appearance
      params.fromToken = foundTokens[0];
      params.toToken = foundTokens[1];
    }
  } else if (foundTokens.length === 1) {
    // Only one token mentioned, assume swapping to/from ETH
    if (foundTokens[0] === 'ETH') {
      params.fromToken = 'ETH';
      params.toToken = 'USDC';
    } else {
      params.fromToken = foundTokens[0];
      params.toToken = 'ETH';
    }
  }

  return params;
}

/**
 * Parse history command to extract time filters
 * Examples:
 * - "history for last 3 days"
 * - "история за 7 дней"
 * - "show sent transactions"
 */
export function parseHistoryCommand(input: string): HistoryCommandParams {
  const params: HistoryCommandParams = { days: 30, filterType: 'all' };
  const text = input.toLowerCase();

  // Extract days
  const daysPatterns = [
    /(\d+)\s*(day|days|дн|дней|день)/i,
    /last\s*(\d+)/i,
    /за\s*(\d+)/i,
    /последние?\s*(\d+)/i,
  ];

  for (const pattern of daysPatterns) {
    const match = input.match(pattern);
    if (match) {
      params.days = parseInt(match[1], 10);
      break;
    }
  }

  // Check for special time keywords
  if (text.includes('today') || text.includes('сегодня')) {
    params.days = 1;
  } else if (text.includes('yesterday') || text.includes('вчера')) {
    params.days = 2;
  } else if (text.includes('week') || text.includes('недел')) {
    params.days = 7;
  } else if (text.includes('month') || text.includes('месяц')) {
    params.days = 30;
  }

  // Extract filter type
  if (text.includes('sent') || text.includes('отправлен') || text.includes('исходящ')) {
    params.filterType = 'sent';
  } else if (text.includes('received') || text.includes('получен') || text.includes('входящ')) {
    params.filterType = 'received';
  }

  return params;
}

/**
 * Detect command type from input
 */
export type CommandType = 'send' | 'swap' | 'balance' | 'history' | 'receive' | 'unknown';

export function detectCommandType(input: string): CommandType {
  const text = input.toLowerCase();

  const sendKeywords = ['send', 'отправь', 'отправить', 'перевод', 'перевести', 'послать'];
  const swapKeywords = ['swap', 'обмен', 'обменять', 'exchange', 'конверт', 'поменять'];
  const balanceKeywords = ['balance', 'баланс', 'сколько', 'деньги', 'средства'];
  const historyKeywords = ['history', 'история', 'транзакц', 'transactions', 'операции'];
  const receiveKeywords = ['receive', 'получить', 'пополнить', 'qr', 'адрес'];

  if (sendKeywords.some(kw => text.includes(kw))) return 'send';
  if (swapKeywords.some(kw => text.includes(kw))) return 'swap';
  if (balanceKeywords.some(kw => text.includes(kw))) return 'balance';
  if (historyKeywords.some(kw => text.includes(kw))) return 'history';
  if (receiveKeywords.some(kw => text.includes(kw))) return 'receive';

  return 'unknown';
}

/**
 * Format parsed params for display in chat
 */
export function formatSendConfirmation(params: SendCommandParams): string {
  const parts: string[] = ['📤 Opening send screen'];
  
  if (params.recipient) {
    parts.push(`\n👤 Recipient: ${params.recipient}`);
  }
  if (params.amount && params.token) {
    parts.push(`\n💰 Amount: ${params.amount} ${params.token}`);
  }
  
  if (params.recipient || params.amount) {
    parts.push('\n\nPlease confirm the transaction details.');
  }
  
  return parts.join('');
}

export function formatSwapConfirmation(params: SwapCommandParams): string {
  const parts: string[] = ['🔄 Opening swap screen'];
  
  if (params.fromToken && params.toToken) {
    parts.push(`\n📊 ${params.fromToken} → ${params.toToken}`);
  }
  if (params.amount) {
    parts.push(`\n💰 Amount: ${params.amount}`);
  }
  
  return parts.join('');
}
