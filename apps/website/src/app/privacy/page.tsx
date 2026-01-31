import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Eternity',
  description: 'Eternity Privacy Policy - How we handle your data',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen theme-transition" style={{ background: 'var(--background)' }}>
      <div className="container mx-auto px-6 py-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 transition-colors mb-8"
          style={{ color: 'var(--foreground-muted)' }}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Home
        </Link>

        <article className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>Privacy Policy</h1>
          <p className="mb-12" style={{ color: 'var(--foreground-muted)' }}>Last updated: January 2026</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>Introduction</h2>
              <p className="leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
                Eternity ("we", "our", or "us") is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, and safeguard your
                information when you use our mobile wallet application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                Information We Collect
              </h2>
              <div className="space-y-4">
                <div className="p-4 rounded-lg" style={{ background: 'var(--surface-light)', border: '1px solid var(--border-light)' }}>
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Email Address</h3>
                  <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                    If you join our waitlist, we collect your email address to notify
                    you about early access and updates.
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: 'var(--surface-light)', border: '1px solid var(--border-light)' }}>
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                    Public Wallet Addresses
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                    Your public wallet addresses are stored to provide wallet
                    functionality. These are public blockchain data.
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: 'var(--surface-light)', border: '1px solid var(--border-light)' }}>
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground)' }}>@username</h3>
                  <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                    If you register a username, we store the mapping between your
                    username and wallet address.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                Information We DO NOT Collect
              </h2>
              <ul className="space-y-2" style={{ color: 'var(--foreground-muted)' }}>
                <li className="flex items-center gap-2">
                  <span style={{ color: 'var(--foreground)' }}>✓</span>
                  Private keys or seed phrases
                </li>
                <li className="flex items-center gap-2">
                  <span style={{ color: 'var(--foreground)' }}>✓</span>
                  Personal identification information (until SHARD Identity)
                </li>
                <li className="flex items-center gap-2">
                  <span style={{ color: 'var(--foreground)' }}>✓</span>
                  Transaction contents beyond what's public on blockchain
                </li>
                <li className="flex items-center gap-2">
                  <span style={{ color: 'var(--foreground)' }}>✓</span>
                  Location data
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>Third Parties</h2>
              <p className="leading-relaxed mb-4" style={{ color: 'var(--foreground-muted)' }}>
                We use the following third-party services:
              </p>
              <ul className="space-y-2" style={{ color: 'var(--foreground-muted)' }}>
                <li>
                  <strong style={{ color: 'var(--foreground)' }}>Alchemy</strong> - Blockchain RPC
                  provider for transaction processing
                </li>
                <li>
                  <strong style={{ color: 'var(--foreground)' }}>CoinGecko</strong> - Price data for
                  displaying USD values
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>Your Rights</h2>
              <p className="leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
                You have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-4" style={{ color: 'var(--foreground-muted)' }}>
                <li>Request deletion of your waitlist data</li>
                <li>Export your username registration</li>
                <li>Opt out of marketing communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>Contact Us</h2>
              <p className="leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
                For privacy-related inquiries, please use our waitlist form on the homepage
                and mention your concern. We will get back to you as soon as possible.
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  )
}
