import Link from 'next/link'

/**
 * Custom 404 page — shown when a route does not exist.
 * This is a Server Component by default (no 'use client' needed).
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center relative z-[2] px-4">
      <div className="glass-card rounded-2xl p-10 max-w-md w-full text-center">
        {/* 404 icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#3388FF]/10 border border-[#3388FF]/20 flex items-center justify-center mx-auto mb-6">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#3388FF"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </div>

        <h2 className="text-5xl font-bold text-gradient-accent mb-4">404</h2>

        <h3 className="text-xl font-semibold text-gradient mb-3">
          Page not found
        </h3>

        <p className="text-[var(--foreground-subtle)] mb-8 leading-relaxed">
          The page you are looking for does not exist or has been moved.
        </p>

        <Link
          href="/wallet"
          className="inline-block px-8 py-3.5 bg-[var(--foreground)] text-[var(--background)] font-semibold rounded-xl hover:opacity-90 transition-all shimmer hover:scale-[1.02] active:scale-[0.98]"
        >
          Go to Wallet
        </Link>
      </div>
    </div>
  )
}
