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

      <main className="w-full flex justify-center px-6 pt-12 pb-12">
        <div className="w-full max-w-[420px]">
          <div className="bg-[#131313] border border-[#1f1f1f] rounded-2xl p-6">
            <h1 className="text-xl font-semibold text-white text-center mb-8">Send</h1>

            {/* Recipient */}
            <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-4 mb-4">
              <label className="text-xs text-[#6b6b6b] uppercase tracking-wide mb-2 block">To</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="Address or @username"
                className="w-full bg-transparent text-lg font-medium text-white placeholder:text-[#4a4a4a] focus:outline-none"
              />
              {resolving && <p className="text-xs text-[#6b6b6b] mt-2">Resolving...</p>}
              {resolvedAddress && resolvedAddress !== recipient && (
                <p className="text-xs text-[#6b6b6b] mt-2 font-mono truncate">{resolvedAddress}</p>
              )}
            </div>

            {/* Amount */}
            <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-[#6b6b6b] uppercase tracking-wide">Amount</label>
                <button
                  onClick={() => setAmount(balance)}
                  className="text-xs text-[#6b6b6b] hover:text-white transition-colors"
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
                  className="flex-1 min-w-0 bg-transparent text-3xl font-bold text-white placeholder:text-[#4a4a4a] focus:outline-none"
                />
                <span className="flex-shrink-0 text-lg font-medium text-[#6b6b6b]">ETH</span>
              </div>
            </div>

            {/* Gas */}
            {gasEstimate && (
              <div className="flex items-center justify-between px-1 mb-4 text-sm">
                <span className="text-[#6b6b6b]">Network fee</span>
                <span className="text-white">{parseFloat(gasEstimate).toFixed(6)} ETH</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="px-4 py-3 bg-[#2d1515] border border-[#4d2525] rounded-xl mb-4">
                <p className="text-[#f87171] text-sm">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSend}
              disabled={!isValid || loading}
              className="w-full py-4 rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white text-black hover:bg-[#e5e5e5]"
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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#3a3a3a] border-t-white rounded-full animate-spin" />
      </div>
    }>
      <SendContent />
    </Suspense>
  )
}
