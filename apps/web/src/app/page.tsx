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
      <main className="bg-app min-h-screen flex items-center justify-center">
        <div className="logo text-4xl animate-pulse">Eternity</div>
      </main>
    )
  }

  return (
    <main className="bg-app bg-grid min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        {/* Hero */}
        <div className="text-center mb-16 animate-fadeIn">
          <div className="logo text-5xl mb-6">Eternity</div>
          <h1 className="text-title mb-4">Your Web3 Wallet</h1>
          <p className="text-body max-w-sm mx-auto">
            Self-custody crypto wallet with instant payments.
            Your keys, your coins.
          </p>
        </div>

        {/* Cards */}
        <div className="w-full max-w-md space-y-4 animate-slideUp">
          <Link
            href="/create"
            className="card-elevated card-interactive p-6 flex items-center gap-5 w-full"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center flex-shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold mb-1">Create New Wallet</div>
              <div className="text-sm text-[var(--foreground-muted)]">
                Generate a new wallet with a secure recovery phrase
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--foreground-subtle)] flex-shrink-0">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>

          <Link
            href="/import"
            className="card card-interactive p-6 flex items-center gap-5 w-full"
          >
            <div className="w-14 h-14 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--foreground-muted)]">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold mb-1">Import Existing</div>
              <div className="text-sm text-[var(--foreground-muted)]">
                Restore your wallet using a 12-word recovery phrase
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--foreground-subtle)] flex-shrink-0">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-6 text-center text-caption relative z-10">
        <p>Self-custody wallet. We never see your keys.</p>
      </footer>
    </main>
  )
}
