'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { hasWallet } from '@e-y/storage'
import Link from 'next/link'

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
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-3xl font-bold text-white/50">Eternity</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black bg-grid flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-20">
          <h1 className="text-5xl font-bold tracking-tight mb-6">Eternity</h1>
          <p className="text-xl text-white/50 mb-2">Your Web3 Wallet</p>
          <p className="text-white/30 max-w-sm mx-auto">
            Self-custody crypto wallet with instant payments. Your keys, your coins.
          </p>
        </div>

        {/* Options */}
        <div className="w-full max-w-[420px] space-y-4">
          <Link
            href="/create"
            className="flex items-center gap-5 p-6 border border-white/10 rounded-2xl hover:bg-white/5 transition-colors group"
          >
            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center flex-shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold mb-1">Create New Wallet</div>
              <div className="text-sm text-white/40">
                Generate a new wallet with recovery phrase
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30 group-hover:text-white/50 transition-colors">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>

          <Link
            href="/import"
            className="flex items-center gap-5 p-6 border border-white/10 rounded-2xl hover:bg-white/5 transition-colors group"
          >
            <div className="w-14 h-14 rounded-2xl border border-white/20 flex items-center justify-center flex-shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold mb-1">Import Existing</div>
              <div className="text-sm text-white/40">
                Restore with 12-word recovery phrase
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30 group-hover:text-white/50 transition-colors">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-6 text-center text-white/30 text-sm">
        Self-custody wallet. We never see your keys.
      </footer>
    </main>
  )
}
