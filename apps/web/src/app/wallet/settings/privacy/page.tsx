'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import { useAccount } from '@/contexts/account-context'
import { useAuthGuard } from '@/hooks/useAuthGuard'

type PrivacyLevel = 'anyone' | 'contacts' | 'nobody'

interface PrivacyOption {
  value: PrivacyLevel
  label: string
  description: string
}

const PRIVACY_OPTIONS: PrivacyOption[] = [
  { value: 'anyone', label: 'Anyone', description: 'Anyone with your address or username can send you split-bill requests' },
  { value: 'contacts', label: 'Contacts only', description: 'Only people in your contacts can send you split-bill requests' },
  { value: 'nobody', label: 'No one', description: 'No one can send you split-bill requests' },
]

const STORAGE_KEY_PREFIX = 'e-y_privacy_'

export default function PrivacySettingsPage() {
  const router = useRouter()
  const { isReady } = useAuthGuard()
  const { address } = useAccount()

  const [splitBillPrivacy, setSplitBillPrivacy] = useState<PrivacyLevel>('anyone')

  useEffect(() => {
    if (!isReady) return
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${address.toLowerCase()}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.splitBillPrivacy) {
          setSplitBillPrivacy(parsed.splitBillPrivacy)
        }
      }
    } catch {}
  }, [isReady, address])

  const handleChange = useCallback((value: PrivacyLevel) => {
    setSplitBillPrivacy(value)
    try {
      const key = `${STORAGE_KEY_PREFIX}${address.toLowerCase()}`
      const existing = localStorage.getItem(key)
      const parsed = existing ? JSON.parse(existing) : {}
      parsed.splitBillPrivacy = value
      localStorage.setItem(key, JSON.stringify(parsed))
    } catch {}
  }, [address])

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-8 pb-12">
        <div className="w-full max-w-[420px]">
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors group"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:-translate-x-0.5 transition-transform">
                <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-white">Privacy</h1>
          </div>

          {/* Split Bill Privacy */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-3">Split Bill Requests</h2>
            <p className="text-xs text-white/40 mb-4">Control who can send you split-bill payment requests.</p>
            <div className="space-y-2">
              {PRIVACY_OPTIONS.map((option) => {
                const isSelected = splitBillPrivacy === option.value
                return (
                  <button
                    key={option.value}
                    onClick={() => handleChange(option.value)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl glass-card transition-colors ${
                      isSelected ? 'border border-[#3388FF]/30 bg-[#3388FF]/5' : 'hover:bg-white/3'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-[#3388FF]' : 'border-white/20'
                    }`}>
                      {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#3388FF]" />}
                    </div>
                    <div className="text-left">
                      <span className="text-sm font-medium text-white">{option.label}</span>
                      <p className="text-xs text-white/40 mt-0.5">{option.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
