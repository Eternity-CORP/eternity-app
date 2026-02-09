'use client'

import { useRouter } from 'next/navigation'

export default function BackButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1.5 text-white/40 hover:text-white text-sm mb-4 -mt-4 transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 12H5M5 12L12 19M5 12L12 5" />
      </svg>
      Back
    </button>
  )
}
