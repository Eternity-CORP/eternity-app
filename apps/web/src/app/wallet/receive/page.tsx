'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { QRCodeSVG } from 'qrcode.react'
import Navigation from '@/components/Navigation'

export default function ReceivePage() {
  const router = useRouter()
  const [address, setAddress] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const mnemonic = sessionStorage.getItem('session_mnemonic')
    if (!mnemonic) {
      router.push('/unlock')
      return
    }

    const wallet = deriveWalletFromMnemonic(mnemonic, 0)
    setAddress(wallet.address)
  }, [router])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('session_mnemonic')
    router.push('/unlock')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation isLoggedIn={true} address={address} onLogout={handleLogout} />

      <main className="w-full flex justify-center px-6 pt-12 pb-12">
        <div className="w-full max-w-[420px]">
          <div className="bg-[#131313] border border-[#1f1f1f] rounded-2xl p-6">
            <h1 className="text-xl font-semibold text-white text-center mb-8">Receive</h1>

            {/* QR Code */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white rounded-xl">
                {address && (
                  <QRCodeSVG
                    value={address}
                    size={180}
                    level="H"
                    includeMargin={false}
                  />
                )}
              </div>
            </div>

            {/* Address */}
            <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-4 mb-4">
              <p className="text-xs text-[#6b6b6b] uppercase tracking-wide mb-2">Your address</p>
              <p className="font-mono text-sm text-[#9b9b9b] break-all leading-relaxed">{address}</p>
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="w-full py-4 rounded-xl font-semibold transition-all bg-white text-black hover:bg-[#e5e5e5] flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-black">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-black">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copy Address
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
