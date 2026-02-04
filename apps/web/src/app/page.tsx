'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { hasWallet } from '@e-y/storage'

export default function Home() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkWallet = async () => {
      // Check if session exists (already unlocked)
      const session = sessionStorage.getItem('session_mnemonic')
      if (session) {
        router.push('/wallet')
        return
      }

      // Check if wallet exists in storage
      const exists = await hasWallet()
      if (exists) {
        router.push('/unlock')
        return
      }

      setChecking(false)
    }

    checkWallet()
  }, [router])

  if (checking) {
    return (
      <main className="min-h-screen bg-vignette-grid flex items-center justify-center p-6">
        <div className="text-white/50">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-vignette-grid flex items-center justify-center p-6">
      <div className="w-full max-w-sm glass-card p-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-2">Eternity</h1>
          <p className="text-white/50">
            The wallet for everyone
          </p>
        </div>

        <div className="space-y-4">
          <a
            href="/create"
            className="block w-full py-4 px-6 text-center rounded-full bg-white text-black font-medium hover:bg-white/90 transition-all duration-200"
          >
            Create New Wallet
          </a>
          <a
            href="/import"
            className="block w-full py-4 px-6 text-center rounded-full border border-white/20 text-white font-medium bg-transparent hover:bg-white/5 transition-all duration-200"
          >
            Import Existing Wallet
          </a>
        </div>
      </div>
    </main>
  )
}
