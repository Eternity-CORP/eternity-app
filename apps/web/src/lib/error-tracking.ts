/**
 * Error Tracking Service for Web App
 *
 * Provides a lightweight Sentry-like interface for the Next.js web app.
 * When @sentry/nextjs is installed and configured (via NEXT_PUBLIC_SENTRY_DSN),
 * all calls are forwarded to Sentry. Otherwise, errors are logged to the console
 * with structured context for debugging.
 *
 * TODO: Install @sentry/nextjs and create sentry.client.config.ts when ready:
 *   pnpm --filter @e-y/web add @sentry/nextjs
 *   Then create apps/web/sentry.client.config.ts with Sentry.init()
 *   And update next.config.ts with withSentryConfig()
 */

type SeverityLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

interface BreadcrumbData {
  category: string;
  message: string;
  level?: SeverityLevel;
  data?: Record<string, unknown>;
}

/**
 * Sentry interface — the subset of the Sentry SDK we use.
 * This avoids a hard dependency on @sentry/nextjs at compile time.
 */
interface SentryLike {
  setUser(user: { id: string; username?: string } | null): void;
  setContext(name: string, context: Record<string, unknown>): void;
  setTag(key: string, value: string): void;
  captureException(error: unknown): string;
  captureMessage(message: string, level?: string): string;
  addBreadcrumb(breadcrumb: {
    category?: string;
    message?: string;
    level?: string;
    data?: Record<string, unknown>;
    timestamp?: number;
  }): void;
}

// Try to load Sentry if available (installed as optional peer dep)
let Sentry: SentryLike | null = null;

try {
  // Dynamic require — only works when @sentry/nextjs is installed
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Sentry = require('@sentry/nextjs') as SentryLike;
} catch {
  // @sentry/nextjs not installed — graceful degradation
}

const IS_DEV = process.env.NODE_ENV === 'development';
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || '';

let initialized = false;

/**
 * Initialize error tracking.
 * Call once at app startup (e.g., in Providers component).
 */
export function initErrorTracking(): void {
  if (initialized) return;
  initialized = true;

  if (!Sentry) {
    if (IS_DEV) {
      console.debug('[ErrorTracking] @sentry/nextjs not installed — using console fallback');
    }
    return;
  }

  if (!SENTRY_DSN) {
    if (IS_DEV) {
      console.debug('[ErrorTracking] NEXT_PUBLIC_SENTRY_DSN not set — Sentry disabled');
    }
    return;
  }

  // If Sentry is available, initialization happens in sentry.client.config.ts
  // (managed by @sentry/nextjs build plugin). No need to call init() here.
  console.info('[ErrorTracking] Sentry is available and should be initialized via config');
}

/**
 * Set user context (call after wallet is loaded).
 */
export function setUserContext(walletAddress: string, username?: string): void {
  if (Sentry && SENTRY_DSN) {
    Sentry.setUser({
      id: walletAddress.toLowerCase(),
      username: username || undefined,
    });
  }
}

/**
 * Clear user context (call on logout / disconnect).
 */
export function clearUserContext(): void {
  if (Sentry && SENTRY_DSN) {
    Sentry.setUser(null);
  }
}

/**
 * Capture an exception.
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, unknown>,
): void {
  if (Sentry && SENTRY_DSN) {
    if (context) {
      Sentry.setContext('additional', context);
    }
    Sentry.captureException(error);
    return;
  }

  // Console fallback
  console.error('[ErrorTracking] Exception:', error, context || '');
}

/**
 * Capture a message (non-error event).
 */
export function captureMessage(
  message: string,
  level: SeverityLevel = 'info',
): void {
  if (Sentry && SENTRY_DSN) {
    Sentry.captureMessage(message, level);
    return;
  }

  // Console fallback
  const logFn = level === 'error' || level === 'fatal'
    ? console.error
    : level === 'warning'
      ? console.warn
      : console.info;
  logFn(`[ErrorTracking] ${level}: ${message}`);
}

/**
 * Add breadcrumb for debugging trail.
 */
export function addBreadcrumb(breadcrumb: BreadcrumbData): void {
  if (Sentry && SENTRY_DSN) {
    Sentry.addBreadcrumb({
      category: breadcrumb.category,
      message: breadcrumb.message,
      level: breadcrumb.level || 'info',
      data: breadcrumb.data,
      timestamp: Date.now() / 1000,
    });
    return;
  }

  if (IS_DEV) {
    console.debug(
      `[Breadcrumb:${breadcrumb.category}] ${breadcrumb.message}`,
      breadcrumb.data || '',
    );
  }
}

/**
 * Set a tag for filtering in Sentry dashboard.
 */
export function setTag(key: string, value: string): void {
  if (Sentry && SENTRY_DSN) {
    Sentry.setTag(key, value);
  }
}

// Pre-defined breadcrumb categories (matches mobile conventions)
export const BreadcrumbCategory = {
  NAVIGATION: 'navigation',
  USER_ACTION: 'user.action',
  TRANSACTION: 'transaction',
  WALLET: 'wallet',
  BLIK: 'blik',
  NETWORK: 'network',
  API: 'api',
  SWAP: 'swap',
} as const;
