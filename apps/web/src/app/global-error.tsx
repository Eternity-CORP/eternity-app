'use client'

/**
 * Global error boundary — catches errors in the root layout itself.
 * This is the last line of defense; it replaces the entire HTML shell,
 * so it must include its own <html> and <body> tags.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en" className="dark">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          color: '#fff',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            textAlign: 'center',
            maxWidth: 480,
            padding: '0 24px',
          }}
        >
          {/* Error icon */}
          <div
            style={{
              width: 64,
              height: 64,
              margin: '0 auto 24px',
              borderRadius: 16,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
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

          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              marginBottom: 12,
              letterSpacing: '-0.02em',
            }}
          >
            Critical Error
          </h1>

          <p
            style={{
              fontSize: 16,
              color: 'rgba(255, 255, 255, 0.4)',
              marginBottom: 32,
              lineHeight: 1.6,
            }}
          >
            The application encountered an unexpected error and could not recover.
            Please try again.
          </p>

          {process.env.NODE_ENV === 'development' && (
            <pre
              style={{
                textAlign: 'left',
                padding: 16,
                marginBottom: 24,
                borderRadius: 12,
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                color: 'rgba(239, 68, 68, 0.8)',
                fontSize: 13,
                overflow: 'auto',
                maxHeight: 200,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {error.message}
            </pre>
          )}

          <button
            onClick={() => reset()}
            style={{
              padding: '14px 32px',
              background: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
