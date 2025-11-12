/**
 * Error Code Mapping & User-Friendly Messages
 * 
 * Maps RPC errors to human-readable messages with hints
 * Supports localization (RU/EN)
 */

// ============================================================================
// Types
// ============================================================================

export type ErrorCode =
  | 'INSUFFICIENT_FUNDS'
  | 'INSUFFICIENT_GAS'
  | 'UNDERPRICED'
  | 'REPLACEMENT_UNDERPRICED'
  | 'NONCE_TOO_LOW'
  | 'NONCE_TOO_HIGH'
  | 'EXECUTION_REVERTED'
  | 'USER_REJECTED'
  | 'INVALID_ADDRESS'
  | 'INVALID_AMOUNT'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN_ERROR';

export type Language = 'en' | 'ru';

export interface ErrorMessage {
  code: ErrorCode;
  title: string;
  message: string;
  hint: string;
  action?: string;
}

// ============================================================================
// Error Detection Patterns
// ============================================================================

const ERROR_PATTERNS: Record<ErrorCode, RegExp[]> = {
  INSUFFICIENT_FUNDS: [
    /insufficient funds/i,
    /insufficient balance/i,
    /not enough/i,
    /exceeds balance/i,
  ],
  INSUFFICIENT_GAS: [
    /insufficient funds for gas/i,
    /gas required exceeds allowance/i,
    /out of gas/i,
  ],
  UNDERPRICED: [
    /transaction underpriced/i,
    /replacement transaction underpriced/i,
    /max fee per gas less than block base fee/i,
  ],
  REPLACEMENT_UNDERPRICED: [
    /replacement transaction underpriced/i,
    /already known/i,
  ],
  NONCE_TOO_LOW: [
    /nonce too low/i,
    /nonce has already been used/i,
    /old nonce/i,
  ],
  NONCE_TOO_HIGH: [
    /nonce too high/i,
    /nonce gap/i,
  ],
  EXECUTION_REVERTED: [
    /execution reverted/i,
    /revert/i,
    /transaction failed/i,
  ],
  USER_REJECTED: [
    /user rejected/i,
    /user denied/i,
    /user cancelled/i,
    /rejected by user/i,
  ],
  INVALID_ADDRESS: [
    /invalid address/i,
    /invalid recipient/i,
    /bad address/i,
  ],
  INVALID_AMOUNT: [
    /invalid amount/i,
    /invalid value/i,
  ],
  NETWORK_ERROR: [
    /network error/i,
    /connection error/i,
    /failed to fetch/i,
    /timeout/i,
  ],
  TIMEOUT: [
    /timeout/i,
    /timed out/i,
  ],
  UNKNOWN_ERROR: [],
};

// ============================================================================
// Localized Messages
// ============================================================================

const MESSAGES_EN: Record<ErrorCode, Omit<ErrorMessage, 'code'>> = {
  INSUFFICIENT_FUNDS: {
    title: 'Insufficient Balance',
    message: 'You don\'t have enough ETH to complete this transaction.',
    hint: 'Add more ETH to your wallet or reduce the amount you\'re sending.',
    action: 'Add Funds',
  },
  INSUFFICIENT_GAS: {
    title: 'Insufficient Gas',
    message: 'You don\'t have enough ETH to pay for gas fees.',
    hint: 'Add more ETH to cover the transaction fee.',
    action: 'Add Funds',
  },
  UNDERPRICED: {
    title: 'Gas Price Too Low',
    message: 'The gas price is too low for current network conditions.',
    hint: 'Increase the gas price and try again.',
    action: 'Increase Gas',
  },
  REPLACEMENT_UNDERPRICED: {
    title: 'Replacement Fee Too Low',
    message: 'The replacement transaction fee must be at least 10% higher.',
    hint: 'Increase the gas price by at least 10% to replace the transaction.',
    action: 'Increase Fee',
  },
  NONCE_TOO_LOW: {
    title: 'Transaction Already Processed',
    message: 'This transaction nonce has already been used.',
    hint: 'Wait for pending transactions to confirm, then try again.',
    action: 'View Pending',
  },
  NONCE_TOO_HIGH: {
    title: 'Transaction Order Issue',
    message: 'There are pending transactions that need to be processed first.',
    hint: 'Wait for previous transactions to confirm.',
    action: 'View Pending',
  },
  EXECUTION_REVERTED: {
    title: 'Transaction Failed',
    message: 'The transaction was rejected by the smart contract.',
    hint: 'Check the recipient address and try again. If sending to a contract, ensure it accepts transfers.',
    action: 'View Details',
  },
  USER_REJECTED: {
    title: 'Transaction Cancelled',
    message: 'You cancelled the transaction.',
    hint: 'No action needed. Your funds are safe.',
  },
  INVALID_ADDRESS: {
    title: 'Invalid Address',
    message: 'The recipient address is not valid.',
    hint: 'Check the address and make sure it\'s a valid Ethereum address.',
    action: 'Fix Address',
  },
  INVALID_AMOUNT: {
    title: 'Invalid Amount',
    message: 'The amount you entered is not valid.',
    hint: 'Enter a valid amount greater than 0.',
    action: 'Fix Amount',
  },
  NETWORK_ERROR: {
    title: 'Network Error',
    message: 'Unable to connect to the network.',
    hint: 'Check your internet connection and try again.',
    action: 'Retry',
  },
  TIMEOUT: {
    title: 'Request Timeout',
    message: 'The request took too long to complete.',
    hint: 'The network may be congested. Try again in a few moments.',
    action: 'Retry',
  },
  UNKNOWN_ERROR: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred.',
    hint: 'Please try again. If the problem persists, contact support.',
    action: 'Retry',
  },
};

const MESSAGES_RU: Record<ErrorCode, Omit<ErrorMessage, 'code'>> = {
  INSUFFICIENT_FUNDS: {
    title: 'Недостаточно средств',
    message: 'У вас недостаточно ETH для выполнения этой транзакции.',
    hint: 'Пополните кошелёк или уменьшите сумму отправки.',
    action: 'Пополнить',
  },
  INSUFFICIENT_GAS: {
    title: 'Недостаточно газа',
    message: 'У вас недостаточно ETH для оплаты комиссии.',
    hint: 'Добавьте ETH для покрытия комиссии транзакции.',
    action: 'Пополнить',
  },
  UNDERPRICED: {
    title: 'Слишком низкая цена газа',
    message: 'Цена газа слишком низкая для текущих условий сети.',
    hint: 'Увеличьте цену газа и попробуйте снова.',
    action: 'Увеличить газ',
  },
  REPLACEMENT_UNDERPRICED: {
    title: 'Слишком низкая комиссия замены',
    message: 'Комиссия замещающей транзакции должна быть минимум на 10% выше.',
    hint: 'Увеличьте цену газа минимум на 10% для замены транзакции.',
    action: 'Увеличить комиссию',
  },
  NONCE_TOO_LOW: {
    title: 'Транзакция уже обработана',
    message: 'Этот nonce транзакции уже был использован.',
    hint: 'Дождитесь подтверждения ожидающих транзакций, затем попробуйте снова.',
    action: 'Показать ожидающие',
  },
  NONCE_TOO_HIGH: {
    title: 'Проблема с порядком транзакций',
    message: 'Есть ожидающие транзакции, которые должны быть обработаны первыми.',
    hint: 'Дождитесь подтверждения предыдущих транзакций.',
    action: 'Показать ожидающие',
  },
  EXECUTION_REVERTED: {
    title: 'Транзакция отклонена',
    message: 'Транзакция была отклонена смарт-контрактом.',
    hint: 'Проверьте адрес получателя и попробуйте снова. Если отправляете на контракт, убедитесь, что он принимает переводы.',
    action: 'Подробнее',
  },
  USER_REJECTED: {
    title: 'Транзакция отменена',
    message: 'Вы отменили транзакцию.',
    hint: 'Никаких действий не требуется. Ваши средства в безопасности.',
  },
  INVALID_ADDRESS: {
    title: 'Неверный адрес',
    message: 'Адрес получателя недействителен.',
    hint: 'Проверьте адрес и убедитесь, что это корректный Ethereum адрес.',
    action: 'Исправить адрес',
  },
  INVALID_AMOUNT: {
    title: 'Неверная сумма',
    message: 'Введённая сумма недействительна.',
    hint: 'Введите корректную сумму больше 0.',
    action: 'Исправить сумму',
  },
  NETWORK_ERROR: {
    title: 'Ошибка сети',
    message: 'Не удалось подключиться к сети.',
    hint: 'Проверьте интернет-соединение и попробуйте снова.',
    action: 'Повторить',
  },
  TIMEOUT: {
    title: 'Превышено время ожидания',
    message: 'Запрос выполнялся слишком долго.',
    hint: 'Сеть может быть перегружена. Попробуйте через несколько минут.',
    action: 'Повторить',
  },
  UNKNOWN_ERROR: {
    title: 'Что-то пошло не так',
    message: 'Произошла неожиданная ошибка.',
    hint: 'Попробуйте снова. Если проблема сохраняется, обратитесь в поддержку.',
    action: 'Повторить',
  },
};

// ============================================================================
// Error Detection
// ============================================================================

/**
 * Detect error code from error message
 */
export function detectErrorCode(error: Error | string): ErrorCode {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();

  // Check each pattern
  for (const [code, patterns] of Object.entries(ERROR_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMessage)) {
        return code as ErrorCode;
      }
    }
  }

  return 'UNKNOWN_ERROR';
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(
  error: Error | string,
  language: Language = 'en'
): ErrorMessage {
  const code = detectErrorCode(error);
  const messages = language === 'ru' ? MESSAGES_RU : MESSAGES_EN;
  const message = messages[code];

  return {
    code,
    ...message,
  };
}

/**
 * Sanitize error message (remove private data)
 */
export function sanitizeErrorMessage(error: Error | string): string {
  const message = typeof error === 'string' ? error : error.message;

  // Remove addresses (0x...)
  let sanitized = message.replace(/0x[a-fA-F0-9]{40}/g, '0x***');

  // Remove private keys (if accidentally logged)
  sanitized = sanitized.replace(/0x[a-fA-F0-9]{64}/g, '0x***');

  // Remove transaction hashes
  sanitized = sanitized.replace(/0x[a-fA-F0-9]{64}/g, '0x***');

  return sanitized;
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: Error | string): {
  code: ErrorCode;
  message: string;
  sanitized: string;
  timestamp: number;
} {
  const code = detectErrorCode(error);
  const message = typeof error === 'string' ? error : error.message;
  const sanitized = sanitizeErrorMessage(error);

  return {
    code,
    message,
    sanitized,
    timestamp: Date.now(),
  };
}

// ============================================================================
// Error Classes
// ============================================================================

export class WalletError extends Error {
  code: ErrorCode;
  hint: string;
  action?: string;

  constructor(code: ErrorCode, message: string, hint: string, action?: string) {
    super(message);
    this.name = 'WalletError';
    this.code = code;
    this.hint = hint;
    this.action = action;
  }

  static fromRPCError(error: Error | string, language: Language = 'en'): WalletError {
    const errorMessage = getErrorMessage(error, language);
    return new WalletError(
      errorMessage.code,
      errorMessage.message,
      errorMessage.hint,
      errorMessage.action
    );
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      hint: this.hint,
      action: this.action,
    };
  }
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Check if error is a specific type
 */
export function isErrorCode(error: Error | string, code: ErrorCode): boolean {
  return detectErrorCode(error) === code;
}

/**
 * Get all error codes
 */
export function getAllErrorCodes(): ErrorCode[] {
  return Object.keys(MESSAGES_EN) as ErrorCode[];
}

/**
 * Get error documentation
 */
export function getErrorDocumentation(code: ErrorCode, language: Language = 'en'): {
  code: ErrorCode;
  title: string;
  description: string;
  commonCauses: string[];
  solutions: string[];
} {
  const messages = language === 'ru' ? MESSAGES_RU : MESSAGES_EN;
  const message = messages[code];

  // Common causes and solutions
  const docs: Record<ErrorCode, { causes: string[]; solutions: string[] }> = {
    INSUFFICIENT_FUNDS: {
      causes: language === 'ru'
        ? ['Недостаточно ETH на балансе', 'Сумма + комиссия превышает баланс']
        : ['Not enough ETH in wallet', 'Amount + fee exceeds balance'],
      solutions: language === 'ru'
        ? ['Пополнить кошелёк', 'Уменьшить сумму отправки', 'Уменьшить комиссию']
        : ['Add more ETH', 'Reduce send amount', 'Lower gas fee'],
    },
    INSUFFICIENT_GAS: {
      causes: language === 'ru'
        ? ['Недостаточно ETH для оплаты газа']
        : ['Not enough ETH for gas'],
      solutions: language === 'ru'
        ? ['Пополнить кошелёк ETH']
        : ['Add more ETH'],
    },
    UNDERPRICED: {
      causes: language === 'ru'
        ? ['Цена газа ниже текущего base fee', 'Сеть перегружена']
        : ['Gas price below current base fee', 'Network congestion'],
      solutions: language === 'ru'
        ? ['Увеличить maxFeePerGas', 'Использовать "High" комиссию']
        : ['Increase maxFeePerGas', 'Use "High" fee level'],
    },
    REPLACEMENT_UNDERPRICED: {
      causes: language === 'ru'
        ? ['Новая комиссия меньше чем старая + 10%']
        : ['New fee less than old fee + 10%'],
      solutions: language === 'ru'
        ? ['Увеличить комиссию минимум на 10%']
        : ['Increase fee by at least 10%'],
    },
    NONCE_TOO_LOW: {
      causes: language === 'ru'
        ? ['Nonce уже использован', 'Транзакция уже подтверждена']
        : ['Nonce already used', 'Transaction already confirmed'],
      solutions: language === 'ru'
        ? ['Дождаться подтверждения', 'Обновить страницу']
        : ['Wait for confirmation', 'Refresh page'],
    },
    NONCE_TOO_HIGH: {
      causes: language === 'ru'
        ? ['Есть pending транзакции с меньшим nonce']
        : ['Pending transactions with lower nonce'],
      solutions: language === 'ru'
        ? ['Дождаться подтверждения предыдущих']
        : ['Wait for previous transactions'],
    },
    EXECUTION_REVERTED: {
      causes: language === 'ru'
        ? ['Контракт отклонил транзакцию', 'Недостаточно газа', 'Контракт не принимает ETH']
        : ['Contract rejected transaction', 'Out of gas', 'Contract doesn\'t accept ETH'],
      solutions: language === 'ru'
        ? ['Проверить адрес', 'Увеличить gas limit', 'Проверить логику контракта']
        : ['Check address', 'Increase gas limit', 'Check contract logic'],
    },
    USER_REJECTED: {
      causes: language === 'ru'
        ? ['Пользователь отменил']
        : ['User cancelled'],
      solutions: language === 'ru'
        ? ['Попробовать снова']
        : ['Try again'],
    },
    INVALID_ADDRESS: {
      causes: language === 'ru'
        ? ['Неверный формат адреса', 'Опечатка в адресе']
        : ['Invalid address format', 'Typo in address'],
      solutions: language === 'ru'
        ? ['Проверить адрес', 'Использовать checksum адрес']
        : ['Check address', 'Use checksum address'],
    },
    INVALID_AMOUNT: {
      causes: language === 'ru'
        ? ['Отрицательная сумма', 'Нулевая сумма', 'Неверный формат']
        : ['Negative amount', 'Zero amount', 'Invalid format'],
      solutions: language === 'ru'
        ? ['Ввести корректную сумму > 0']
        : ['Enter valid amount > 0'],
    },
    NETWORK_ERROR: {
      causes: language === 'ru'
        ? ['Нет интернета', 'RPC недоступен', 'Firewall блокирует']
        : ['No internet', 'RPC unavailable', 'Firewall blocking'],
      solutions: language === 'ru'
        ? ['Проверить соединение', 'Попробовать другой RPC']
        : ['Check connection', 'Try different RPC'],
    },
    TIMEOUT: {
      causes: language === 'ru'
        ? ['Медленная сеть', 'RPC перегружен']
        : ['Slow network', 'RPC overloaded'],
      solutions: language === 'ru'
        ? ['Попробовать снова', 'Использовать другой RPC']
        : ['Try again', 'Use different RPC'],
    },
    UNKNOWN_ERROR: {
      causes: language === 'ru'
        ? ['Неизвестная ошибка']
        : ['Unknown error'],
      solutions: language === 'ru'
        ? ['Попробовать снова', 'Обратиться в поддержку']
        : ['Try again', 'Contact support'],
    },
  };

  const doc = docs[code];

  return {
    code,
    title: message.title,
    description: message.message,
    commonCauses: doc.causes,
    solutions: doc.solutions,
  };
}
