'use client'

import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import BackButton from '@/components/BackButton'
import LogoReveal from '@/components/animations/LogoReveal'
import { useAccount } from '@/contexts/account-context'
import { SUPPORTED_NETWORKS, type NetworkId } from '@e-y/shared'
import { getNetworkById } from '@/lib/network'

function SuccessContent() {
  const searchParams = useSearchParams()
  const { network: accountNetwork } = useAccount()
  const hash = searchParams.get('hash')
  const networkParam = searchParams.get('network') as NetworkId | null
  const [animDone, setAnimDone] = useState(false)

  // Use the specific network from the URL param, fall back to account default
  const network = networkParam ? getNetworkById(networkParam) : accountNetwork
  const networkDisplayName = networkParam
    ? SUPPORTED_NETWORKS[networkParam]?.name || network.name
    : network.name

  const shortHash = hash ? `${hash.slice(0, 10)}...${hash.slice(-8)}` : ''
  const explorerUrl = hash ? network.explorerTxUrl(hash) : ''

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="max-w-[480px] mx-auto px-6 py-16">
        <BackButton />
        <div className="glass-card gradient-border rounded-2xl p-8 text-center relative" style={{ overflow: 'hidden' }}>
          {/* Logo reveal animation — plays once */}
          <LogoReveal active={!animDone} onComplete={() => setAnimDone(true)} />

          <div
            className="relative z-[1] transition-opacity duration-500"
            style={{ opacity: animDone ? 1 : 0 }}
          >
            {/* Success icon */}
            <div className="w-20 h-20 mx-auto rounded-full bg-[#7c3aed]/10 border-2 border-[#7c3aed]/30 flex items-center justify-center mb-8">
              <svg className="w-10 h-10 text-[#8b5cf6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-3xl font-bold text-gradient mb-2">Transaction Confirmed</h1>
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
                  View on {networkDisplayName} Explorer
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
