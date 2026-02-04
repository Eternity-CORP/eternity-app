'use client'

import { useRouter } from 'next/navigation'

export default function BlikReceivedPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-vignette-grid flex items-center justify-center p-6">
      <div className="w-full max-w-sm glass-card p-8 text-center">
        {/* Success icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full border-4 border-white flex items-center justify-center">
          <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold mb-3">Payment Received!</h1>
        <p className="text-white/50 mb-8">
          Someone sent ETH using your BLIK code
        </p>

        <button
          onClick={() => router.push('/wallet')}
          className="w-full py-4 px-6 bg-white text-black font-medium rounded-full hover:bg-white/90 transition-all duration-200"
        >
          Back to Wallet
        </button>
      </div>
    </main>
  )
}
