import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | Eternity',
  description: 'Eternity Terms of Service',
}

export default function TermsPage() {
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
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>Terms of Service</h1>
          <p className="mb-12" style={{ color: 'var(--foreground-muted)' }}>Last updated: February 2026</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                1. Acceptance of Terms
              </h2>
              <p className="leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
                By accessing or using Eternity (&ldquo;the App&rdquo;), you agree to be bound by these
                Terms of Service. If you do not agree to these terms, do not use the App.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                2. Service Description
              </h2>
              <p className="leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
                Eternity is a self-custody cryptocurrency wallet application. The App
                allows you to:
              </p>
              <ul className="list-disc list-inside space-y-2 mt-4" style={{ color: 'var(--foreground-muted)' }}>
                <li>Create and manage cryptocurrency wallets</li>
                <li>Send and receive cryptocurrencies</li>
                <li>View token balances and transaction history</li>
                <li>Use BLIK codes for simplified transfers</li>
                <li>Register and use @usernames</li>
                <li>Interact with an AI Agent for wallet assistance</li>
                <li>Create and manage on-chain business wallets with tokenized equity and governance</li>
              </ul>
              <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <p className="text-amber-800 dark:text-amber-200 text-sm">
                  <strong>Note:</strong> The current version operates on Sepolia testnet
                  only. Do not use real funds.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                3. User Responsibilities
              </h2>
              <div className="space-y-4">
                <div className="p-4 rounded-lg" style={{ background: 'var(--surface-light)', border: '1px solid var(--border-light)' }}>
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                    Seed Phrase Security
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                    You are solely responsible for securing your seed phrase. We
                    cannot recover your wallet if you lose it. Never share your seed
                    phrase with anyone.
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: 'var(--surface-light)', border: '1px solid var(--border-light)' }}>
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Lawful Use</h3>
                  <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                    You agree to use the App only for lawful purposes and in
                    compliance with all applicable laws and regulations.
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{ background: 'var(--surface-light)', border: '1px solid var(--border-light)' }}>
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                    Transaction Verification
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                    Always verify transaction details before confirming.
                    Cryptocurrency transactions are irreversible.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                4. AI Agent
              </h2>
              <p className="leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
                The AI Agent provides conversational wallet assistance. It can suggest
                transactions, provide balance information, and help with wallet operations.
                The AI Agent does not have independent access to execute transactions —
                all actions require your explicit confirmation.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>5. Disclaimers</h2>
              <ul className="space-y-4" style={{ color: 'var(--foreground-muted)' }}>
                <li>
                  <strong style={{ color: 'var(--foreground)' }}>Not Financial Advice:</strong> The
                  App does not provide financial, investment, or trading advice.
                </li>
                <li>
                  <strong style={{ color: 'var(--foreground)' }}>No Guarantee:</strong> We do not
                  guarantee the accuracy of price data or transaction success.
                </li>
                <li>
                  <strong style={{ color: 'var(--foreground)' }}>Third-Party Services:</strong> We
                  are not responsible for third-party services (blockchain networks,
                  RPC providers, AI model providers).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                6. Limitation of Liability
              </h2>
              <p className="leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
                To the maximum extent permitted by law, Eternity and its team shall not be
                liable for any indirect, incidental, special, consequential, or
                punitive damages, including loss of funds, data, or profits.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                7. Changes to Terms
              </h2>
              <p className="leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
                We may update these Terms from time to time. Continued use of the App
                after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>8. Contact</h2>
              <p className="leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
                For questions about these Terms, contact us at{' '}
                <a href="mailto:eternity.shard.business@gmail.com" className="underline" style={{ color: 'var(--foreground)' }}>
                  eternity.shard.business@gmail.com
                </a>.
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  )
}
