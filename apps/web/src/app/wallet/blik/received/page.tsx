'use client'

import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import BackButton from '@/components/BackButton'

export default function BlikReceivedPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="max-w-[480px] mx-auto px-6 py-16">
        <BackButton />
        <div className="glass-card gradient-border rounded-2xl p-8 text-center">
          {/* Success icon */}
          <div className="w-20 h-20 mx-auto rounded-full bg-[#22c55e]/8 border-2 border-[#22c55e]/20 flex items-center justify-center mb-8">
            <svg className="w-10 h-10 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gradient mb-2">Payment Received!</h1>
          <p className="text-white/50 mb-8">
            Someone sent ETH using your BLIK code
          </p>

          <button
            onClick={() => router.push('/wallet')}
            className="w-full py-4 rounded-xl bg-white text-black font-semibold shimmer hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-colors"
          >
            Back to Wallet
          </button>
        </div>
      </main>
    </div>
  )
}
