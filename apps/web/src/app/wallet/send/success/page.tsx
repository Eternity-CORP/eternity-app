'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { useAccount } from '@/contexts/account-context'

function SuccessContent() {
  const searchParams = useSearchParams()
  const { network } = useAccount()
  const hash = searchParams.get('hash')

  const shortHash = hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : ''
  const explorerUrl = hash ? network.explorerTxUrl(hash) : ''

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="max-w-[480px] mx-auto px-6 py-16">
        <div className="glass-card gradient-border rounded-2xl p-8 text-center">
          {/* Success icon */}
          <div className="w-20 h-20 mx-auto rounded-full bg-[#22c55e]/8 border-2 border-[#22c55e]/20 flex items-center justify-center mb-8">
            <svg className="w-10 h-10 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gradient mb-2">Transaction Sent</h1>
          <p className="text-white/50 mb-8">
            Your transaction has been submitted to the network
          </p>

          {/* Transaction hash */}
          {hash && (
            <div className="bg-white/3 border border-white/8 rounded-xl p-4 mb-6">
              <p className="text-sm text-white/50 mb-2 font-medium">Transaction Hash</p>
              <p className="font-mono text-sm text-white">{shortHash}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {hash && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl glass-card font-semibold text-white hover:border-white/15 transition-colors"
              >
                View on {network.name} Explorer
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            )}
            <Link
              href="/wallet"
              className="flex items-center justify-center w-full py-4 rounded-xl bg-white text-black font-semibold shimmer hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-colors"
            >
              Back to Wallet
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
