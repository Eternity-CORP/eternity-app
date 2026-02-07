'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ethers } from 'ethers'
import { lookupUsername, saveTransaction } from '@/lib/supabase'
import { useAccount } from '@/contexts/account-context'
import Navigation from '@/components/Navigation'

function SendContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillTo = searchParams.get('to')

  const { wallet, address, network, isLoggedIn } = useAccount()

  const [recipient, setRecipient] = useState(prefillTo || '')
  const [amount, setAmount] = useState('')
  const [resolvedAddress, setResolvedAddress] = useState('')
  const [balance, setBalance] = useState('0')
  const [gasEstimate, setGasEstimate] = useState('')
  const [loading, setLoading] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoggedIn && address === '') return
    if (!isLoggedIn) {
      router.push('/unlock')
    }
  }, [isLoggedIn, address, router])

  useEffect(() => {
    if (address) {
      fetchBalance(address)
    }
  }, [address, network.rpcUrl])

  const fetchBalance = async (addr: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(network.rpcUrl)
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
      const provider = new ethers.JsonRpcProvider(network.rpcUrl)
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
      const provider = new ethers.JsonRpcProvider(network.rpcUrl)
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
        token_symbol: network.symbol,
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

  const isValid = resolvedAddress && amount && parseFloat(amount) > 0 && parseFloat(amount) <= parseFloat(balance)

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-12 pb-12">
        <div className="w-full max-w-[420px]">
          <div className="glass-card gradient-border rounded-2xl p-6">
            <h1 className="text-xl font-semibold text-white text-center mb-8">Send</h1>

            {/* Recipient */}
            <div className="bg-white/3 border border-white/8 rounded-xl p-4 mb-4">
              <label className="text-xs text-white/40 uppercase tracking-wide mb-2 block">To</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Address or @username"
                className="w-full bg-transparent text-lg font-medium text-white placeholder:text-white/25 focus:outline-none"
              />
              {resolving && <p className="text-xs text-white/40 mt-2">Resolving...</p>}
              {resolvedAddress && resolvedAddress !== recipient && (
                <p className="text-xs text-white/40 mt-2 font-mono truncate">{resolvedAddress}</p>
              )}
            </div>

            {/* Amount */}
            <div className="bg-white/3 border border-white/8 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-white/40 uppercase tracking-wide">Amount</label>
                <button
                  onClick={() => setAmount(balance)}
                  className="text-xs text-white/40 hover:text-white transition-colors"
                >
                  Max: {parseFloat(balance).toFixed(4)}
                </button>
              </div>
              <div className="flex items-center gap-3 overflow-hidden">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  step="0.0001"
                  className="flex-1 min-w-0 bg-transparent text-3xl font-bold text-white placeholder:text-white/25 focus:outline-none"
                />
                <span className="flex-shrink-0 text-lg font-medium text-white/40">ETH</span>
              </div>
            </div>

            {/* Gas */}
            {gasEstimate && (
              <div className="flex items-center justify-between px-1 mb-4 text-sm">
                <span className="text-white/40">Network fee</span>
                <span className="text-white">{parseFloat(gasEstimate).toFixed(6)} ETH</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="px-4 py-3 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl mb-4">
                <p className="text-[#f87171] text-sm">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSend}
              disabled={!isValid || loading}
              className="w-full py-4 rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white text-black shimmer hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function SendPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <SendContent />
    </Suspense>
  )
}
