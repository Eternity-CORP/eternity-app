'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { QRCodeSVG } from 'qrcode.react'
import Link from 'next/link'

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
    <main className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <Link href="/wallet" className="text-white/50 hover:text-white transition-colors">
            ← Back to Wallet
          </Link>
          <h1 className="text-xl font-bold">Receive ETH</h1>
          <div className="w-32" />
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-xl mx-auto px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Receive ETH</h2>
          <p className="text-white/50">Scan the QR code or copy your address</p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-12">
          <div className="p-8 bg-white rounded-2xl">
            {address && (
              <QRCodeSVG
                value={address}
                size={240}
                level="H"
                includeMargin={false}
              />
            )}
          </div>
        </div>

        {/* Address */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
          <p className="text-sm text-white/50 mb-3">Your wallet address</p>
          <p className="font-mono text-sm break-all text-white leading-relaxed">{address}</p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleCopy}
            className="py-4 px-6 border border-white/20 rounded-xl font-medium hover:bg-white/5 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy Address'}
          </button>
          <button
            onClick={handleShare}
            className="py-4 px-6 bg-white text-black font-medium rounded-xl hover:bg-white/90 transition-colors"
          >
            Share
          </button>
        </div>

        {/* Network */}
        <div className="flex items-center justify-center gap-2 mt-12 text-sm text-white/40">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span>Sepolia Testnet</span>
        </div>
      </div>
    </main>
  )
}
