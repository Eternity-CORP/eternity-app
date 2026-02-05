'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

function SuccessContent() {
  const searchParams = useSearchParams()
  const hash = searchParams.get('hash')

  const shortHash = hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : ''
  const explorerUrl = `https://sepolia.etherscan.io/tx/${hash}`

  return (
    <div className="min-h-screen bg-black">
      <Navigation isLoggedIn={false} />

      <main className="max-w-[500px] mx-auto px-6 py-16">
        <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 text-center">
          {/* Success icon */}
          <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mb-8">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold mb-2">Transaction Sent</h1>
          <p className="text-white/50 mb-8">
            Your transaction has been submitted to the network
          </p>

          {/* Transaction hash */}
          {hash && (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 mb-6">
              <p className="text-sm text-white/50 mb-2">Transaction Hash</p>
              <p className="font-mono text-sm">{shortHash}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            {hash && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-white/5 border border-white/10 font-medium hover:bg-white/10 transition-colors"
              >
                View on Etherscan
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
            )}
            <Link
              href="/wallet"
              className="flex items-center justify-center w-full py-4 rounded-2xl bg-white text-black font-semibold hover:bg-white/90 transition-colors"
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
