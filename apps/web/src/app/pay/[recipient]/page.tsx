'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ethers } from 'ethers'
import { lookupUsername } from '@/lib/supabase'
import Link from 'next/link'

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
    const hasWallet = localStorage.getItem('e-y-wallet-exists')
    if (hasWallet) {
      router.push(`/unlock?redirect=/wallet/send?to=${resolvedAddress}`)
    } else {
      router.push(`/create?redirect=/wallet/send?to=${resolvedAddress}`)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-6" />
          <p className="text-white/50 text-lg">Resolving recipient...</p>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 mx-auto rounded-full border border-white/20 flex items-center justify-center mb-8">
            <span className="text-4xl">?</span>
          </div>
          <h1 className="text-3xl font-bold mb-4">Not Found</h1>
          <p className="text-white/50 text-lg mb-10">{error}</p>
          <Link
            href="/"
            className="inline-block px-8 py-4 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-colors"
          >
            Go Home
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-white/10">
        <div>
          <h1 className="text-3xl font-bold mb-2">Eternity</h1>
          <p className="text-white/40">Web3 Wallet</p>
        </div>

        <div>
          <p className="text-5xl font-bold leading-tight mb-6">
            Send crypto<br/>instantly to<br/>anyone.
          </p>
          <p className="text-white/40 max-w-md">
            Connect your wallet or create a new one to send ETH with just a few clicks.
          </p>
        </div>

        <p className="text-white/20 text-sm">
          © 2024 Eternity. All rights reserved.
        </p>
      </div>

      {/* Right side - content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          {/* Mobile logo */}
          <div className="lg:hidden mb-12">
            <h1 className="text-3xl font-bold mb-2">Eternity</h1>
            <p className="text-white/40">Web3 Wallet</p>
          </div>

          {/* Logo icon */}
          <div className="w-20 h-20 mx-auto rounded-2xl bg-white/10 flex items-center justify-center mb-8">
            <span className="text-4xl font-bold">E</span>
          </div>

          <h2 className="text-3xl font-bold mb-4">Send to {displayName}</h2>
          <p className="text-white/50 mb-12">
            Connect your wallet to send ETH
          </p>

          {/* Recipient card */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-10 text-left">
            <p className="text-sm text-white/50 mb-2">Recipient</p>
            <p className="font-semibold text-lg">{displayName}</p>
            {displayName !== resolvedAddress && (
              <p className="text-xs text-white/40 font-mono mt-2">
                {resolvedAddress.slice(0, 16)}...{resolvedAddress.slice(-12)}
              </p>
            )}
          </div>

          {/* Actions */}
          <button
            onClick={handleConnect}
            className="w-full py-4 px-6 bg-white text-black font-semibold text-lg rounded-xl hover:bg-white/90 transition-colors mb-6"
          >
            Connect Wallet
          </button>

          <Link
            href="/"
            className="block text-white/50 hover:text-white transition-colors"
          >
            What is Eternity?
          </Link>

          {/* Network badge */}
          <div className="flex items-center justify-center gap-2 mt-12 text-sm text-white/40">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>Sepolia Testnet</span>
          </div>
        </div>
      </div>
    </main>
  )
}
