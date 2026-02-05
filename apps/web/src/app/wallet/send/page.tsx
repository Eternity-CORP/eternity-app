'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { ethers } from 'ethers'
import { lookupUsername, saveTransaction } from '@/lib/supabase'
import Navigation from '@/components/Navigation'

const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY || ''
const NETWORK = 'sepolia'

function SendContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillTo = searchParams.get('to')

  const [address, setAddress] = useState('')
  const [recipient, setRecipient] = useState(prefillTo || '')
  const [amount, setAmount] = useState('')
  const [resolvedAddress, setResolvedAddress] = useState('')
  const [balance, setBalance] = useState('0')
  const [gasEstimate, setGasEstimate] = useState('')
  const [loading, setLoading] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState('')
  const [wallet, setWallet] = useState<ethers.HDNodeWallet | null>(null)

  useEffect(() => {
    const mnemonic = sessionStorage.getItem('session_mnemonic')
    if (!mnemonic) {
      router.push('/unlock')
      return
    }

    const w = deriveWalletFromMnemonic(mnemonic, 0)
    setWallet(w)
    setAddress(w.address)
    fetchBalance(w.address)
  }, [router])

  const fetchBalance = async (addr: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(
        `https://eth-${NETWORK}.g.alchemy.com/v2/${ALCHEMY_KEY}`
      )
      const bal = await provider.getBalance(addr)
      setBalance(ethers.formatEther(bal))
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    const resolve = async () => {
      setError('')
      setResolvedAddress('')

      if (!recipient) return

      if (recipient.startsWith('0x') && recipient.length === 42) {
        if (ethers.isAddress(recipient)) {
          setResolvedAddress(recipient)
          estimateGas(recipient)
        } else {
          setError('Invalid address')
        }
        return
      }

      if (recipient.startsWith('@') || !recipient.startsWith('0x')) {
        setResolving(true)
        const username = recipient.startsWith('@') ? recipient.slice(1) : recipient
        const addr = await lookupUsername(username)
        setResolving(false)

        if (addr) {
          setResolvedAddress(addr)
          estimateGas(addr)
        } else {
          setError(`Username @${username} not found`)
        }
      }
    }

    const timeout = setTimeout(resolve, 500)
    return () => clearTimeout(timeout)
  }, [recipient])

  const estimateGas = async (to: string) => {
    if (!amount || parseFloat(amount) <= 0) return

    try {
      const provider = new ethers.JsonRpcProvider(
        `https://eth-${NETWORK}.g.alchemy.com/v2/${ALCHEMY_KEY}`
      )
      const feeData = await provider.getFeeData()
      const gasLimit = BigInt(21000)
      const gasCost = gasLimit * (feeData.gasPrice || BigInt(0))
      setGasEstimate(ethers.formatEther(gasCost))
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (resolvedAddress && amount) {
      estimateGas(resolvedAddress)
    }
  }, [amount, resolvedAddress])

  const handleSend = async () => {
    if (!wallet || !resolvedAddress || !amount) return

    setLoading(true)
    setError('')

    try {
      const provider = new ethers.JsonRpcProvider(
        `https://eth-${NETWORK}.g.alchemy.com/v2/${ALCHEMY_KEY}`
      )
      const connectedWallet = wallet.connect(provider)

      const tx = await connectedWallet.sendTransaction({
        to: resolvedAddress,
        value: ethers.parseEther(amount),
      })

      await tx.wait()

      await saveTransaction({
        hash: tx.hash,
        from_address: wallet.address.toLowerCase(),
        to_address: resolvedAddress.toLowerCase(),
        amount,
        token_symbol: 'ETH',
        status: 'confirmed',
        direction: 'sent',
      })

      router.push(`/wallet/send/success?hash=${tx.hash}`)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed'
      setError(errorMessage.includes('insufficient') ? 'Insufficient balance' : errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('session_mnemonic')
    router.push('/unlock')
  }

  const isValid = resolvedAddress && amount && parseFloat(amount) > 0 && parseFloat(amount) <= parseFloat(balance)

  return (
    <div className="min-h-screen bg-black">
      <Navigation isLoggedIn={true} address={address} onLogout={handleLogout} />

      <main className="max-w-[500px] mx-auto px-6 py-12">
        {/* Card */}
        <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-2xl mb-6">
            <button className="flex-1 py-2.5 px-4 rounded-xl bg-white/10 text-white font-medium text-sm">
              Send
            </button>
            <button
              onClick={() => router.push('/wallet/receive')}
              className="flex-1 py-2.5 px-4 rounded-xl text-white/50 font-medium text-sm hover:text-white transition-colors"
            >
              Receive
            </button>
            <button
              onClick={() => router.push('/wallet/blik')}
              className="flex-1 py-2.5 px-4 rounded-xl text-white/50 font-medium text-sm hover:text-white transition-colors"
            >
              BLIK
            </button>
          </div>

          {/* Recipient Input */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 mb-3">
            <label className="text-sm text-white/50 mb-2 block">To</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Address or @username"
              className="w-full bg-transparent text-xl font-medium placeholder:text-white/20 focus:outline-none"
            />
            {resolving && (
              <p className="text-sm text-white/50 mt-2">Resolving...</p>
            )}
            {resolvedAddress && resolvedAddress !== recipient && (
              <p className="text-sm text-white/50 mt-2 font-mono">
                {resolvedAddress.slice(0, 12)}...{resolvedAddress.slice(-10)}
              </p>
            )}
          </div>

          {/* Swap Icon */}
          <div className="flex justify-center -my-1 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/50">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <polyline points="19 12 12 19 5 12"/>
              </svg>
            </div>
          </div>

          {/* Amount Input */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-white/50">Amount</label>
              <span className="text-sm text-white/50">
                Balance: {parseFloat(balance).toFixed(4)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                step="0.0001"
                className="flex-1 bg-transparent text-4xl font-medium placeholder:text-white/20 focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAmount(balance)}
                  className="px-2 py-1 text-xs font-medium text-white/60 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                >
                  MAX
                </button>
                <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                      <path d="M12 1.5l-8 14h16l-8-14z"/>
                    </svg>
                  </div>
                  <span className="font-medium">ETH</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gas Estimate */}
          {gasEstimate && (
            <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] rounded-xl mb-4">
              <span className="text-sm text-white/50">Network fee</span>
              <span className="text-sm font-medium">{parseFloat(gasEstimate).toFixed(6)} ETH</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!isValid || loading}
            className="w-full py-4 rounded-2xl font-semibold text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white text-black hover:bg-white/90"
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </main>
    </div>
  )
}

export default function SendPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <SendContent />
    </Suspense>
  )
}
