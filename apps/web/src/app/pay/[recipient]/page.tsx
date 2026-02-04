'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ethers } from 'ethers'
import { lookupUsername } from '@/lib/supabase'

export default function PayPage() {
  const params = useParams()
  const router = useRouter()
  const recipient = decodeURIComponent(params.recipient as string)

  const [resolvedAddress, setResolvedAddress] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const resolve = async () => {
      setLoading(true)
      setError('')

      // Check if it's an address
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

      // Check if it's a username (with or without @)
      const username = recipient.startsWith('@') ? recipient.slice(1) : recipient
      const address = await lookupUsername(username)

      if (address) {
        setResolvedAddress(address)
        setDisplayName(`@${username}`)
      } else {
        setError(`User @${username} not found`)
      }
      setLoading(false)
    }

    resolve()
  }, [recipient])

  const handleConnect = () => {
    // Check if wallet exists
    const hasWallet = localStorage.getItem('e-y-wallet-exists')
    if (hasWallet) {
      router.push(`/unlock?redirect=/wallet/send?to=${resolvedAddress}`)
    } else {
      router.push(`/create?redirect=/wallet/send?to=${resolvedAddress}`)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-vignette-grid flex items-center justify-center p-6">
        <div className="glass-card w-full max-w-sm p-8 text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/50">Resolving...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-vignette-grid flex items-center justify-center p-6">
        <div className="glass-card w-full max-w-sm p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 flex items-center justify-center mb-6">
            <span className="text-3xl">?</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Not Found</h1>
          <p className="text-white/50 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-gray-200 transition-colors"
          >
            Go Home
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-vignette-grid flex items-center justify-center p-6">
      <div className="glass-card w-full max-w-sm p-8 text-center">
        {/* Logo */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 flex items-center justify-center mb-6">
          <span className="text-3xl font-bold">E</span>
        </div>

        <h1 className="text-3xl font-bold mb-3">Send to {displayName}</h1>
        <p className="text-white/50 mb-10">
          Connect your wallet to send ETH
        </p>

        {/* Recipient card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8 text-left">
          <p className="text-sm text-white/50 mb-1">Recipient</p>
          <p className="font-medium">{displayName}</p>
          {displayName !== resolvedAddress && (
            <p className="text-xs text-white/50 font-mono mt-1">
              {resolvedAddress.slice(0, 16)}...{resolvedAddress.slice(-12)}
            </p>
          )}
        </div>

        {/* Actions */}
        <button
          onClick={handleConnect}
          className="w-full py-4 rounded-full bg-white text-black font-medium hover:bg-gray-200 transition-colors mb-4"
        >
          Connect Wallet
        </button>

        <a
          href="/"
          className="block text-sm text-white/50 hover:text-white transition-colors"
        >
          What is Eternity?
        </a>

        {/* Network badge */}
        <div className="flex items-center justify-center gap-2 mt-8 text-sm text-white/50">
          <span className="w-2 h-2 rounded-full bg-white/30" />
          <span>Sepolia Testnet</span>
        </div>
      </div>
    </main>
  )
}
