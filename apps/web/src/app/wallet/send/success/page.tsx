'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const hash = searchParams.get('hash')

  const shortHash = hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : ''
  const explorerUrl = `https://sepolia.etherscan.io/tx/${hash}`

  return (
    <main className="min-h-screen bg-vignette-grid flex items-center justify-center p-6">
      <div className="glass-card w-full max-w-sm p-8 text-center">
        {/* Success icon */}
        <div className="w-20 h-20 mx-auto rounded-full bg-white/10 flex items-center justify-center mb-8">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold mb-2">Sent!</h1>
        <p className="text-white/50 mb-8">
          Your transaction has been submitted
        </p>

        {/* Transaction hash */}
        {hash && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
            <p className="text-sm text-white/50 mb-2">Transaction</p>
            <p className="font-mono text-sm">{shortHash}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-4">
          {hash && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 rounded-xl border border-white/20 hover:bg-white/5 transition-colors"
            >
              View on Etherscan ↗
            </a>
          )}
          <a
            href="/wallet"
            className="block w-full py-4 rounded-full bg-white text-black font-medium hover:bg-gray-200 transition-colors"
          >
            Back to Wallet
          </a>
        </div>
      </div>
    </main>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  )
}
