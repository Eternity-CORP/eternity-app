'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { hasWallet } from '@e-y/storage'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

export default function Home() {
  const router = useRouter()
  const [status, setStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('loading')

  useEffect(() => {
    const check = async () => {
      const walletExists = await hasWallet()
      if (walletExists) {
        router.replace('/unlock')
      } else {
        setStatus('succeeded')
      }
    }
    check()
  }, [router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="max-w-[1200px] mx-auto px-8 py-20">
        {/* Hero */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 glass-card rounded-full mb-8">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] pulse-ring text-[#22c55e]" />
            <span className="text-sm font-medium text-white/60">Sepolia Testnet</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="text-gradient">Your </span>
            <span className="text-gradient-accent">AI-Native</span>
            <span className="text-gradient"> Wallet</span>
          </h1>
          <p className="text-xl text-white/40 max-w-lg mx-auto mb-12">
            AI-powered self-custody wallet with BLIK payments. Your keys, your AI companion.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/create"
              className="w-full sm:w-auto px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-all shimmer hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:scale-[1.02] active:scale-[0.98]"
            >
              Create Wallet
            </Link>
            <Link
              href="/import"
              className="w-full sm:w-auto px-8 py-4 glass-card text-white font-semibold rounded-xl hover:border-white/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Import Existing
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card-glow rounded-2xl p-8 group">
            <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-[#3388FF]/10 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/80 group-hover:text-[#3388FF] transition-colors">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Self-Custody</h3>
            <p className="text-white/40">
              Your keys never leave your device. Full control over your crypto assets.
            </p>
          </div>

          <div className="glass-card-glow rounded-2xl p-8 group">
            <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-[#00E5FF]/10 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/80 group-hover:text-[#00E5FF] transition-colors">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M7 15h0M2 9.5h20"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">BLIK Payments</h3>
            <p className="text-white/40">
              Send and receive crypto with simple 6-digit codes. No addresses needed.
            </p>
          </div>

          <div className="glass-card-glow rounded-2xl p-8 group">
            <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-[#22c55e]/10 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/80 group-hover:text-[#22c55e] transition-colors">
                <path d="M12 2a4 4 0 0 1 4 4v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V6a4 4 0 0 1 4-4z"/>
                <path d="M20 21v-2a4 4 0 0 0-3-3.87M4 21v-2a4 4 0 0 1 3-3.87"/>
                <circle cx="12" cy="17" r="4"/>
                <path d="M12 15v4M10 17h4"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">AI-Powered</h3>
            <p className="text-white/40">
              Your personal AI manages complexity. Just speak naturally, transact instantly.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-[1200px] mx-auto px-8 flex items-center justify-between">
          <p className="text-white/20 text-sm">
            © 2026 Eternity. All rights reserved.
          </p>
          <p className="text-white/20 text-sm">
            AI-native. Self-custody. Yours.
          </p>
        </div>
      </footer>
    </div>
  )
}
