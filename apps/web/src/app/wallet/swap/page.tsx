'use client'

import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { useAccount } from '@/contexts/account-context'
import Navigation from '@/components/Navigation'
import BackButton from '@/components/BackButton'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import {
  SwapToken,
  SwapQuote,
  getPopularTokens,
  getNativeToken,
  getSwapQuote,
  executeSwap,
  parseTokenAmount,
  formatTokenAmount,
  NATIVE_TOKEN_ADDRESS,
} from '@/lib/swap'

const CHAIN_ID = 1 // Mainnet for swap (LI.FI doesn't support Sepolia)

export default function SwapPage() {
  const { isReady } = useAuthGuard()
  const { wallet, address, network } = useAccount()

  const [tokens, setTokens] = useState<SwapToken[]>([])
  const [fromToken, setFromToken] = useState<SwapToken | null>(null)
  const [toToken, setToToken] = useState<SwapToken | null>(null)
  const [fromAmount, setFromAmount] = useState('')
  const [quote, setQuote] = useState<SwapQuote | null>(null)

  const [swapStatus, setSwapStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle')
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showFromTokens, setShowFromTokens] = useState(false)
  const [showToTokens, setShowToTokens] = useState(false)

  // Load tokens when logged in
  useEffect(() => {
    if (!isReady) return
    loadTokens()
  }, [isReady])

  const loadTokens = async () => {
    const popular = await getPopularTokens(CHAIN_ID)
    const native = getNativeToken(CHAIN_ID)

    // Add native token at start if not present
    const hasNative = popular.some(t => t.address === NATIVE_TOKEN_ADDRESS)
    const allTokens = hasNative ? popular : [native, ...popular]

    setTokens(allTokens)

    // Default selection
    if (allTokens.length >= 2) {
      setFromToken(allTokens[0])
      setToToken(allTokens.find(t => t.symbol === 'USDC') || allTokens[1])
    }
  }

  const fetchQuote = useCallback(async () => {
    if (!fromToken || !toToken || !fromAmount || parseFloat(fromAmount) <= 0 || !address) {
      setQuote(null)
      return
    }

    setQuoteLoading(true)
    setError('')

    try {
      const amount = parseTokenAmount(fromAmount, fromToken.decimals)
      const q = await getSwapQuote({
        fromChainId: CHAIN_ID,
        toChainId: CHAIN_ID,
        fromToken: fromToken.address,
        toToken: toToken.address,
        fromAmount: amount,
        fromAddress: address,
      })
      setQuote(q)
    } catch (err) {
      console.error('Quote error:', err)
      setError(err instanceof Error ? err.message : 'Failed to get quote')
      setQuote(null)
    } finally {
      setQuoteLoading(false)
    }
  }, [fromToken, toToken, fromAmount, address])

  useEffect(() => {
    const timeout = setTimeout(fetchQuote, 500)
    return () => clearTimeout(timeout)
  }, [fetchQuote])

  const handleSwapTokens = () => {
    const temp = fromToken
    setFromToken(toToken)
    setToToken(temp)
    setFromAmount('')
    setQuote(null)
  }

  const handleSwap = async () => {
    if (!wallet || !quote) return

    setSwapStatus('loading')
    setError('')
    setSuccess('')

    try {
      const provider = new ethers.JsonRpcProvider(network.rpcUrl)
      const connectedWallet = wallet.connect(provider)

      const tx = await executeSwap(quote, connectedWallet)
      await tx.wait()

      setSuccess(`Swap successful! Hash: ${tx.hash.slice(0, 10)}...`)
      setFromAmount('')
      setQuote(null)
      setSwapStatus('succeeded')
    } catch (err) {
      console.error('Swap error:', err)
      setError(err instanceof Error ? err.message : 'Swap failed')
      setSwapStatus('failed')
    }
  }

  const selectFromToken = (token: SwapToken) => {
    if (token.address === toToken?.address) {
      setToToken(fromToken)
    }
    setFromToken(token)
    setShowFromTokens(false)
    setQuote(null)
  }

  const selectToToken = (token: SwapToken) => {
    if (token.address === fromToken?.address) {
      setFromToken(toToken)
    }
    setToToken(token)
    setShowToTokens(false)
    setQuote(null)
  }

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-12 pb-12">
        <div className="w-full max-w-[420px]">
          <BackButton />
          <div className="glass-card gradient-border rounded-2xl p-6">
            <h1 className="text-xl font-semibold text-white text-center mb-8">Swap</h1>

            {/* Mainnet Notice */}
            <div className="bg-white/3 border border-white/8 rounded-xl p-3 mb-4">
              <p className="text-xs text-white/40 text-center">
                Swaps use Ethereum Mainnet via LI.FI
              </p>
            </div>

            {/* From Token */}
            <div className="bg-white/3 border border-white/8 rounded-xl p-4 mb-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-white/40 uppercase tracking-wide">You pay</label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  placeholder="0"
                  step="0.0001"
                  className="flex-1 min-w-0 bg-transparent text-2xl font-bold text-white placeholder:text-white/25 focus:outline-none"
                />
                <button
                  onClick={() => setShowFromTokens(!showFromTokens)}
                  className="flex items-center gap-2 px-3 py-2 bg-white/8 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {fromToken?.logoURI && (
                    <img src={fromToken.logoURI} alt="" className="w-5 h-5 rounded-full" />
                  )}
                  <span className="text-white font-medium">{fromToken?.symbol || 'Select'}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
              </div>

              {/* From Token Dropdown */}
              {showFromTokens && (
                <div className="mt-3 max-h-[200px] overflow-y-auto space-y-1">
                  {tokens.map((token) => (
                    <button
                      key={token.address}
                      onClick={() => selectFromToken(token)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/8 transition-colors"
                    >
                      {token.logoURI ? (
                        <img src={token.logoURI} alt="" className="w-6 h-6 rounded-full" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/20" />
                      )}
                      <div className="text-left">
                        <p className="text-white text-sm font-medium">{token.symbol}</p>
                        <p className="text-xs text-white/40">{token.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Swap Button */}
            <div className="flex justify-center -my-1 relative z-10">
              <button
                onClick={handleSwapTokens}
                className="w-10 h-10 rounded-xl glass-card flex items-center justify-center text-white hover:border-white/15 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 16V4M7 4L3 8M7 4L11 8"/>
                  <path d="M17 8V20M17 20L21 16M17 20L13 16"/>
                </svg>
              </button>
            </div>

            {/* To Token */}
            <div className="bg-white/3 border border-white/8 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-white/40 uppercase tracking-wide">You receive</label>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  {quoteLoading ? (
                    <div className="h-8 w-24 bg-white/8 rounded animate-pulse" />
                  ) : (
                    <p className="text-2xl font-bold text-white">
                      {quote ? formatTokenAmount(quote.toAmount, quote.toToken.decimals, 6) : '0'}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowToTokens(!showToTokens)}
                  className="flex items-center gap-2 px-3 py-2 bg-white/8 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {toToken?.logoURI && (
                    <img src={toToken.logoURI} alt="" className="w-5 h-5 rounded-full" />
                  )}
                  <span className="text-white font-medium">{toToken?.symbol || 'Select'}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
              </div>

              {/* To Token Dropdown */}
              {showToTokens && (
                <div className="mt-3 max-h-[200px] overflow-y-auto space-y-1">
                  {tokens.map((token) => (
                    <button
                      key={token.address}
                      onClick={() => selectToToken(token)}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/8 transition-colors"
                    >
                      {token.logoURI ? (
                        <img src={token.logoURI} alt="" className="w-6 h-6 rounded-full" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/20" />
                      )}
                      <div className="text-left">
                        <p className="text-white text-sm font-medium">{token.symbol}</p>
                        <p className="text-xs text-white/40">{token.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quote Details */}
            {quote && (
              <div className="bg-white/3 border border-white/8 rounded-xl p-4 mb-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/40">Rate</span>
                  <span className="text-white">
                    1 {fromToken?.symbol} = {parseFloat(quote.exchangeRate).toFixed(4)} {toToken?.symbol}
                  </span>
                </div>
                {parseFloat(quote.priceImpact) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/40">Price Impact</span>
                    <span className={parseFloat(quote.priceImpact) > 1 ? 'text-[#f87171]' : 'text-white'}>
                      {parseFloat(quote.priceImpact).toFixed(2)}%
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/40">Network Fee</span>
                  <span className="text-white">${parseFloat(quote.gasCostUSD).toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="px-4 py-3 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl mb-4">
                <p className="text-[#f87171] text-sm">{error}</p>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="px-4 py-3 bg-[#22c55e]/8 border border-[#22c55e]/20 rounded-xl mb-4">
                <p className="text-[#22c55e] text-sm">{success}</p>
              </div>
            )}

            {/* Swap Button */}
            <button
              onClick={handleSwap}
              disabled={!quote || swapStatus === 'loading' || quoteLoading}
              className="w-full py-4 rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white text-black shimmer hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              {swapStatus === 'loading' ? 'Swapping...' : quoteLoading ? 'Getting quote...' : 'Swap'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
