/**
 * Sentry Client Configuration for Next.js Web App
 *
 * This file is loaded by @sentry/nextjs automatically during build.
 * It will NOT be active until @sentry/nextjs is installed and
 * next.config.ts is wrapped with withSentryConfig().
 *
 * TODO: To activate Sentry in the web app:
 * 1. pnpm --filter @e-y/web add @sentry/nextjs
 * 2. Update next.config.ts:
 *    import { withSentryConfig } from '@sentry/nextjs';
 *    export default withSentryConfig(nextConfig, { ... });
 * 3. Set NEXT_PUBLIC_SENTRY_DSN in environment variables
 * 4. Uncomment the code below
 */

// import * as Sentry from '@sentry/nextjs';
//
// Sentry.init({
//   dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
//   environment: process.env.NODE_ENV || 'development',
//   release: `e-y-web@${process.env.npm_package_version || '0.1.0'}`,
//
//   // Performance monitoring
//   tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
//
//   // Session replay for debugging (captures 10% of sessions, 100% of errored sessions)
//   replaysSessionSampleRate: 0.1,
//   replaysOnErrorSampleRate: 1.0,
//
//   // Don't send in development unless explicitly enabled
//   enabled: process.env.NODE_ENV !== 'development' || !!process.env.NEXT_PUBLIC_SENTRY_DEBUG,
//
//   // Filter noisy errors
//   beforeSend(event) {
//     // Skip network connectivity errors
//     if (event.exception?.values?.[0]?.type === 'TypeError' &&
//         event.exception?.values?.[0]?.value?.includes('Failed to fetch')) {
//       return null;
//     }
//     return event;
//   },
//
//   integrations: [
//     Sentry.browserTracingIntegration(),
//     Sentry.replayIntegration(),
//   ],
// });
