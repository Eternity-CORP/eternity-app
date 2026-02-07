/**
 * Error Tracking Service
 * Sentry integration for crash reporting and error monitoring
 * Gracefully degrades in Expo Go where native modules are unavailable
 */

import Constants from 'expo-constants';
import { createLogger } from '@/src/utils/logger';

const log = createLogger('ErrorTracking');

// Lazily loaded Sentry module — gracefully fails in Expo Go
let Sentry: typeof import('@sentry/react-native') | null = null;

try {
  Sentry = require('@sentry/react-native');
} catch {
  log.debug('Sentry native modules not available (Expo Go)');
}

// Environment-based configuration
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
const IS_DEV = __DEV__;

type SeverityLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

/**
 * Initialize Sentry error tracking
 * Call this at app startup in _layout.tsx
 */
export function initErrorTracking(): void {
  if (!Sentry) {
    log.debug('Sentry not available (Expo Go), error tracking disabled');
    return;
  }

  if (!SENTRY_DSN) {
    log.debug('Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    debug: IS_DEV,
    environment: IS_DEV ? 'development' : 'production',
    release: `${Constants.expoConfig?.slug}@${Constants.expoConfig?.version}`,
    dist: Constants.expoConfig?.version,

    // Performance monitoring
    tracesSampleRate: IS_DEV ? 1.0 : 0.2,

    // Don't send events in development unless explicitly enabled
    enabled: !IS_DEV || process.env.EXPO_PUBLIC_SENTRY_DEBUG === 'true',

    // Filter out non-critical errors
    beforeSend(event) {
      // Filter out network errors that are expected
      if (event.exception?.values?.[0]?.type === 'NetworkError') {
        return null;
      }
      return event;
    },

    // Automatically capture unhandled rejections
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
  });

  log.info('Sentry initialized');
}

/**
 * Set user context for error tracking
 * Call this after user authentication
 */
export function setUserContext(walletAddress: string, username?: string): void {
  Sentry?.setUser({
    id: walletAddress.toLowerCase(),
    username: username || undefined,
  });
}

/**
 * Clear user context on logout
 */
export function clearUserContext(): void {
  Sentry?.setUser(null);
}

/**
 * Capture an exception manually
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, unknown>
): string {
  if (!Sentry) return '';
  if (context) {
    Sentry.setContext('additional', context);
  }
  return Sentry.captureException(error);
}

/**
 * Capture a message (non-error event)
 */
export function captureMessage(
  message: string,
  level: SeverityLevel = 'info'
): string {
  if (!Sentry) return '';
  return Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: {
  category: string;
  message: string;
  level?: SeverityLevel;
  data?: Record<string, unknown>;
}): void {
  Sentry?.addBreadcrumb({
    category: breadcrumb.category,
    message: breadcrumb.message,
    level: breadcrumb.level || 'info',
    data: breadcrumb.data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set custom tag for filtering in Sentry dashboard
 */
export function setTag(key: string, value: string): void {
  Sentry?.setTag(key, value);
}

/**
 * Set extra context data
 */
export function setExtra(key: string, value: unknown): void {
  Sentry?.setExtra(key, value);
}

/**
 * Start a performance transaction
 */
export function startTransaction(
  name: string,
  op: string
) {
  return Sentry?.startInactiveSpan({ name, op });
}

/**
 * Wrap a component with Sentry error boundary
 * Falls back to null in Expo Go
 */
export const ErrorBoundary = Sentry?.ErrorBoundary ?? null;

/**
 * Wrap navigation container with Sentry
 * Falls back to identity function in Expo Go
 */
export const withSentry = Sentry?.wrap ?? (<T>(component: T) => component);

/**
 * Native crash handling (for production builds)
 */
export function enableNativeCrashHandling(): void {
  Sentry?.nativeCrash;
}

// Pre-defined breadcrumb categories
export const BreadcrumbCategory = {
  NAVIGATION: 'navigation',
  USER_ACTION: 'user.action',
  TRANSACTION: 'transaction',
  WALLET: 'wallet',
  BLIK: 'blik',
  NETWORK: 'network',
  API: 'api',
} as const;

// Export Sentry for direct access if needed (may be null in Expo Go)
export { Sentry };
