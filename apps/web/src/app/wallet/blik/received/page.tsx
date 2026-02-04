'use client'

import { useRouter } from 'next/navigation'

export default function BlikReceivedPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-8">
      <div className="w-full max-w-md text-center">
        {/* Success icon */}
        <div className="w-24 h-24 mx-auto mb-10 rounded-full border-2 border-white flex items-center justify-center">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-4xl font-bold mb-4">Payment Received!</h1>
        <p className="text-white/50 text-lg mb-12">
          Someone sent ETH using your BLIK code
        </p>

        <button
          onClick={() => router.push('/wallet')}
          className="w-full py-4 px-6 bg-white text-black font-semibold text-lg rounded-xl hover:bg-white/90 transition-colors"
        >
          Back to Wallet
        </button>
      </div>
    </main>
  )
}
