'use client'

import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'

export default function BlikReceivedPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation isLoggedIn={false} />

      <main className="max-w-[480px] mx-auto px-6 py-16">
        <div className="bg-[#131313] border border-[#1f1f1f] rounded-2xl p-8 text-center">
          {/* Success icon */}
          <div className="w-20 h-20 mx-auto rounded-full bg-[#0d2818] border-2 border-[#134e29] flex items-center justify-center mb-8">
            <svg className="w-10 h-10 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">Payment Received!</h1>
          <p className="text-[#9b9b9b] mb-8">
            Someone sent ETH using your BLIK code
          </p>

          <button
            onClick={() => router.push('/wallet')}
            className="w-full py-4 rounded-xl bg-white text-black font-semibold hover:bg-[#e5e5e5] transition-colors"
          >
            Back to Wallet
          </button>
        </div>
      </main>
    </div>
  )
}
