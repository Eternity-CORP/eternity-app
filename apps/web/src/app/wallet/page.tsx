'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { ethers } from 'ethers'
import Link from 'next/link'

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
  const formattedBalance = parseFloat(balance).toFixed(4)

  return (
    <main className="min-h-screen bg-black bg-grid">
      <div className="max-w-[600px] mx-auto px-6 py-10">
        {/* Header */}
        <header className="flex items-center justify-between mb-16">
          <h1 className="text-2xl font-bold">Eternity</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Lock
          </button>
        </header>

        {/* Address */}
        <button
          onClick={handleCopyAddress}
          className="flex items-center gap-2 mb-6 text-white/50 hover:text-white/70 transition-colors text-sm"
        >
          <span className="font-mono">{shortAddress}</span>
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          )}
        </button>

        {/* Balance */}
        <div className="mb-16">
          {loading ? (
            <div className="h-20 flex items-center">
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
            </div>
          ) : (
            <div className="flex items-baseline gap-3">
              <span className="text-6xl font-bold tracking-tight">{formattedBalance}</span>
              <span className="text-2xl text-white/50">ETH</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-4 mb-16">
          <Link
            href="/wallet/send"
            className="flex flex-col items-center gap-4 p-6 border border-white/10 rounded-2xl hover:bg-white/5 transition-colors"
          >
            <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"/>
                <polyline points="5 12 12 5 19 12"/>
              </svg>
            </div>
            <span className="text-sm font-medium">Send</span>
          </Link>

          <Link
            href="/wallet/receive"
            className="flex flex-col items-center gap-4 p-6 border border-white/10 rounded-2xl hover:bg-white/5 transition-colors"
          >
            <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <polyline points="19 12 12 19 5 12"/>
              </svg>
            </div>
            <span className="text-sm font-medium">Receive</span>
          </Link>

          <Link
            href="/wallet/blik"
            className="flex flex-col items-center gap-4 p-6 border border-white/10 rounded-2xl hover:bg-white/5 transition-colors"
          >
            <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M7 15h0M2 9.5h20"/>
              </svg>
            </div>
            <span className="text-sm font-medium">BLIK</span>
          </Link>
        </div>

        {/* History */}
        <Link
          href="/wallet/history"
          className="flex items-center justify-between p-5 border border-white/10 rounded-2xl hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div>
              <div className="font-medium">Transaction History</div>
              <div className="text-sm text-white/40">View all transactions</div>
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/30">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </Link>

        {/* Network */}
        <div className="flex items-center justify-center gap-2 mt-12 text-white/30 text-sm">
          <span className="w-2 h-2 rounded-full bg-green-500"/>
          <span>Sepolia Testnet</span>
        </div>
      </div>
    </main>
  )
}
