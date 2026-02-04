'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { QRCodeSVG } from 'qrcode.react'

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

  return (
    <main className="min-h-screen bg-vignette-grid flex items-center justify-center p-6">
      <div className="glass-card w-full max-w-sm p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <a href="/wallet" className="text-white/50 hover:text-white transition-colors">
            ← Back
          </a>
          <h1 className="font-bold">Receive</h1>
          <div className="w-12" />
        </div>

        {/* Description */}
        <div className="text-center mb-8">
          <p className="text-white/50">
            Scan QR code or copy address to receive ETH
          </p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-8">
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

        {/* Address */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
          <p className="text-sm text-white/50 mb-2">Your address</p>
          <p className="font-mono text-sm break-all text-white">{address}</p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={handleCopy}
            className="w-full py-4 px-6 bg-transparent text-white font-medium border border-white/20 rounded-full hover:bg-white/5 transition-all duration-200"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleShare}
            className="w-full py-4 px-6 bg-white text-black font-medium rounded-full hover:bg-white/90 transition-all duration-200"
          >
            Share
          </button>
        </div>

        {/* Network */}
        <div className="text-white/30 text-sm text-center mt-6 flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
          <span>Sepolia Testnet</span>
        </div>
      </div>
    </main>
  )
}
