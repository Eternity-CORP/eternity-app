'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { ethers } from 'ethers'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY || ''
const NETWORK = 'sepolia'

export default function WalletDashboard() {
  const router = useRouter()
  const [address, setAddress] = useState('')
  const [balance, setBalance] = useState('0')
  const [loading, setLoading] = useState(true)
  const [balanceUsd, setBalanceUsd] = useState('0.00')

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
      const ethBalance = ethers.formatEther(bal)
      setBalance(ethBalance)
      setBalanceUsd((parseFloat(ethBalance) * 2500).toFixed(2))
    } catch (err) {
      console.error('Failed to fetch balance:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('session_mnemonic')
    router.push('/unlock')
  }

  const formattedBalance = parseFloat(balance).toFixed(4)

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation isLoggedIn={true} address={address} onLogout={handleLogout} />

      <main className="w-full flex justify-center px-6 pt-20 pb-12">
        <div className="w-full max-w-[420px]">
          {/* Main Card */}
          <div className="bg-[#131313] border border-[#1f1f1f] rounded-2xl p-6">
            {/* Balance */}
            <div className="text-center mb-8">
              {loading ? (
                <div className="h-12 w-40 bg-[#1f1f1f] rounded-xl animate-pulse mx-auto" />
              ) : (
                <>
                  <div className="flex items-center justify-center gap-3 mb-1">
                    <span className="text-5xl font-bold text-white">{formattedBalance}</span>
                    <span className="text-xl font-medium text-[#6b6b6b]">ETH</span>
                  </div>
                  <p className="text-[#6b6b6b]">${balanceUsd} USD</p>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Link
                href="/wallet/send"
                className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl bg-white text-black font-semibold hover:bg-[#e5e5e5] transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="19" x2="12" y2="5"/>
                  <polyline points="5 12 12 5 19 12"/>
                </svg>
                Send
              </Link>
              <Link
                href="/wallet/receive"
                className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl bg-[#1f1f1f] text-white font-semibold border border-[#2a2a2a] hover:bg-[#2a2a2a] transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <polyline points="19 12 12 19 5 12"/>
                </svg>
                Receive
              </Link>
              <Link
                href="/wallet/blik"
                className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl bg-[#1f1f1f] text-white font-semibold border border-[#2a2a2a] hover:bg-[#2a2a2a] transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="M7 15h0M2 9.5h20"/>
                </svg>
                BLIK
              </Link>
            </div>
          </div>

          {/* Network indicator */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
            <span className="text-sm text-[#6b6b6b]">Sepolia Testnet</span>
          </div>
        </div>
      </main>
    </div>
  )
}
