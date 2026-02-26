/**
 * Sentry Error Interceptor for NestJS
 * Captures and reports exceptions to Sentry
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      catchError((error) => {
        // Don't report 4xx errors to Sentry (client errors)
        if (error instanceof HttpException && error.getStatus() < 500) {
          return throwError(() => error);
        }

        // Capture the exception with context
        Sentry.withScope((scope) => {
          // Add request context
          const request = context.switchToHttp().getRequest();
          if (request) {
            scope.setExtra('url', request.url);
            scope.setExtra('method', request.method);
            const sensitiveKeys = ['signature', 'signedTransaction', 'signed_transaction', 'pushToken', 'push_token', 'mnemonic', 'privateKey', 'private_key', 'estimatedGasPrice'];
            const sanitizedBody = { ...request.body };
            for (const key of sensitiveKeys) {
              if (key in sanitizedBody) {
                sanitizedBody[key] = '[REDACTED]';
              }
            }
            scope.setExtra('body', sanitizedBody);
            scope.setExtra('query', request.query);
            scope.setExtra('params', request.params);

            // Add user context if available
            const walletAddress = request.headers['x-wallet-address'];
            if (walletAddress) {
              scope.setUser({ id: walletAddress });
            }
          }

          // Add handler context
          scope.setExtra('handler', context.getHandler()?.name);
          scope.setExtra('class', context.getClass()?.name);

          Sentry.captureException(error);
        });

        return throwError(() => error);
      }),
    );
  }
}
