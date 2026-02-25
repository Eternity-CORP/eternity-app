'use client'

import { buildOnramperUrl } from '@e-y/shared'
import { useAccount } from '@/contexts/account-context'
import Navigation from '@/components/Navigation'
import BackButton from '@/components/BackButton'
import { useAuthGuard } from '@/hooks/useAuthGuard'

export default function DepositPage() {
  useAuthGuard()
  const { address, currentAccount } = useAccount()

  const isTestAccount = currentAccount?.type === 'test'

  const onramperUrl = buildOnramperUrl(address, 'pk_prod_01JFGCX6TRMG3CXE5FE43130GG')

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-12 pb-12">
        <div className="w-full max-w-[420px]">
          <BackButton />
          <div className="glass-card gradient-border rounded-2xl p-6">
            <h1 className="text-xl font-semibold text-white text-center mb-6">Buy Crypto</h1>

            {isTestAccount ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#eab308]/10 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">Deposits unavailable on testnet</h2>
                <p className="text-sm text-white/50 mb-1">
                  Buying crypto with fiat requires a real mainnet account.
                </p>
                <p className="text-sm text-white/50 mb-6">
                  Switch to a real account to use fiat on-ramp and purchase crypto.
                </p>
                <button
                  onClick={() => window.history.back()}
                  className="px-6 py-3 rounded-xl font-medium transition-all bg-white/10 text-white hover:bg-white/15"
                >
                  Go back
                </button>
              </div>
            ) : onramperUrl ? (
              <iframe
                src={onramperUrl}
                className="w-full rounded-xl border border-white/10"
                style={{ height: '600px' }}
                allow="accelerometer; autoplay; camera; gyroscope; payment"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
                title="Buy crypto with Onramper"
              />
            ) : (
              <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
