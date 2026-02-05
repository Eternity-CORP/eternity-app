'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { hasWallet } from '@e-y/storage'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

export default function Home() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const check = async () => {
      const walletExists = await hasWallet()
      if (walletExists) {
        router.replace('/unlock')
      } else {
        setChecking(false)
      }
    }
    check()
  }, [router])

  if (checking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation isLoggedIn={false} />

      <main className="max-w-[1200px] mx-auto px-6 py-20">
        {/* Hero */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-white/60">Sepolia Testnet</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Your Web3 Wallet
          </h1>
          <p className="text-xl text-white/50 max-w-lg mx-auto mb-12">
            Self-custody crypto wallet with instant BLIK payments. Your keys, your coins.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/create"
              className="w-full sm:w-auto px-8 py-4 bg-white text-black font-semibold rounded-2xl hover:bg-white/90 transition-colors"
            >
              Create Wallet
            </Link>
            <Link
              href="/import"
              className="w-full sm:w-auto px-8 py-4 border border-white/20 font-semibold rounded-2xl hover:bg-white/5 transition-colors"
            >
              Import Existing
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Self-Custody</h3>
            <p className="text-white/50">
              Your keys never leave your device. Full control over your crypto assets.
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M7 15h0M2 9.5h20"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">BLIK Payments</h3>
            <p className="text-white/50">
              Send and receive crypto with simple 6-digit codes. No addresses needed.
            </p>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Instant</h3>
            <p className="text-white/50">
              Fast transactions on Ethereum. Check balances and send in seconds.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between">
          <p className="text-white/30 text-sm">
            © 2024 Eternity. All rights reserved.
          </p>
          <p className="text-white/30 text-sm">
            We never see your keys.
          </p>
        </div>
      </footer>
    </div>
  )
}
