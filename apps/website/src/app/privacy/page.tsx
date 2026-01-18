import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Eternity',
  description: 'Eternity Privacy Policy - How we handle your data',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-6 py-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted hover:text-black transition-colors mb-8"
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
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-black">Privacy Policy</h1>
          <p className="text-muted mb-12">Last updated: January 2026</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-black mb-4">Introduction</h2>
              <p className="text-muted leading-relaxed">
                Eternity ("we", "our", or "us") is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, and safeguard your
                information when you use our mobile wallet application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">
                Information We Collect
              </h2>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-surface-light border border-black/5">
                  <h3 className="font-semibold text-black mb-2">Email Address</h3>
                  <p className="text-muted text-sm">
                    If you join our waitlist, we collect your email address to notify
                    you about early access and updates.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-surface-light border border-black/5">
                  <h3 className="font-semibold text-black mb-2">
                    Public Wallet Addresses
                  </h3>
                  <p className="text-muted text-sm">
                    Your public wallet addresses are stored to provide wallet
                    functionality. These are public blockchain data.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-surface-light border border-black/5">
                  <h3 className="font-semibold text-black mb-2">@username</h3>
                  <p className="text-muted text-sm">
                    If you register a username, we store the mapping between your
                    username and wallet address.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">
                Information We DO NOT Collect
              </h2>
              <ul className="space-y-2 text-muted">
                <li className="flex items-center gap-2">
                  <span className="text-black">✓</span>
                  Private keys or seed phrases
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-black">✓</span>
                  Personal identification information (until SHARD Identity)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-black">✓</span>
                  Transaction contents beyond what's public on blockchain
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-black">✓</span>
                  Location data
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">Third Parties</h2>
              <p className="text-muted leading-relaxed mb-4">
                We use the following third-party services:
              </p>
              <ul className="space-y-2 text-muted">
                <li>
                  <strong className="text-black">Alchemy</strong> - Blockchain RPC
                  provider for transaction processing
                </li>
                <li>
                  <strong className="text-black">CoinGecko</strong> - Price data for
                  displaying USD values
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">Your Rights</h2>
              <p className="text-muted leading-relaxed">
                You have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted mt-4">
                <li>Request deletion of your waitlist data</li>
                <li>Export your username registration</li>
                <li>Opt out of marketing communications</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">Contact Us</h2>
              <p className="text-muted leading-relaxed">
                For privacy-related inquiries, contact us at:{' '}
                <a
                  href="mailto:privacy@eternity.app"
                  className="text-accent-blue hover:underline"
                >
                  privacy@eternity.app
                </a>
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  )
}
