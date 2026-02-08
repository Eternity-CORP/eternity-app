'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ethers } from 'ethers'
import { lookupUsername } from '@e-y/shared'
import { apiClient } from '@/lib/api'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { useAccount } from '@/contexts/account-context'

export default function PayPage() {
  const params = useParams()
  const router = useRouter()
  const recipient = decodeURIComponent(params.recipient as string)
  const { network, currentAccount } = useAccount()

  const [resolvedAddress, setResolvedAddress] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const resolve = async () => {
      setLoading(true)
      setError('')

      if (recipient.startsWith('0x') && recipient.length === 42) {
        if (ethers.isAddress(recipient)) {
          setResolvedAddress(recipient)
          setDisplayName(`${recipient.slice(0, 8)}...${recipient.slice(-6)}`)
        } else {
          setError('Invalid address')
        }
        setLoading(false)
        return
      }

      const username = recipient.startsWith('@') ? recipient.slice(1) : recipient
      const result = await lookupUsername(apiClient, username)

      if (result) {
        setResolvedAddress(result.address)
        setDisplayName(`@${username}`)
      } else {
        setError(`User @${username} not found`)
      }
      setLoading(false)
    }

    resolve()
  }, [recipient])

  const handleConnect = () => {
    const hasWallet = localStorage.getItem('e-y-wallet-exists')
    if (hasWallet) {
      router.push(`/unlock?redirect=/wallet/send?to=${resolvedAddress}`)
    } else {
      router.push(`/create?redirect=/wallet/send?to=${resolvedAddress}`)
    }
  }

  const networkLabel = currentAccount?.type === 'real' ? network.name : `${network.name} Testnet`

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <main className="flex items-center justify-center py-32">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/50">Resolving recipient...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <Navigation />
        <main className="max-w-[500px] mx-auto px-6 py-16">
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-6">
              <span className="text-3xl">?</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">Not Found</h1>
            <p className="text-white/50 mb-8">{error}</p>
            <Link
              href="/"
              className="inline-block px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-colors"
            >
              Go Home
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="max-w-[480px] mx-auto px-6 py-16">
        <div className="glass-card gradient-border rounded-2xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center">
              <span className="text-black font-bold text-2xl">E</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gradient mb-2">Send to {displayName}</h1>
            <p className="text-white/50">Connect your wallet to send ETH</p>
          </div>

          {/* Recipient card */}
          <div className="bg-white/3 border border-white/8 rounded-xl p-5 mb-8">
            <p className="text-sm text-white/50 mb-2 font-medium">Recipient</p>
            <p className="font-semibold text-lg text-white">{displayName}</p>
            {displayName !== resolvedAddress && (
              <p className="text-xs text-white/40 font-mono mt-2 break-all">
                {resolvedAddress}
              </p>
            )}
          </div>

          <button
            onClick={handleConnect}
            className="w-full py-4 bg-white text-black font-semibold rounded-xl shimmer hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-colors mb-4"
          >
            Connect Wallet
          </button>

          <Link
            href="/"
            className="block text-center text-white/50 hover:text-white transition-colors text-sm"
          >
            What is Eternity?
          </Link>

          {/* Network badge */}
          <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t border-white/5">
            <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
            <span className="text-sm text-white/40">{networkLabel}</span>
          </div>
        </div>
      </main>
    </div>
  )
}
