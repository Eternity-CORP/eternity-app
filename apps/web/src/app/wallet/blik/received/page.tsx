'use client'

import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'

export default function BlikReceivedPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-black">
      <Navigation isLoggedIn={false} />

      <main className="max-w-[500px] mx-auto px-6 py-16">
        <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 text-center">
          {/* Success icon */}
          <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mb-8">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold mb-2">Payment Received!</h1>
          <p className="text-white/50 mb-8">
            Someone sent ETH using your BLIK code
          </p>

          <button
            onClick={() => router.push('/wallet')}
            className="w-full py-4 rounded-2xl bg-white text-black font-semibold hover:bg-white/90 transition-colors"
          >
            Back to Wallet
          </button>
        </div>
      </main>
    </div>
  )
}
