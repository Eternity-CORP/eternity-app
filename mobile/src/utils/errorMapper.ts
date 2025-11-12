/**
 * Error Mapper
 * 
 * Maps blockchain/network errors to user-friendly messages with:
 * - Error classification
 * - Localized messages
 * - Actionable suggestions (CTA)
 * - Retry recommendations
 */

// ============================================================================
// Types
// ============================================================================

export type ErrorCode =
  | 'INSUFFICIENT_FUNDS'
  | 'NONCE_TOO_LOW'
  | 'REPLACEMENT_UNDERPRICED'
  | 'EXECUTION_REVERTED'
  | 'NETWORK_MISMATCH'
  | 'TIMEOUT'
  | 'USER_REJECTED'
  | 'GAS_PRICE_TOO_LOW'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export type ErrorSeverity = 'error' | 'warning' | 'info';

export type ErrorAction =
  | 'top_up'              // Add funds
  | 'switch_network'      // Change network
  | 'reduce_amount'       // Lower transaction amount
  | 'speed_up'            // Increase gas price
  | 'retry'               // Try again
  | 'wait'                // Wait and retry later
  | 'cancel'              // Cancel transaction
  | 'contact_support';    // Contact support

export interface MappedError {
  code: ErrorCode;
  severity: ErrorSeverity;
  title: string;
  message: string;
  technicalDetails?: string;
  actions: ErrorAction[];
  retryable: boolean;
  userFault: boolean;        // Is it user's fault?
}

export interface ErrorContext {
  operation: 'send' | 'schedule' | 'split';
  network?: string;
  balance?: string;
  amount?: string;
  attempt?: number;
}

// ============================================================================
// Error Detection
// ============================================================================

/**
 * Map raw error to error code
 */
export function detectErrorCode(error: any): ErrorCode {
  const errorMessage = getErrorMessage(error);
  const errorLower = errorMessage.toLowerCase();
  
  // Insufficient funds
  if (
    errorLower.includes('insufficient funds') ||
    errorLower.includes('insufficient balance') ||
    errorMessage.includes('INSUFFICIENT_FUNDS')
  ) {
    return 'INSUFFICIENT_FUNDS';
  }
  
  // Nonce too low
  if (
    errorLower.includes('nonce too low') ||
    errorLower.includes('nonce has already been used') ||
    errorMessage.includes('NONCE_EXPIRED')
  ) {
    return 'NONCE_TOO_LOW';
  }
  
  // Replacement underpriced
  if (
    errorLower.includes('replacement transaction underpriced') ||
    errorLower.includes('replacement fee too low')
  ) {
    return 'REPLACEMENT_UNDERPRICED';
  }
  
  // Execution reverted
  if (
    errorLower.includes('execution reverted') ||
    errorLower.includes('transaction reverted') ||
    errorLower.includes('revert')
  ) {
    return 'EXECUTION_REVERTED';
  }
  
  // Network mismatch
  if (
    errorLower.includes('chain mismatch') ||
    errorLower.includes('wrong network') ||
    errorLower.includes('network mismatch')
  ) {
    return 'NETWORK_MISMATCH';
  }
  
  // Timeout
  if (
    errorLower.includes('timeout') ||
    errorLower.includes('timed out') ||
    errorLower.includes('request timeout')
  ) {
    return 'TIMEOUT';
  }
  
  // User rejected
  if (
    errorLower.includes('user rejected') ||
    errorLower.includes('user denied') ||
    errorLower.includes('user cancelled') ||
    errorMessage.includes('ACTION_REJECTED')
  ) {
    return 'USER_REJECTED';
  }
  
  // Gas price too low
  if (
    errorLower.includes('gas price too low') ||
    errorLower.includes('max fee per gas less than block base fee')
  ) {
    return 'GAS_PRICE_TOO_LOW';
  }
  
  // Network error
  if (
    errorLower.includes('network error') ||
    errorLower.includes('network request failed') ||
    errorLower.includes('could not detect network')
  ) {
    return 'NETWORK_ERROR';
  }
  
  // Unknown
  return 'UNKNOWN_ERROR';
}

/**
 * Extract error message from error object
 */
function getErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.reason) {
    return error.reason;
  }
  
  if (error?.error?.message) {
    return error.error.message;
  }
  
  return 'Unknown error';
}

// ============================================================================
// Error Mapping
// ============================================================================

/**
 * Map error to user-friendly format
 */
export function mapError(
  error: any,
  context: ErrorContext = { operation: 'send' },
  locale: string = 'en'
): MappedError {
  const code = detectErrorCode(error);
  const technicalDetails = getErrorMessage(error);
  
  const t = getTranslations(locale);
  const mapping = t[code];
  
  return {
    code,
    severity: mapping.severity,
    title: mapping.title,
    message: formatMessage(mapping.message, context),
    technicalDetails,
    actions: mapping.actions,
    retryable: mapping.retryable,
    userFault: mapping.userFault,
  };
}

/**
 * Format message with context
 */
function formatMessage(template: string, context: ErrorContext): string {
  let message = template;
  
  if (context.network) {
    message = message.replace('{network}', context.network);
  }
  
  if (context.balance) {
    message = message.replace('{balance}', context.balance);
  }
  
  if (context.amount) {
    message = message.replace('{amount}', context.amount);
  }
  
  if (context.attempt !== undefined) {
    message = message.replace('{attempt}', context.attempt.toString());
  }
  
  return message;
}

// ============================================================================
// Action Helpers
// ============================================================================

/**
 * Get action label
 */
export function getActionLabel(
  action: ErrorAction,
  locale: string = 'en'
): string {
  const labels: Record<string, Record<ErrorAction, string>> = {
    en: {
      top_up: 'Add Funds',
      switch_network: 'Switch Network',
      reduce_amount: 'Reduce Amount',
      speed_up: 'Speed Up',
      retry: 'Retry',
      wait: 'Wait',
      cancel: 'Cancel',
      contact_support: 'Contact Support',
    },
    ru: {
      top_up: 'Пополнить',
      switch_network: 'Сменить сеть',
      reduce_amount: 'Уменьшить сумму',
      speed_up: 'Ускорить',
      retry: 'Повторить',
      wait: 'Подождать',
      cancel: 'Отменить',
      contact_support: 'Поддержка',
    },
  };
  
  return labels[locale]?.[action] || labels.en[action];
}

/**
 * Get action icon
 */
export function getActionIcon(action: ErrorAction): string {
  const icons: Record<ErrorAction, string> = {
    top_up: '💰',
    switch_network: '🔄',
    reduce_amount: '📉',
    speed_up: '⚡',
    retry: '🔁',
    wait: '⏳',
    cancel: '❌',
    contact_support: '💬',
  };
  
  return icons[action];
}

// ============================================================================
// Localization
// ============================================================================

interface ErrorMapping {
  severity: ErrorSeverity;
  title: string;
  message: string;
  actions: ErrorAction[];
  retryable: boolean;
  userFault: boolean;
}

type ErrorTranslations = Record<ErrorCode, ErrorMapping>;

function getTranslations(locale: string): ErrorTranslations {
  const translations: Record<string, ErrorTranslations> = {
    en: {
      INSUFFICIENT_FUNDS: {
        severity: 'error',
        title: 'Insufficient Funds',
        message: 'Your balance is too low to complete this transaction. Please add funds to your wallet.',
        actions: ['top_up', 'reduce_amount', 'cancel'],
        retryable: true,
        userFault: true,
      },
      NONCE_TOO_LOW: {
        severity: 'warning',
        title: 'Transaction Already Processed',
        message: 'This transaction has already been processed or replaced. The nonce is too low.',
        actions: ['retry', 'cancel'],
        retryable: true,
        userFault: false,
      },
      REPLACEMENT_UNDERPRICED: {
        severity: 'warning',
        title: 'Fee Too Low',
        message: 'The replacement transaction fee is too low. Increase the gas price to replace the pending transaction.',
        actions: ['speed_up', 'wait', 'cancel'],
        retryable: true,
        userFault: false,
      },
      EXECUTION_REVERTED: {
        severity: 'error',
        title: 'Transaction Failed',
        message: 'The transaction was reverted by the smart contract. This may be due to insufficient allowance or contract conditions.',
        actions: ['contact_support', 'cancel'],
        retryable: false,
        userFault: false,
      },
      NETWORK_MISMATCH: {
        severity: 'error',
        title: 'Wrong Network',
        message: 'Your wallet is connected to {network}, but this transaction requires a different network.',
        actions: ['switch_network', 'cancel'],
        retryable: false,
        userFault: true,
      },
      TIMEOUT: {
        severity: 'warning',
        title: 'Request Timeout',
        message: 'The network request timed out. Please check your connection and try again.',
        actions: ['retry', 'wait', 'cancel'],
        retryable: true,
        userFault: false,
      },
      USER_REJECTED: {
        severity: 'info',
        title: 'Transaction Cancelled',
        message: 'You cancelled the transaction.',
        actions: ['retry', 'cancel'],
        retryable: true,
        userFault: true,
      },
      GAS_PRICE_TOO_LOW: {
        severity: 'warning',
        title: 'Gas Price Too Low',
        message: 'The gas price is too low for current network conditions. Increase the gas price to proceed.',
        actions: ['speed_up', 'wait', 'cancel'],
        retryable: true,
        userFault: false,
      },
      NETWORK_ERROR: {
        severity: 'error',
        title: 'Network Error',
        message: 'Failed to connect to the network. Please check your internet connection.',
        actions: ['retry', 'wait', 'cancel'],
        retryable: true,
        userFault: false,
      },
      UNKNOWN_ERROR: {
        severity: 'error',
        title: 'Unknown Error',
        message: 'An unexpected error occurred. Please try again or contact support.',
        actions: ['retry', 'contact_support', 'cancel'],
        retryable: true,
        userFault: false,
      },
    },
    ru: {
      INSUFFICIENT_FUNDS: {
        severity: 'error',
        title: 'Недостаточно средств',
        message: 'Ваш баланс слишком низкий для выполнения транзакции. Пополните кошелёк.',
        actions: ['top_up', 'reduce_amount', 'cancel'],
        retryable: true,
        userFault: true,
      },
      NONCE_TOO_LOW: {
        severity: 'warning',
        title: 'Транзакция уже обработана',
        message: 'Эта транзакция уже была обработана или заменена. Nonce слишком низкий.',
        actions: ['retry', 'cancel'],
        retryable: true,
        userFault: false,
      },
      REPLACEMENT_UNDERPRICED: {
        severity: 'warning',
        title: 'Комиссия слишком низкая',
        message: 'Комиссия замещающей транзакции слишком низкая. Увеличьте цену газа для замены ожидающей транзакции.',
        actions: ['speed_up', 'wait', 'cancel'],
        retryable: true,
        userFault: false,
      },
      EXECUTION_REVERTED: {
        severity: 'error',
        title: 'Транзакция отклонена',
        message: 'Транзакция была отклонена смарт-контрактом. Возможно, недостаточно разрешений или не выполнены условия контракта.',
        actions: ['contact_support', 'cancel'],
        retryable: false,
        userFault: false,
      },
      NETWORK_MISMATCH: {
        severity: 'error',
        title: 'Неверная сеть',
        message: 'Ваш кошелёк подключен к {network}, но для этой транзакции требуется другая сеть.',
        actions: ['switch_network', 'cancel'],
        retryable: false,
        userFault: true,
      },
      TIMEOUT: {
        severity: 'warning',
        title: 'Тайм-аут запроса',
        message: 'Время ожидания сетевого запроса истекло. Проверьте соединение и попробуйте снова.',
        actions: ['retry', 'wait', 'cancel'],
        retryable: true,
        userFault: false,
      },
      USER_REJECTED: {
        severity: 'info',
        title: 'Транзакция отменена',
        message: 'Вы отменили транзакцию.',
        actions: ['retry', 'cancel'],
        retryable: true,
        userFault: true,
      },
      GAS_PRICE_TOO_LOW: {
        severity: 'warning',
        title: 'Цена газа слишком низкая',
        message: 'Цена газа слишком низкая для текущих условий сети. Увеличьте цену газа для продолжения.',
        actions: ['speed_up', 'wait', 'cancel'],
        retryable: true,
        userFault: false,
      },
      NETWORK_ERROR: {
        severity: 'error',
        title: 'Ошибка сети',
        message: 'Не удалось подключиться к сети. Проверьте интернет-соединение.',
        actions: ['retry', 'wait', 'cancel'],
        retryable: true,
        userFault: false,
      },
      UNKNOWN_ERROR: {
        severity: 'error',
        title: 'Неизвестная ошибка',
        message: 'Произошла непредвиденная ошибка. Попробуйте снова или обратитесь в поддержку.',
        actions: ['retry', 'contact_support', 'cancel'],
        retryable: true,
        userFault: false,
      },
    },
  };
  
  return translations[locale] || translations.en;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  const code = detectErrorCode(error);
  const mapping = getTranslations('en')[code];
  return mapping.retryable;
}

/**
 * Check if error is user's fault
 */
export function isUserFault(error: any): boolean {
  const code = detectErrorCode(error);
  const mapping = getTranslations('en')[code];
  return mapping.userFault;
}

/**
 * Get primary action for error
 */
export function getPrimaryAction(error: any): ErrorAction {
  const code = detectErrorCode(error);
  const mapping = getTranslations('en')[code];
  return mapping.actions[0];
}
