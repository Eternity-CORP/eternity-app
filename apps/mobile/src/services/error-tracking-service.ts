/**
 * Error Tracking Service
 * Sentry integration for crash reporting and error monitoring
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

// Environment-based configuration
const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
const IS_DEV = __DEV__;

/**
 * Initialize Sentry error tracking
 * Call this at app startup in _layout.tsx
 */
export function initErrorTracking(): void {
  if (!SENTRY_DSN) {
    console.log('Sentry DSN not configured, error tracking disabled');
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

    // Session replay (if needed in future)
    // replaysSessionSampleRate: 0.1,
    // replaysOnErrorSampleRate: 1.0,

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

  console.log('Sentry initialized');
}

/**
 * Set user context for error tracking
 * Call this after user authentication
 */
export function setUserContext(walletAddress: string, username?: string): void {
  Sentry.setUser({
    id: walletAddress.toLowerCase(),
    username: username || undefined,
  });
}

/**
 * Clear user context on logout
 */
export function clearUserContext(): void {
  Sentry.setUser(null);
}

/**
 * Capture an exception manually
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, unknown>
): string {
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
  level: Sentry.SeverityLevel = 'info'
): string {
  return Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: {
  category: string;
  message: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, unknown>;
}): void {
  Sentry.addBreadcrumb({
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
  Sentry.setTag(key, value);
}

/**
 * Set extra context data
 */
export function setExtra(key: string, value: unknown): void {
  Sentry.setExtra(key, value);
}

/**
 * Start a performance transaction
 */
export function startTransaction(
  name: string,
  op: string
): Sentry.Span | undefined {
  return Sentry.startInactiveSpan({ name, op });
}

/**
 * Wrap a component with Sentry error boundary
 */
export const ErrorBoundary = Sentry.ErrorBoundary;

/**
 * Wrap navigation container with Sentry
 */
export const withSentry = Sentry.wrap;

/**
 * Native crash handling (for production builds)
 */
export function enableNativeCrashHandling(): void {
  Sentry.nativeCrash;
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

// Export Sentry for direct access if needed
export { Sentry };
