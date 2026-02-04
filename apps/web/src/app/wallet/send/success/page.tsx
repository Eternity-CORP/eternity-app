'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'

function SuccessContent() {
  const searchParams = useSearchParams()
  const hash = searchParams.get('hash')

  const shortHash = hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : ''
  const explorerUrl = `https://sepolia.etherscan.io/tx/${hash}`

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="w-full max-w-md text-center">
        {/* Success icon */}
        <div className="w-24 h-24 mx-auto rounded-full border-2 border-white flex items-center justify-center mb-10">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-4xl font-bold mb-4">Transaction Sent</h1>
        <p className="text-white/50 text-lg mb-12">
          Your transaction has been submitted to the network
        </p>

        {/* Transaction hash */}
        {hash && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-8">
            <p className="text-sm text-white/50 mb-2">Transaction Hash</p>
            <p className="font-mono">{shortHash}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-4">
          {hash && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-4 px-6 border border-white/20 rounded-xl font-medium hover:bg-white/5 transition-colors"
            >
              View on Etherscan
            </a>
          )}
          <Link
            href="/wallet"
            className="block w-full py-4 px-6 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-colors"
          >
            Back to Wallet
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-xl text-white/50">Loading...</div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
