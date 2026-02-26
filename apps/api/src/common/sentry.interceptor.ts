/**
 * Sentry Error Interceptor for NestJS
 *
 * Captures and reports exceptions to Sentry with structured context:
 * - User context (wallet address from request headers)
 * - Transaction context (endpoint name, HTTP method)
 * - Module tags for dashboard filtering (blik, split, scheduled, ai, business, etc.)
 * - Performance spans for critical operations
 * - Sanitized request body (sensitive fields redacted)
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import * as Sentry from '@sentry/node';
import { AppError } from './app-errors';

/** Map controller class names to module tags for Sentry filtering */
const MODULE_TAG_MAP: Record<string, string> = {
  BlikGateway: 'blik',
  BlikService: 'blik',
  SplitGateway: 'split',
  SplitController: 'split',
  ScheduledGateway: 'scheduled',
  ScheduledController: 'scheduled',
  ScheduledService: 'scheduled',
  TransactionGateway: 'transaction',
  AiController: 'ai',
  AiGateway: 'ai',
  BusinessController: 'business',
  BusinessGateway: 'business',
  FaucetController: 'faucet',
  UsernameController: 'username',
  NotificationsController: 'notifications',
  PreferencesController: 'preferences',
  InviteController: 'invite',
  WaitlistController: 'waitlist',
  HealthController: 'health',
};

/** Fields that must never be sent to Sentry */
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
  'estimatedGasPrice',
];

/** Resolve the module tag from the execution context */
function resolveModuleTag(context: ExecutionContext): string {
  const className = context.getClass()?.name || '';
  if (MODULE_TAG_MAP[className]) {
    return MODULE_TAG_MAP[className];
  }

  // Fallback: derive from class name (e.g. "BlikController" -> "blik")
  const match = className.match(/^(\w+?)(Controller|Gateway|Service)$/);
  if (match) {
    return match[1].toLowerCase();
  }

  return 'unknown';
}

/** Sanitize request body by redacting sensitive fields */
function sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
  if (!body || typeof body !== 'object') return body;

  const sanitized = { ...body };
  for (const key of SENSITIVE_KEYS) {
    if (key in sanitized) {
      sanitized[key] = '[REDACTED]';
    }
  }
  return sanitized;
}

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const className = context.getClass()?.name || 'Unknown';
    const handlerName = context.getHandler()?.name || 'unknown';
    const moduleTag = resolveModuleTag(context);
    const operationName = `${className}.${handlerName}`;

    // Add breadcrumb for every request (helps trace flow before errors)
    Sentry.addBreadcrumb({
      category: 'http',
      message: `${operationName}`,
      level: 'info',
      timestamp: Date.now() / 1000,
      data: {
        module: moduleTag,
      },
    });

    // Start a performance span for this handler
    const startTime = Date.now();

    return next.handle().pipe(
      // Track successful completion for performance monitoring
      tap(() => {
        const durationMs = Date.now() - startTime;

        // Log slow operations (> 3 seconds) as Sentry breadcrumbs
        if (durationMs > 3000) {
          Sentry.addBreadcrumb({
            category: 'performance',
            message: `Slow operation: ${operationName} took ${durationMs}ms`,
            level: 'warning',
            timestamp: Date.now() / 1000,
            data: { module: moduleTag, durationMs },
          });
        }
      }),

      catchError((error) => {
        // Don't report 4xx client errors to Sentry
        if (error instanceof HttpException && error.getStatus() < 500) {
          return throwError(() => error);
        }

        const durationMs = Date.now() - startTime;

        // Capture the exception with rich context
        Sentry.withScope((scope) => {
          // --- Module tag for dashboard filtering ---
          scope.setTag('module', moduleTag);
          scope.setTag('handler', handlerName);

          // --- Error classification ---
          if (error instanceof AppError) {
            scope.setTag('error_code', error.code);
            scope.setLevel('error');
            if (error.context) {
              scope.setContext('error_context', error.context);
            }
          }

          // --- Performance data ---
          scope.setExtra('duration_ms', durationMs);

          // --- Request context (HTTP) ---
          try {
            const request = context.switchToHttp().getRequest();
            if (request) {
              scope.setExtra('url', request.url);
              scope.setExtra('method', request.method);
              scope.setExtra('params', request.params);
              scope.setExtra('query', request.query);

              if (request.body) {
                scope.setExtra('body', sanitizeBody(request.body));
              }

              // User context from wallet address header
              const walletAddress =
                request.headers?.['x-wallet-address'] ||
                request.body?.senderAddress ||
                request.body?.receiverAddress ||
                request.body?.address;

              if (walletAddress) {
                scope.setUser({ id: String(walletAddress).toLowerCase() });
              }
            }
          } catch {
            // Not an HTTP context (e.g. WebSocket) — handled separately below
          }

          // --- WebSocket context ---
          try {
            const wsContext = context.switchToWs();
            const client = wsContext.getClient();
            const data = wsContext.getData();

            if (client?.id) {
              scope.setExtra('ws_client_id', client.id);
              scope.setTag('transport', 'websocket');

              // Get authenticated address from socket data
              const socketAddress = client.data?.address;
              if (socketAddress) {
                scope.setUser({ id: String(socketAddress).toLowerCase() });
              }
            }

            if (data) {
              scope.setExtra('ws_payload', sanitizeBody(data));
            }
          } catch {
            // Not a WebSocket context — ignore
          }

          // --- Handler context ---
          scope.setExtra('handler', handlerName);
          scope.setExtra('class', className);

          scope.setFingerprint([moduleTag, handlerName, error.name || 'Error']);

          Sentry.captureException(error);
        });

        return throwError(() => error);
      }),
    );
  }
}
