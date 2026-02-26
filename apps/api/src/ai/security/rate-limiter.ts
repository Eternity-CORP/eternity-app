import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
  limit: number;
}

/**
 * In-memory rate limiter for AI requests
 * Implements sliding window rate limiting per user address
 */
@Injectable()
export class AiRateLimiter implements OnModuleDestroy {
  private readonly logger = new Logger(AiRateLimiter.name);

  // Rate limit storage: userAddress -> window -> entry
  private readonly minuteWindow = new Map<string, RateLimitEntry>();
  private readonly hourWindow = new Map<string, RateLimitEntry>();

  // Rate limit configuration
  private readonly minuteConfig: RateLimitConfig = {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
  };

  private readonly hourConfig: RateLimitConfig = {
    maxRequests: 30,
    windowMs: 60 * 60 * 1000, // 1 hour
  };

  // Cleanup interval
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Check if request is allowed under rate limits
   * Returns the most restrictive limit status
   */
  checkLimit(userAddress: string): RateLimitResult {
    const normalizedAddress = userAddress.toLowerCase();
    const now = Date.now();

    // Check minute limit first (more restrictive)
    const minuteResult = this.checkWindow(
      normalizedAddress,
      this.minuteWindow,
      this.minuteConfig,
      now,
    );

    if (!minuteResult.allowed) {
      this.logger.warn(
        `Rate limit exceeded (minute) for ${normalizedAddress}`,
      );
      return minuteResult;
    }

    // Check hour limit
    const hourResult = this.checkWindow(
      normalizedAddress,
      this.hourWindow,
      this.hourConfig,
      now,
    );

    if (!hourResult.allowed) {
      this.logger.warn(`Rate limit exceeded (hour) for ${normalizedAddress}`);
      return hourResult;
    }

    // Both passed, return the more restrictive remaining
    return minuteResult.remaining < hourResult.remaining
      ? minuteResult
      : hourResult;
  }

  /**
   * Record a request (call after successful validation)
   */
  recordRequest(userAddress: string): void {
    const normalizedAddress = userAddress.toLowerCase();
    const now = Date.now();

    this.incrementWindow(
      normalizedAddress,
      this.minuteWindow,
      this.minuteConfig,
      now,
    );
    this.incrementWindow(
      normalizedAddress,
      this.hourWindow,
      this.hourConfig,
      now,
    );
  }

  /**
   * Get current usage stats for a user
   */
  getUsage(userAddress: string): {
    minute: { used: number; limit: number; resetIn: number };
    hour: { used: number; limit: number; resetIn: number };
  } {
    const normalizedAddress = userAddress.toLowerCase();
    const now = Date.now();

    const minuteEntry = this.minuteWindow.get(normalizedAddress);
    const hourEntry = this.hourWindow.get(normalizedAddress);

    return {
      minute: {
        used: this.getValidCount(minuteEntry, this.minuteConfig, now),
        limit: this.minuteConfig.maxRequests,
        resetIn: this.getResetTime(minuteEntry, this.minuteConfig, now),
      },
      hour: {
        used: this.getValidCount(hourEntry, this.hourConfig, now),
        limit: this.hourConfig.maxRequests,
        resetIn: this.getResetTime(hourEntry, this.hourConfig, now),
      },
    };
  }

  private checkWindow(
    address: string,
    window: Map<string, RateLimitEntry>,
    config: RateLimitConfig,
    now: number,
  ): RateLimitResult {
    const entry = window.get(address);
    const count = this.getValidCount(entry, config, now);

    return {
      allowed: count < config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      resetIn: this.getResetTime(entry, config, now),
      limit: config.maxRequests,
    };
  }

  private incrementWindow(
    address: string,
    window: Map<string, RateLimitEntry>,
    config: RateLimitConfig,
    now: number,
  ): void {
    const entry = window.get(address);

    if (!entry || now - entry.windowStart >= config.windowMs) {
      // New window
      window.set(address, {
        count: 1,
        windowStart: now,
      });
    } else {
      // Increment existing window
      entry.count++;
    }
  }

  private getValidCount(
    entry: RateLimitEntry | undefined,
    config: RateLimitConfig,
    now: number,
  ): number {
    if (!entry) return 0;
    if (now - entry.windowStart >= config.windowMs) return 0;
    return entry.count;
  }

  private getResetTime(
    entry: RateLimitEntry | undefined,
    config: RateLimitConfig,
    now: number,
  ): number {
    if (!entry) return 0;
    const elapsed = now - entry.windowStart;
    if (elapsed >= config.windowMs) return 0;
    return Math.ceil((config.windowMs - elapsed) / 1000); // seconds
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    // Clean minute window
    for (const [address, entry] of this.minuteWindow) {
      if (now - entry.windowStart >= this.minuteConfig.windowMs) {
        this.minuteWindow.delete(address);
        cleaned++;
      }
    }

    // Clean hour window
    for (const [address, entry] of this.hourWindow) {
      if (now - entry.windowStart >= this.hourConfig.windowMs) {
        this.hourWindow.delete(address);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }
}
