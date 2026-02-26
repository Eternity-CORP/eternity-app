/**
 * Custom Application Error Classes
 *
 * Structured error hierarchy for domain-specific error tracking.
 * Each error carries a machine-readable code, HTTP status, and optional context
 * that gets forwarded to Sentry for rich error grouping and filtering.
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }

  /** Convert to a safe JSON representation (no stack traces in response) */
  toJSON(): Record<string, unknown> {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
    };
  }
}

export class WalletError extends AppError {
  constructor(
    message: string,
    code: string = 'WALLET_ERROR',
    statusCode: number = 400,
    context?: Record<string, unknown>,
  ) {
    super(message, code, statusCode, context);
    this.name = 'WalletError';
  }
}

export class BlikError extends AppError {
  constructor(
    message: string,
    code: string = 'BLIK_ERROR',
    statusCode: number = 400,
    context?: Record<string, unknown>,
  ) {
    super(message, code, statusCode, context);
    this.name = 'BlikError';
  }
}

export class TransactionError extends AppError {
  constructor(
    message: string,
    code: string = 'TX_ERROR',
    statusCode: number = 500,
    context?: Record<string, unknown>,
  ) {
    super(message, code, statusCode, context);
    this.name = 'TransactionError';
  }
}

export class SplitError extends AppError {
  constructor(
    message: string,
    code: string = 'SPLIT_ERROR',
    statusCode: number = 400,
    context?: Record<string, unknown>,
  ) {
    super(message, code, statusCode, context);
    this.name = 'SplitError';
  }
}

export class ScheduledPaymentError extends AppError {
  constructor(
    message: string,
    code: string = 'SCHEDULED_ERROR',
    statusCode: number = 400,
    context?: Record<string, unknown>,
  ) {
    super(message, code, statusCode, context);
    this.name = 'ScheduledPaymentError';
  }
}

export class AiError extends AppError {
  constructor(
    message: string,
    code: string = 'AI_ERROR',
    statusCode: number = 500,
    context?: Record<string, unknown>,
  ) {
    super(message, code, statusCode, context);
    this.name = 'AiError';
  }
}

export class BusinessError extends AppError {
  constructor(
    message: string,
    code: string = 'BUSINESS_ERROR',
    statusCode: number = 400,
    context?: Record<string, unknown>,
  ) {
    super(message, code, statusCode, context);
    this.name = 'BusinessError';
  }
}
