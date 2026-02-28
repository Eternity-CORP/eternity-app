'use client'

import Link from 'next/link'
import { useEffect } from 'react'

/**
 * Root-level error boundary — catches errors from all pages
 * rendered inside the root layout.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ErrorBoundary]', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center relative z-[2] px-4">
      <div className="glass-card rounded-2xl p-10 max-w-md w-full text-center">
        {/* Error icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center mx-auto mb-6">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#EF4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gradient mb-3">
          Something went wrong
        </h2>

        <p className="text-[var(--foreground-subtle)] mb-8 leading-relaxed">
          An unexpected error occurred. You can try again or return to the wallet.
        </p>

        {/* Dev-only error details */}
        {process.env.NODE_ENV === 'development' && (
          <pre className="text-left text-[13px] text-[#EF4444]/80 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl p-4 mb-6 overflow-auto max-h-[200px] whitespace-pre-wrap break-words">
            {error.message}
            {error.stack && (
              <>
                {'\n\n'}
                {error.stack}
              </>
            )}
          </pre>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => reset()}
            className="flex-1 px-6 py-3.5 bg-[var(--foreground)] text-[var(--background)] font-semibold rounded-xl hover:opacity-90 transition-all shimmer hover:scale-[1.02] active:scale-[0.98]"
          >
            Try again
          </button>
          <Link
            href="/wallet"
            className="flex-1 px-6 py-3.5 glass-card text-[var(--foreground)] font-semibold rounded-xl transition-all text-center hover:scale-[1.02] active:scale-[0.98]"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
