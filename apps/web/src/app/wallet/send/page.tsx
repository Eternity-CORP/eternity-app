'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { ethers } from 'ethers'
import { lookupUsername, saveTransaction } from '@/lib/supabase'
import Link from 'next/link'

const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY || ''
const NETWORK = 'sepolia'

function SendContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillTo = searchParams.get('to')

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
        const address = await lookupUsername(username)
        setResolving(false)

        if (address) {
          setResolvedAddress(address)
          estimateGas(address)
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

  const isValid = resolvedAddress && amount && parseFloat(amount) > 0 && parseFloat(amount) <= parseFloat(balance)

  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <Link href="/wallet" className="text-white/50 hover:text-white transition-colors">
            ← Back to Wallet
          </Link>
          <h1 className="text-xl font-bold">Send ETH</h1>
          <div className="w-32" />
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-xl mx-auto px-8 py-16">
        <div className="mb-10">
          <h2 className="text-3xl font-bold mb-3">Send ETH</h2>
          <p className="text-white/50">Send ETH to any address or username</p>
        </div>

        {/* Recipient */}
        <div className="mb-8">
          <label className="block text-sm text-white/60 mb-3">Recipient</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Address or @username"
            className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-lg placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
          />
          {resolving && (
            <p className="text-sm text-white/50 mt-3">Resolving username...</p>
          )}
          {resolvedAddress && resolvedAddress !== recipient && (
            <p className="text-sm text-white/70 mt-3">
              Resolved: {resolvedAddress.slice(0, 10)}...{resolvedAddress.slice(-8)}
            </p>
          )}
        </div>

        {/* Amount */}
        <div className="mb-8">
          <label className="block text-sm text-white/60 mb-3">Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              step="0.0001"
              className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-lg placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors pr-20"
            />
            <button
              onClick={() => setAmount(balance)}
              className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 text-sm text-white/70 hover:text-white bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
            >
              MAX
            </button>
          </div>
          <p className="text-sm text-white/50 mt-3">
            Available: {parseFloat(balance).toFixed(4)} ETH
          </p>
        </div>

        {/* Gas estimate */}
        {gasEstimate && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-8">
            <div className="flex justify-between">
              <span className="text-white/50">Estimated gas fee</span>
              <span className="text-white font-medium">{parseFloat(gasEstimate).toFixed(6)} ETH</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-500 text-sm mb-8">{error}</p>
        )}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!isValid || loading}
          className="w-full py-4 px-6 bg-white text-black font-semibold text-lg rounded-xl hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Sending...' : 'Send ETH'}
        </button>

        {/* Network */}
        <div className="flex items-center justify-center gap-2 mt-8 text-sm text-white/40">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span>Sepolia Testnet</span>
        </div>
      </div>
    </main>
  )
}

export default function SendPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-xl text-white/50">Loading...</div>
      </div>
    }>
      <SendContent />
    </Suspense>
  )
}
