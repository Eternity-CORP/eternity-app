import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | Eternity',
  description: 'Eternity Terms of Service',
}

export default function TermsPage() {
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
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-black">Terms of Service</h1>
          <p className="text-muted mb-12">Last updated: January 2026</p>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-black mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-muted leading-relaxed">
                By accessing or using Eternity ("the App"), you agree to be bound by these
                Terms of Service. If you do not agree to these terms, do not use the
                App.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">
                2. Service Description
              </h2>
              <p className="text-muted leading-relaxed">
                Eternity is a self-custody cryptocurrency wallet application. The App
                allows you to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted mt-4">
                <li>Create and manage cryptocurrency wallets</li>
                <li>Send and receive cryptocurrencies</li>
                <li>View token balances and transaction history</li>
                <li>Use BLIK codes for simplified transfers</li>
                <li>Register and use @usernames</li>
              </ul>
              <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-amber-800 text-sm">
                  <strong>Note:</strong> The current version operates on testnet
                  only. Do not use real funds.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">
                3. User Responsibilities
              </h2>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-surface-light border border-black/5">
                  <h3 className="font-semibold text-black mb-2">
                    Seed Phrase Security
                  </h3>
                  <p className="text-muted text-sm">
                    You are solely responsible for securing your seed phrase. We
                    cannot recover your wallet if you lose it. Never share your seed
                    phrase with anyone.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-surface-light border border-black/5">
                  <h3 className="font-semibold text-black mb-2">Lawful Use</h3>
                  <p className="text-muted text-sm">
                    You agree to use the App only for lawful purposes and in
                    compliance with all applicable laws and regulations.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-surface-light border border-black/5">
                  <h3 className="font-semibold text-black mb-2">
                    Transaction Verification
                  </h3>
                  <p className="text-muted text-sm">
                    Always verify transaction details before confirming.
                    Cryptocurrency transactions are irreversible.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">4. Disclaimers</h2>
              <ul className="space-y-4 text-muted">
                <li>
                  <strong className="text-black">Not Financial Advice:</strong> The
                  App does not provide financial, investment, or trading advice.
                </li>
                <li>
                  <strong className="text-black">No Guarantee:</strong> We do not
                  guarantee the accuracy of price data or transaction success.
                </li>
                <li>
                  <strong className="text-black">Third-Party Services:</strong> We
                  are not responsible for third-party services (blockchain networks,
                  RPC providers).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">
                5. Limitation of Liability
              </h2>
              <p className="text-muted leading-relaxed">
                To the maximum extent permitted by law, Eternity and its team shall not be
                liable for any indirect, incidental, special, consequential, or
                punitive damages, including loss of funds, data, or profits.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">
                6. Changes to Terms
              </h2>
              <p className="text-muted leading-relaxed">
                We may update these Terms from time to time. Continued use of the App
                after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-black mb-4">7. Contact</h2>
              <p className="text-muted leading-relaxed">
                For questions about these Terms, please use our waitlist form on the homepage
                and mention your concern. We will get back to you as soon as possible.
              </p>
            </section>
          </div>
        </article>
      </div>
    </main>
  )
}
