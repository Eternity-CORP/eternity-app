import { Injectable, Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';

export type AuditEventType =
  | 'chat_request'
  | 'chat_response'
  | 'tool_call'
  | 'tool_result'
  | 'rate_limit_exceeded'
  | 'dangerous_prompt_blocked'
  | 'validation_error'
  | 'security_violation';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditEvent {
  type: AuditEventType;
  severity: AuditSeverity;
  userAddress: string;
  timestamp: Date;
  data: Record<string, unknown>;
  requestId?: string;
}

/**
 * Audit logger for AI interactions
 * Logs all AI events for security monitoring and debugging
 */
@Injectable()
export class AiAuditLogger {
  private readonly logger = new Logger(AiAuditLogger.name);

  // In-memory audit log (last 1000 events)
  private readonly auditLog: AuditEvent[] = [];
  private readonly maxLogSize = 1000;

  /**
   * Log a chat request
   */
  logChatRequest(
    userAddress: string,
    content: string,
    requestId?: string,
  ): void {
    this.log({
      type: 'chat_request',
      severity: 'info',
      userAddress,
      timestamp: new Date(),
      requestId,
      data: {
        contentLength: content.length,
        contentPreview: content.substring(0, 100),
      },
    });
  }

  /**
   * Log a chat response
   */
  logChatResponse(
    userAddress: string,
    responseLength: number,
    provider: string,
    durationMs: number,
    requestId?: string,
  ): void {
    this.log({
      type: 'chat_response',
      severity: 'info',
      userAddress,
      timestamp: new Date(),
      requestId,
      data: {
        responseLength,
        provider,
        durationMs,
      },
    });
  }

  /**
   * Log a tool call
   */
  logToolCall(
    userAddress: string,
    toolName: string,
    args: Record<string, unknown>,
    requestId?: string,
  ): void {
    this.log({
      type: 'tool_call',
      severity: 'info',
      userAddress,
      timestamp: new Date(),
      requestId,
      data: {
        toolName,
        args: this.sanitizeArgs(args),
      },
    });
  }

  /**
   * Log a tool result
   */
  logToolResult(
    userAddress: string,
    toolName: string,
    success: boolean,
    requestId?: string,
  ): void {
    this.log({
      type: 'tool_result',
      severity: success ? 'info' : 'warning',
      userAddress,
      timestamp: new Date(),
      requestId,
      data: {
        toolName,
        success,
      },
    });
  }

  /**
   * Log rate limit exceeded
   */
  logRateLimitExceeded(
    userAddress: string,
    limitType: 'minute' | 'hour',
    requestId?: string,
  ): void {
    const event: AuditEvent = {
      type: 'rate_limit_exceeded',
      severity: 'warning',
      userAddress,
      timestamp: new Date(),
      requestId,
      data: {
        limitType,
      },
    };

    this.log(event);

    // Report to Sentry for monitoring
    Sentry.captureMessage(`AI rate limit exceeded: ${userAddress}`, {
      level: 'warning',
      tags: {
        userAddress,
        limitType,
      },
    });
  }

  /**
   * Log dangerous prompt blocked
   */
  logDangerousPromptBlocked(
    userAddress: string,
    pattern: string,
    content: string,
    requestId?: string,
  ): void {
    const event: AuditEvent = {
      type: 'dangerous_prompt_blocked',
      severity: 'error',
      userAddress,
      timestamp: new Date(),
      requestId,
      data: {
        pattern,
        contentPreview: content.substring(0, 200),
      },
    };

    this.log(event);

    // Report to Sentry for security monitoring
    Sentry.captureMessage(`Dangerous AI prompt blocked: ${pattern}`, {
      level: 'error',
      tags: {
        userAddress,
        pattern,
      },
      extra: {
        contentPreview: content.substring(0, 200),
      },
    });
  }

  /**
   * Log validation error
   */
  logValidationError(
    userAddress: string,
    error: string,
    requestId?: string,
  ): void {
    this.log({
      type: 'validation_error',
      severity: 'warning',
      userAddress,
      timestamp: new Date(),
      requestId,
      data: {
        error,
      },
    });
  }

  /**
   * Log security violation (high severity)
   */
  logSecurityViolation(
    userAddress: string,
    violation: string,
    details: Record<string, unknown>,
    requestId?: string,
  ): void {
    const event: AuditEvent = {
      type: 'security_violation',
      severity: 'critical',
      userAddress,
      timestamp: new Date(),
      requestId,
      data: {
        violation,
        ...details,
      },
    };

    this.log(event);

    // Report to Sentry immediately
    Sentry.captureMessage(`AI Security Violation: ${violation}`, {
      level: 'error',
      tags: {
        userAddress,
        violation,
      },
      extra: details,
    });
  }

  private log(event: AuditEvent): void {
    // Add to in-memory log
    this.auditLog.push(event);

    // Trim if exceeds max size
    while (this.auditLog.length > this.maxLogSize) {
      this.auditLog.shift();
    }

    // Log to console based on severity
    const message = `[${event.type}] ${event.userAddress}: ${JSON.stringify(event.data)}`;

    switch (event.severity) {
      case 'info':
        this.logger.debug(message);
        break;
      case 'warning':
        this.logger.warn(message);
        break;
      case 'error':
      case 'critical':
        this.logger.error(message);
        break;
    }
  }

  private sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
    // Remove sensitive data from args before logging
    const sanitized = { ...args };

    const sensitiveKeys = ['password', 'secret', 'key', 'token', 'seed', 'mnemonic'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
