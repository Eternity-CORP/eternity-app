import { Injectable, Logger } from '@nestjs/common';
import { AiRateLimiter, RateLimitResult } from './rate-limiter';
import { AiAuditLogger } from './audit-logger';

export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  code?: string;
  rateLimit?: RateLimitResult;
}

export interface ValidatedMessage {
  content: string;
  sanitized: boolean;
}

/**
 * AI Security Service
 * Provides input validation, rate limiting, and security checks
 */
@Injectable()
export class AiSecurityService {
  private readonly logger = new Logger(AiSecurityService.name);

  // Maximum message length
  private readonly maxMessageLength = 1000;

  // Dangerous patterns to block
  private readonly dangerousPatterns: Array<{ pattern: RegExp; name: string }> =
    [
      { pattern: /seed\s*phrase/i, name: 'seed_phrase' },
      { pattern: /private\s*key/i, name: 'private_key' },
      { pattern: /mnemonic/i, name: 'mnemonic' },
      { pattern: /secret\s*recovery/i, name: 'secret_recovery' },
      {
        pattern: /ignore\s*(previous|all|prior)\s*instructions/i,
        name: 'prompt_injection',
      },
      {
        pattern: /disregard\s*(previous|all|prior)\s*instructions/i,
        name: 'prompt_injection',
      },
      { pattern: /you\s*are\s*now\s*a/i, name: 'role_hijacking' },
      { pattern: /pretend\s*you\s*are/i, name: 'role_hijacking' },
      { pattern: /act\s*as\s*if\s*you/i, name: 'role_hijacking' },
      { pattern: /reveal\s*your\s*(system|initial)\s*prompt/i, name: 'prompt_extraction' },
      { pattern: /what\s*are\s*your\s*instructions/i, name: 'prompt_extraction' },
    ];

  // Suspicious patterns to flag (not block)
  private readonly suspiciousPatterns: RegExp[] = [
    /export\s*(wallet|account)/i,
    /transfer\s*all/i,
    /maximum\s*amount/i,
    /drain/i,
  ];

  constructor(
    private readonly rateLimiter: AiRateLimiter,
    private readonly auditLogger: AiAuditLogger,
  ) {}

  /**
   * Perform all security checks on an incoming message
   */
  async checkMessage(
    userAddress: string,
    content: string,
    requestId?: string,
  ): Promise<SecurityCheckResult> {
    // 1. Check rate limits first
    const rateLimit = this.rateLimiter.checkLimit(userAddress);
    if (!rateLimit.allowed) {
      this.auditLogger.logRateLimitExceeded(
        userAddress,
        rateLimit.resetIn > 60 ? 'hour' : 'minute',
        requestId,
      );

      return {
        allowed: false,
        reason: `Rate limit exceeded. Try again in ${rateLimit.resetIn} seconds.`,
        code: 'RATE_LIMIT_EXCEEDED',
        rateLimit,
      };
    }

    // 2. Check message length
    if (content.length > this.maxMessageLength) {
      this.auditLogger.logValidationError(
        userAddress,
        `Message too long: ${content.length} chars`,
        requestId,
      );

      return {
        allowed: false,
        reason: `Message too long. Maximum ${this.maxMessageLength} characters allowed.`,
        code: 'MESSAGE_TOO_LONG',
        rateLimit,
      };
    }

    // 3. Check for dangerous patterns
    for (const { pattern, name } of this.dangerousPatterns) {
      if (pattern.test(content)) {
        this.auditLogger.logDangerousPromptBlocked(
          userAddress,
          name,
          content,
          requestId,
        );

        return {
          allowed: false,
          reason: this.getDangerousPatternMessage(name),
          code: 'DANGEROUS_PROMPT',
          rateLimit,
        };
      }
    }

    // 4. Check for suspicious patterns (log but allow)
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(content)) {
        this.logger.warn(
          `Suspicious pattern detected from ${userAddress}: ${pattern}`,
        );
        this.auditLogger.logSecurityViolation(
          userAddress,
          'suspicious_pattern',
          {
            pattern: pattern.toString(),
            contentPreview: content.substring(0, 100),
          },
          requestId,
        );
        // Allow but flag
        break;
      }
    }

    // 5. Log the request
    this.auditLogger.logChatRequest(userAddress, content, requestId);

    return {
      allowed: true,
      rateLimit,
    };
  }

  /**
   * Validate and sanitize a message
   */
  validateMessage(content: string): ValidatedMessage {
    let sanitized = content;
    let wasSanitized = false;

    // Trim whitespace
    sanitized = sanitized.trim();
    if (sanitized !== content) {
      wasSanitized = true;
    }

    // Remove null bytes and control characters
    const cleaned = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    if (cleaned !== sanitized) {
      wasSanitized = true;
      sanitized = cleaned;
    }

    // Truncate if too long
    if (sanitized.length > this.maxMessageLength) {
      sanitized = sanitized.substring(0, this.maxMessageLength);
      wasSanitized = true;
    }

    return {
      content: sanitized,
      sanitized: wasSanitized,
    };
  }

  /**
   * Validate tool call parameters
   * Ensures user can only access their own data
   */
  validateToolCall(
    userAddress: string,
    toolName: string,
    args: Record<string, unknown>,
    requestId?: string,
  ): SecurityCheckResult {
    this.auditLogger.logToolCall(userAddress, toolName, args, requestId);

    // Check if tool tries to access another user's data
    const targetAddress = args.address || args.userAddress || args.targetAddress;

    if (
      targetAddress &&
      typeof targetAddress === 'string' &&
      targetAddress.toLowerCase() !== userAddress.toLowerCase()
    ) {
      this.auditLogger.logSecurityViolation(
        userAddress,
        'unauthorized_data_access',
        {
          toolName,
          targetAddress,
          ownAddress: userAddress,
        },
        requestId,
      );

      return {
        allowed: false,
        reason: 'Cannot access data for other users',
        code: 'UNAUTHORIZED_ACCESS',
      };
    }

    // Validate specific tools
    switch (toolName) {
      case 'prepare_send':
        // Validate send parameters
        if (!args.recipient || !args.amount || !args.token) {
          return {
            allowed: false,
            reason: 'Missing required parameters for send',
            code: 'INVALID_PARAMS',
          };
        }

        // Validate amount is positive
        const amount = parseFloat(args.amount as string);
        if (isNaN(amount) || amount <= 0) {
          return {
            allowed: false,
            reason: 'Invalid amount',
            code: 'INVALID_AMOUNT',
          };
        }
        break;

      case 'get_history':
        // Validate limit
        const limit = args.limit as number | undefined;
        if (limit !== undefined && (limit < 1 || limit > 100)) {
          return {
            allowed: false,
            reason: 'Limit must be between 1 and 100',
            code: 'INVALID_LIMIT',
          };
        }
        break;
    }

    return { allowed: true };
  }

  /**
   * Record a successful request (for rate limiting)
   */
  recordRequest(userAddress: string): void {
    this.rateLimiter.recordRequest(userAddress);
  }

  /**
   * Log tool result
   */
  logToolResult(
    userAddress: string,
    toolName: string,
    success: boolean,
    requestId?: string,
  ): void {
    this.auditLogger.logToolResult(userAddress, toolName, success, requestId);
  }

  /**
   * Log chat response
   */
  logChatResponse(
    userAddress: string,
    responseLength: number,
    provider: string,
    durationMs: number,
    requestId?: string,
  ): void {
    this.auditLogger.logChatResponse(
      userAddress,
      responseLength,
      provider,
      durationMs,
      requestId,
    );
  }

  /**
   * Get rate limit usage for a user
   */
  getRateLimitUsage(userAddress: string) {
    return this.rateLimiter.getUsage(userAddress);
  }

  private getDangerousPatternMessage(patternName: string): string {
    switch (patternName) {
      case 'seed_phrase':
      case 'private_key':
      case 'mnemonic':
      case 'secret_recovery':
        return 'I cannot help with seed phrases, private keys, or recovery phrases. Never share these with anyone!';
      case 'prompt_injection':
      case 'role_hijacking':
        return 'I detected an attempt to manipulate my instructions. I can only help with wallet-related tasks.';
      case 'prompt_extraction':
        return 'I cannot reveal my system instructions. How can I help you with your wallet?';
      default:
        return 'This request cannot be processed for security reasons.';
    }
  }
}
