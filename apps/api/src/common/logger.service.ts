/**
 * Structured Logger Service
 *
 * Wraps NestJS Logger with Sentry integration.
 * Automatically attaches structured context to log entries and forwards
 * errors/warnings to Sentry with proper severity levels.
 *
 * Usage:
 *   constructor(private readonly logger: AppLoggerService) {}
 *   this.logger.error('Payment failed', 'TX_SEND_FAILED', { txHash, amount });
 */

import { Injectable, Logger, Scope, Inject, Optional } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { AppError } from './app-errors';

interface LogContext {
  [key: string]: unknown;
}

/** Keys that must never appear in logs or Sentry extras */
const SENSITIVE_KEYS = [
  'signature',
  'signedTransaction',
  'signed_transaction',
  'pushToken',
  'push_token',
  'mnemonic',
  'privateKey',
  'private_key',
  'seed',
  'secret',
  'password',
];

/**
 * Sanitize an object by redacting sensitive fields
 */
function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      result[key] = '[REDACTED]';
    }
  }
  return result;
}

@Injectable({ scope: Scope.TRANSIENT })
export class AppLoggerService {
  private readonly logger = new Logger('App');
  private moduleName = 'App';

  constructor(
    @Optional() @Inject(REQUEST) private readonly request?: any,
  ) {}

  /**
   * Set the module/context name for this logger instance.
   * Call in the constructor of the consuming service:
   *   this.logger.setContext('BlikService');
   */
  setContext(name: string): void {
    this.moduleName = name;
    this.logger['context'] = name;
  }

  /**
   * Log informational message. Not sent to Sentry.
   */
  info(message: string, context?: LogContext): void {
    const enriched = this.enrichContext(context);
    this.logger.log(this.formatMessage(message, enriched));
  }

  /**
   * Log warning. Sent to Sentry as a breadcrumb.
   */
  warn(message: string, context?: LogContext): void {
    const enriched = this.enrichContext(context);
    this.logger.warn(this.formatMessage(message, enriched));

    Sentry.addBreadcrumb({
      category: this.moduleName,
      message,
      level: 'warning',
      data: enriched ? sanitize(enriched) : undefined,
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Log error. Sent to Sentry as a captured exception or message.
   * If `error` is an AppError, its code and context are attached automatically.
   */
  error(
    message: string,
    errorOrCode?: Error | AppError | string,
    context?: LogContext,
  ): void {
    const enriched = this.enrichContext(context);

    // Extract error details
    let errorInstance: Error | undefined;
    let errorCode: string | undefined;

    if (errorOrCode instanceof AppError) {
      errorInstance = errorOrCode;
      errorCode = errorOrCode.code;
      if (errorOrCode.context) {
        Object.assign(enriched || {}, errorOrCode.context);
      }
    } else if (errorOrCode instanceof Error) {
      errorInstance = errorOrCode;
    } else if (typeof errorOrCode === 'string') {
      errorCode = errorOrCode;
    }

    this.logger.error(
      this.formatMessage(message, enriched),
      errorInstance?.stack,
    );

    // Send to Sentry
    Sentry.withScope((scope) => {
      scope.setTag('module', this.moduleName.toLowerCase());

      if (errorCode) {
        scope.setTag('error_code', errorCode);
      }

      // Attach request context if available
      this.attachRequestContext(scope);

      if (enriched) {
        scope.setExtras(sanitize(enriched));
      }

      if (errorInstance) {
        Sentry.captureException(errorInstance);
      } else {
        Sentry.captureMessage(message, 'error');
      }
    });
  }

  /**
   * Add a Sentry breadcrumb without logging. Useful for tracking
   * the flow of operations leading up to a potential error.
   */
  breadcrumb(
    message: string,
    category?: string,
    data?: LogContext,
  ): void {
    Sentry.addBreadcrumb({
      category: category || this.moduleName.toLowerCase(),
      message,
      level: 'info',
      data: data ? sanitize(data) : undefined,
      timestamp: Date.now() / 1000,
    });
  }

  // ------------------------------------------------------------------
  // Private helpers
  // ------------------------------------------------------------------

  private enrichContext(context?: LogContext): LogContext | undefined {
    if (!this.request && !context) return undefined;

    const enriched: LogContext = { ...(context || {}) };

    // Attach request info when available (HTTP requests via REQUEST scope)
    if (this.request?.url) {
      enriched._url = this.request.url;
      enriched._method = this.request.method;

      const walletAddress = this.request.headers?.['x-wallet-address'];
      if (walletAddress) {
        enriched._wallet = walletAddress;
      }
    }

    return Object.keys(enriched).length > 0 ? enriched : undefined;
  }

  private attachRequestContext(scope: Sentry.Scope): void {
    if (!this.request) return;

    if (this.request.url) {
      scope.setExtra('url', this.request.url);
      scope.setExtra('method', this.request.method);
    }

    const walletAddress = this.request.headers?.['x-wallet-address'];
    if (walletAddress) {
      scope.setUser({ id: walletAddress });
    }
  }

  private formatMessage(message: string, context?: LogContext): string {
    if (!context || Object.keys(context).length === 0) {
      return message;
    }

    // Filter out internal enrichment keys for the console message
    const displayContext: LogContext = {};
    for (const [key, value] of Object.entries(context)) {
      if (!key.startsWith('_')) {
        displayContext[key] = value;
      }
    }

    if (Object.keys(displayContext).length === 0) {
      return message;
    }

    return `${message} | ${JSON.stringify(sanitize(displayContext))}`;
  }
}
