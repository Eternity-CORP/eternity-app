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
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation isLoggedIn={true} address={address} onLogout={handleLogout} />

      <main className="max-w-[480px] mx-auto px-6 py-12">
        {/* Card */}
        <div className="bg-[#131313] border border-[#1f1f1f] rounded-2xl p-6">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1.5 bg-[#1a1a1a] rounded-xl mb-6">
            <button className="flex-1 py-3 px-4 rounded-lg bg-[#252525] text-white font-semibold text-sm">
              Send
            </button>
            <button
              onClick={() => router.push('/wallet/receive')}
              className="flex-1 py-3 px-4 rounded-lg text-[#9b9b9b] font-semibold text-sm hover:text-white transition-colors"
            >
              Receive
            </button>
            <button
              onClick={() => router.push('/wallet/blik')}
              className="flex-1 py-3 px-4 rounded-lg text-[#9b9b9b] font-semibold text-sm hover:text-white transition-colors"
            >
              BLIK
            </button>
          </div>

          {/* Recipient Input */}
          <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-4 mb-3">
            <label className="text-sm text-[#9b9b9b] mb-2 block font-medium">To</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Address or @username"
              className="w-full bg-transparent text-xl font-semibold text-white placeholder:text-[#4a4a4a] focus:outline-none"
            />
            {resolving && (
              <p className="text-sm text-[#9b9b9b] mt-2">Resolving...</p>
            )}
            {resolvedAddress && resolvedAddress !== recipient && (
              <p className="text-sm text-[#6b6b6b] mt-2 font-mono">
                {resolvedAddress.slice(0, 12)}...{resolvedAddress.slice(-10)}
              </p>
            )}
          </div>

          {/* Swap Icon */}
          <div className="flex justify-center -my-1 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-[#1f1f1f] border border-[#2a2a2a] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#6b6b6b]">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <polyline points="19 12 12 19 5 12"/>
              </svg>
            </div>
          </div>

          {/* Amount Input */}
          <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-[#9b9b9b] font-medium">Amount</label>
              <span className="text-sm text-[#6b6b6b]">
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
                className="flex-1 bg-transparent text-4xl font-bold text-white placeholder:text-[#4a4a4a] focus:outline-none"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAmount(balance)}
                  className="px-3 py-1.5 text-xs font-semibold text-[#9b9b9b] bg-[#252525] rounded-lg hover:bg-[#2a2a2a] transition-colors"
                >
                  MAX
                </button>
                <div className="flex items-center gap-2 px-3 py-2 bg-[#252525] rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-[#3a3a3a] flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                      <path d="M12 1.5l-8 14h16l-8-14z"/>
                    </svg>
                  </div>
                  <span className="font-semibold text-white">ETH</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gas Estimate */}
          {gasEstimate && (
            <div className="flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border border-[#252525] rounded-xl mb-4">
              <span className="text-sm text-[#9b9b9b]">Network fee</span>
              <span className="text-sm font-semibold text-white">{parseFloat(gasEstimate).toFixed(6)} ETH</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-4 py-3 bg-[#2d1515] border border-[#4d2525] rounded-xl mb-4">
              <p className="text-[#f87171] text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!isValid || loading}
            className="w-full py-4 rounded-xl font-semibold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white text-black hover:bg-[#e5e5e5]"
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
