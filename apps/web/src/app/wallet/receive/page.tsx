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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Eternity Wallet Address',
          text: address,
        })
      } catch (err) {
        console.error(err)
      }
    } else {
      handleCopy()
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('session_mnemonic')
    router.push('/unlock')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation isLoggedIn={true} address={address} onLogout={handleLogout} />

      <main className="max-w-[480px] mx-auto px-6 py-12">
        {/* Card */}
        <div className="bg-[#131313] border border-[#1f1f1f] rounded-2xl p-6">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1.5 bg-[#1a1a1a] rounded-xl mb-6">
            <button
              onClick={() => router.push('/wallet/send')}
              className="flex-1 py-3 px-4 rounded-lg text-[#9b9b9b] font-semibold text-sm hover:text-white transition-colors"
            >
              Send
            </button>
            <button className="flex-1 py-3 px-4 rounded-lg bg-[#252525] text-white font-semibold text-sm">
              Receive
            </button>
            <button
              onClick={() => router.push('/wallet/blik')}
              className="flex-1 py-3 px-4 rounded-lg text-[#9b9b9b] font-semibold text-sm hover:text-white transition-colors"
            >
              BLIK
            </button>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <div className="p-6 bg-white rounded-2xl">
              {address && (
                <QRCodeSVG
                  value={address}
                  size={200}
                  level="H"
                  includeMargin={false}
                />
              )}
            </div>
          </div>

          {/* Address Box */}
          <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-[#9b9b9b] font-medium">Your address</label>
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#252525] rounded-lg">
                <div className="w-4 h-4 rounded-full bg-[#3a3a3a] flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                    <path d="M12 1.5l-8 14h16l-8-14z"/>
                  </svg>
                </div>
                <span className="text-xs font-semibold text-white">ETH</span>
              </div>
            </div>
            <p className="font-mono text-sm break-all text-[#9b9b9b] leading-relaxed">{address}</p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 py-4 rounded-xl bg-[#1f1f1f] border border-[#2a2a2a] font-semibold hover:bg-[#2a2a2a] transition-colors"
            >
              {copied ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#22c55e]">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  <span className="text-[#22c55e]">Copied</span>
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  <span className="text-white">Copy</span>
                </>
              )}
            </button>
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-4 rounded-xl bg-white text-black font-semibold hover:bg-[#e5e5e5] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Share
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
