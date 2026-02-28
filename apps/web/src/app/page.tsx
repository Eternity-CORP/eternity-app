'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { hasWallet } from '@e-y/storage'
import Link from 'next/link'
import { useInviteGuard } from '@/hooks/useInviteGuard'

export default function Home() {
  const router = useRouter()
  const { isInviteValid } = useInviteGuard()
  const [status, setStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('loading')

  useEffect(() => {
    if (!isInviteValid) return
    const check = async () => {
      const walletExists = await hasWallet()
      if (walletExists) {
        router.replace('/unlock')
      } else {
        setStatus('succeeded')
      }
    }
    check()
  }, [router, isInviteValid])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--foreground)] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative z-[2] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <img src="/logo.svg" alt="Eternity" className="w-20 h-20 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">Eternity</h1>
          <p className="text-[var(--foreground-subtle)] text-sm">AI-native self-custody wallet</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href="/create"
            className="w-full py-4 bg-[var(--foreground)] text-[var(--background)] font-semibold rounded-xl text-center hover:opacity-90 transition-all shimmer hover:scale-[1.01] active:scale-[0.99]"
          >
            Create Wallet
          </Link>
          <Link
            href="/import"
            className="w-full py-4 glass-card text-[var(--foreground)] font-semibold rounded-xl text-center hover:scale-[1.01] active:scale-[0.99]"
          >
            Import Existing
          </Link>
        </div>
      </div>
    </div>
  )
}
