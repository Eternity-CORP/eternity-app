'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { ethers } from 'ethers'
import { lookupUsername, saveTransaction } from '@/lib/supabase'

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
  const [txHash, setTxHash] = useState('')
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

  // Resolve recipient (address or @username)
  useEffect(() => {
    const resolve = async () => {
      setError('')
      setResolvedAddress('')

      if (!recipient) return

      // Check if it's an address
      if (recipient.startsWith('0x') && recipient.length === 42) {
        if (ethers.isAddress(recipient)) {
          setResolvedAddress(recipient)
          estimateGas(recipient)
        } else {
          setError('Invalid address')
        }
        return
      }

      // Check if it's a username
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
      const gasLimit = BigInt(21000) // Standard ETH transfer
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

      setTxHash(tx.hash)
      await tx.wait()

      // Save transaction to history
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
    <main className="min-h-screen bg-vignette-grid flex items-center justify-center p-6">
      <div className="glass-card w-full max-w-sm p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <a href="/wallet" className="text-white/50 hover:text-white transition-colors">
            ← Back
          </a>
          <h1 className="font-bold">Send</h1>
          <div className="w-12" />
        </div>

        {/* Recipient */}
        <div className="mb-6">
          <label className="text-white/50 text-sm mb-2 block">To</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Address or @username"
            className="w-full py-4 px-6 bg-white/5 text-white border border-white/10 rounded-full placeholder:text-white/30 focus:border-white/30 focus:outline-none transition-all duration-200"
          />
          {resolving && (
            <p className="text-sm text-white/50 mt-2">Resolving...</p>
          )}
          {resolvedAddress && resolvedAddress !== recipient && (
            <p className="text-sm text-white/70 mt-2">
              → {resolvedAddress.slice(0, 10)}...{resolvedAddress.slice(-8)}
            </p>
          )}
        </div>

        {/* Amount */}
        <div className="mb-6">
          <label className="text-white/50 text-sm mb-2 block">Amount</label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              step="0.0001"
              className="w-full py-4 px-6 bg-white/5 text-white border border-white/10 rounded-full placeholder:text-white/30 focus:border-white/30 focus:outline-none transition-all duration-200"
            />
            <button
              onClick={() => setAmount(balance)}
              className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 text-sm text-white/70 hover:text-white bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-200"
            >
              MAX
            </button>
          </div>
          <p className="text-sm text-white/50 mt-2">
            Balance: {parseFloat(balance).toFixed(4)} ETH
          </p>
        </div>

        {/* Gas estimate */}
        {gasEstimate && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">Estimated gas</span>
              <span className="text-white">{parseFloat(gasEstimate).toFixed(6)} ETH</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-white/70 text-sm mb-6">{error}</p>
        )}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!isValid || loading}
          className="w-full py-4 px-6 bg-white text-black font-medium rounded-full hover:bg-white/90 transition-all duration-200 disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>

        {/* Network */}
        <div className="text-white/30 text-sm text-center mt-6 flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
          <span>Sepolia Testnet</span>
        </div>
      </div>
    </main>
  )
}

export default function SendPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SendContent />
    </Suspense>
  )
}
