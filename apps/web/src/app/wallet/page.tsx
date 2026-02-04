'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { ethers } from 'ethers'

const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY || ''
const NETWORK = 'sepolia'

export default function WalletDashboard() {
  const router = useRouter()
  const [address, setAddress] = useState('')
  const [balance, setBalance] = useState('0')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const mnemonic = sessionStorage.getItem('session_mnemonic')
    if (!mnemonic) {
      router.push('/unlock')
      return
    }

    try {
      const wallet = deriveWalletFromMnemonic(mnemonic, 0)
      setAddress(wallet.address)
      fetchBalance(wallet.address)
    } catch (err) {
      console.error(err)
      router.push('/unlock')
    }
  }, [router])

  const fetchBalance = async (addr: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(
        `https://eth-${NETWORK}.g.alchemy.com/v2/${ALCHEMY_KEY}`
      )
      const bal = await provider.getBalance(addr)
      setBalance(ethers.formatEther(bal))
    } catch (err) {
      console.error('Failed to fetch balance:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('session_mnemonic')
    router.push('/unlock')
  }

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''

  return (
    <main className="min-h-screen bg-vignette-grid flex items-center justify-center p-6">
      <div className="w-full max-w-sm glass-card p-8">
        {/* Header row */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-xl font-bold">Eternity</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-white/50 hover:text-white transition-colors duration-200"
          >
            Lock
          </button>
        </div>

        {/* Balance */}
        <h2 className="text-4xl font-bold text-center mb-1">
          {loading ? '...' : `${parseFloat(balance).toFixed(4)} ETH`}
        </h2>

        {/* Address */}
        <button
          onClick={handleCopyAddress}
          className="w-full text-white/50 text-sm text-center mb-8 hover:text-white/70 transition-colors duration-200"
        >
          {copied ? '✓ Copied!' : shortAddress}
        </button>

        {/* Action buttons row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <a
            href="/wallet/send"
            className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-white/10 transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">
              ↑
            </div>
            <span className="font-medium text-sm">Send</span>
          </a>
          <a
            href="/wallet/receive"
            className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-white/10 transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">
              ↓
            </div>
            <span className="font-medium text-sm">Receive</span>
          </a>
        </div>

        {/* BLIK card - monochrome */}
        <a
          href="/wallet/blik"
          className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 flex justify-between items-center hover:bg-white/10 transition-all duration-200"
        >
          <div>
            <h3 className="font-bold text-base">BLIK Payment</h3>
            <p className="text-sm text-white/50">Send with 6-digit code</p>
          </div>
          <span className="text-xl text-white/50">→</span>
        </a>

        {/* History link */}
        <a
          href="/wallet/history"
          className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 flex justify-between items-center hover:bg-white/10 transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">📜</span>
            <span className="font-medium text-sm">Transaction History</span>
          </div>
          <span className="text-xl text-white/50">→</span>
        </a>

        {/* Network badge at bottom */}
        <div className="flex items-center justify-center gap-2 text-white/30 text-sm text-center mt-6">
          <span className="w-1.5 h-1.5 rounded-full bg-white/30"></span>
          <span>Sepolia Testnet</span>
        </div>
      </div>
    </main>
  )
}
