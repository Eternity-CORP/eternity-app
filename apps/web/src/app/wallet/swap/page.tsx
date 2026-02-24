'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from '@/contexts/account-context'
import Navigation from '@/components/Navigation'
import BackButton from '@/components/BackButton'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import {
  type SwapToken,
  type SwapQuote,
  getPopularTokens,
  getNativeToken,
  getSwapQuote,
  executeSwap,
  checkAllowance,
  getApprovalData,
  parseTokenAmount,
  formatTokenAmount,
  NATIVE_TOKEN_ADDRESS,
} from '@/lib/swap'
import {
  SUPPORTED_NETWORKS,
  TIER1_NETWORK_IDS,
  NETWORK_TO_CHAIN_ID,
  LIFI_CONTRACT_ADDRESSES,
  type NetworkId,
  SLIPPAGE_OPTIONS,
  SLIPPAGE_LABELS,
  DEFAULT_SLIPPAGE,
  PRICE_IMPACT_WARNING_THRESHOLD,
} from '@e-y/shared'
import { getProvider } from '@/lib/multi-network'

export default function SwapPage() {
  const { isReady } = useAuthGuard()
  const { wallet, address, network } = useAccount()

  // Network state
  const [fromNetworkId, setFromNetworkId] = useState<NetworkId>('base')
  const [toNetworkId, setToNetworkId] = useState<NetworkId>('base')

  // Token lists per chain
  const [fromTokens, setFromTokens] = useState<SwapToken[]>([])
  const [toTokens, setToTokens] = useState<SwapToken[]>([])

  const [fromToken, setFromToken] = useState<SwapToken | null>(null)
  const [toToken, setToToken] = useState<SwapToken | null>(null)
  const [fromAmount, setFromAmount] = useState('')
  const [quote, setQuote] = useState<SwapQuote | null>(null)

  const [swapStatus, setSwapStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle')
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [slippage, setSlippage] = useState(DEFAULT_SLIPPAGE)
  const [showFromTokens, setShowFromTokens] = useState(false)
  const [showToTokens, setShowToTokens] = useState(false)

  // ERC-20 approval state
  const [approvalNeeded, setApprovalNeeded] = useState(false)
  const [approvalStatus, setApprovalStatus] = useState<'idle' | 'approving' | 'approved'>('idle')

  const isCrossChain = fromNetworkId !== toNetworkId

  // Load tokens for "from" chain
  useEffect(() => {
    if (!isReady) return
    loadFromTokens()
  }, [isReady, fromNetworkId])

  // Load tokens for "to" chain
  useEffect(() => {
    if (!isReady) return
    loadToTokens()
  }, [isReady, toNetworkId])

  const loadFromTokens = async () => {
    const chainId = NETWORK_TO_CHAIN_ID[fromNetworkId]
    const popular = await getPopularTokens(chainId)
    const native = getNativeToken(chainId)

    const hasNative = popular.some(t => t.address === NATIVE_TOKEN_ADDRESS)
    const allTokens = hasNative ? popular : [native, ...popular]

    setFromTokens(allTokens)

    // Default selection
    if (allTokens.length >= 1) {
      setFromToken(allTokens[0])
    }
  }

  const loadToTokens = async () => {
    const chainId = NETWORK_TO_CHAIN_ID[toNetworkId]
    const popular = await getPopularTokens(chainId)
    const native = getNativeToken(chainId)

    const hasNative = popular.some(t => t.address === NATIVE_TOKEN_ADDRESS)
    const allTokens = hasNative ? popular : [native, ...popular]

    setToTokens(allTokens)

    // Default selection
    if (allTokens.length >= 1) {
      setToToken(allTokens.find(t => t.symbol === 'USDC') || allTokens[allTokens.length > 1 ? 1 : 0])
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
        fromChainId: NETWORK_TO_CHAIN_ID[fromNetworkId],
        toChainId: NETWORK_TO_CHAIN_ID[toNetworkId],
        fromToken: fromToken.address,
        toToken: toToken.address,
        fromAmount: amount,
        fromAddress: address,
        slippage,
      })
      setQuote(q)
    } catch (err) {
      console.error('Quote error:', err)
      setError(err instanceof Error ? err.message : 'Failed to get quote')
      setQuote(null)
    } finally {
      setQuoteLoading(false)
    }
  }, [fromToken, toToken, fromAmount, address, fromNetworkId, toNetworkId, slippage])

  useEffect(() => {
    const timeout = setTimeout(fetchQuote, 500)
    return () => clearTimeout(timeout)
  }, [fetchQuote])

  // Check ERC-20 allowance when quote is ready
  useEffect(() => {
    const checkApproval = async () => {
      if (!quote || !fromToken || !address) {
        setApprovalNeeded(false)
        return
      }

      // Native tokens never need approval
      if (fromToken.address === NATIVE_TOKEN_ADDRESS) {
        setApprovalNeeded(false)
        return
      }

      try {
        const chainId = NETWORK_TO_CHAIN_ID[fromNetworkId]
        const spender = LIFI_CONTRACT_ADDRESSES[chainId] || LIFI_CONTRACT_ADDRESSES[1]
        const provider = getProvider(fromNetworkId)

        const allowance = await checkAllowance(
          fromToken.address,
          address,
          spender,
          provider,
        )

        const fromAmountWei = parseTokenAmount(fromAmount, fromToken.decimals)
        setApprovalNeeded(allowance < BigInt(fromAmountWei))
        // Reset approval status when re-checking
        setApprovalStatus('idle')
      } catch (err) {
        console.error('Allowance check failed:', err)
        // If check fails, assume approval needed to be safe
        setApprovalNeeded(true)
      }
    }

    checkApproval()
  }, [quote, fromToken, fromAmount, fromNetworkId, address])

  const handleApprove = async () => {
    if (!wallet || !fromToken || !fromAmount) return

    setApprovalStatus('approving')
    setError('')

    try {
      const chainId = NETWORK_TO_CHAIN_ID[fromNetworkId]
      const spender = LIFI_CONTRACT_ADDRESSES[chainId] || LIFI_CONTRACT_ADDRESSES[1]
      const provider = getProvider(fromNetworkId)
      const connectedWallet = wallet.connect(provider)

      const fromAmountWei = parseTokenAmount(fromAmount, fromToken.decimals)
      const { to, data } = getApprovalData(fromToken.address, spender, fromAmountWei)

      const tx = await connectedWallet.sendTransaction({ to, data })
      await tx.wait()

      setApprovalNeeded(false)
      setApprovalStatus('approved')
    } catch (err) {
      console.error('Approval failed:', err)
      setError(err instanceof Error ? err.message : 'Token approval failed')
      setApprovalStatus('idle')
    }
  }

  const handleSwapTokens = () => {
    const tempNetwork = fromNetworkId
    const tempToken = fromToken
    const tempTokens = fromTokens

    setFromNetworkId(toNetworkId)
    setToNetworkId(tempNetwork)
    setFromToken(toToken)
    setToToken(tempToken)
    setFromTokens(toTokens)
    setToTokens(tempTokens)
    setFromAmount('')
    setQuote(null)
    setApprovalNeeded(false)
    setApprovalStatus('idle')
  }

  const handleFromNetworkChange = (networkId: NetworkId) => {
    if (networkId === fromNetworkId) return
    setFromNetworkId(networkId)
    setFromToken(null)
    setQuote(null)
    setError('')
  }

  const handleToNetworkChange = (networkId: NetworkId) => {
    if (networkId === toNetworkId) return
    setToNetworkId(networkId)
    setToToken(null)
    setQuote(null)
    setError('')
  }

  const handleSwap = async () => {
    if (!wallet || !quote) return

    setSwapStatus('loading')
    setError('')
    setSuccess('')

    try {
      const provider = getProvider(fromNetworkId)
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
    if (token.address === toToken?.address && fromNetworkId === toNetworkId) {
      setToToken(fromToken)
    }
    setFromToken(token)
    setShowFromTokens(false)
    setQuote(null)
  }

  const selectToToken = (token: SwapToken) => {
    if (token.address === fromToken?.address && fromNetworkId === toNetworkId) {
      setFromToken(toToken)
    }
    setToToken(token)
    setShowToTokens(false)
    setQuote(null)
  }

  // Network selector chip component
  const NetworkChips = ({
    selectedId,
    onChange,
    label,
  }: {
    selectedId: NetworkId
    onChange: (id: NetworkId) => void
    label: string
  }) => (
    <div className="mb-2">
      <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {TIER1_NETWORK_IDS.map((id) => {
          const net = SUPPORTED_NETWORKS[id]
          const isSelected = id === selectedId
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all border"
              style={{
                backgroundColor: isSelected ? net.color + '20' : 'transparent',
                borderColor: isSelected ? net.color + '60' : 'rgba(255,255,255,0.08)',
                color: isSelected ? net.color : 'rgba(255,255,255,0.4)',
              }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                style={{ backgroundColor: net.color }}
              />
              {net.shortName}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-12 pb-12">
        <div className="w-full max-w-[420px]">
          <BackButton />
          <div className="glass-card gradient-border rounded-2xl p-6">
            <h1 className="text-xl font-semibold text-white text-center mb-6">Swap</h1>

            {/* Cross-chain indicator */}
            {isCrossChain && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <div
                  className="text-xs px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5"
                  style={{ background: 'rgba(51, 136, 255, 0.12)', color: '#3388FF' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12h16M12 4l8 8-8 8" />
                  </svg>
                  Cross-chain (bridge + swap)
                </div>
              </div>
            )}

            {/* Multi-network notice */}
            <div className="bg-white/3 border border-white/8 rounded-xl p-3 mb-4">
              <p className="text-xs text-white/40 text-center">
                {isCrossChain
                  ? `${SUPPORTED_NETWORKS[fromNetworkId].name} -> ${SUPPORTED_NETWORKS[toNetworkId].name} via LI.FI`
                  : `Swaps on ${SUPPORTED_NETWORKS[fromNetworkId].name} via LI.FI`}
              </p>
            </div>

            {/* Slippage selector */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs" style={{ color: 'var(--muted)' }}>Slippage:</span>
              {SLIPPAGE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => setSlippage(opt)}
                  className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                  style={{
                    background: slippage === opt ? 'rgba(255,255,255,0.15)' : 'transparent',
                    border: `1px solid ${slippage === opt ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                    color: slippage === opt ? 'white' : 'var(--muted)',
                  }}
                >
                  {SLIPPAGE_LABELS[opt]}
                </button>
              ))}
            </div>

            {/* From section: Network + Token */}
            <div className="bg-white/3 border border-white/8 rounded-xl p-4 mb-2">
              <NetworkChips selectedId={fromNetworkId} onChange={handleFromNetworkChange} label="From network" />

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
                  {fromTokens.map((token) => (
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

            {/* Swap direction button */}
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

            {/* To section: Network + Token */}
            <div className="bg-white/3 border border-white/8 rounded-xl p-4 mb-4">
              <NetworkChips selectedId={toNetworkId} onChange={handleToNetworkChange} label="To network" />

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
                  {toTokens.map((token) => (
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
                {/* Route info for cross-chain */}
                {isCrossChain && quote.route && (
                  <>
                    {quote.route.totalDuration > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/40">Estimated Time</span>
                        <span className="text-white">
                          ~{Math.ceil(quote.route.totalDuration / 60)} min
                        </span>
                      </div>
                    )}
                    {quote.route.steps.length > 1 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white/40">Route Steps</span>
                        <span className="text-white">
                          {quote.route.steps.map(s => s.toolDetails.name).join(' -> ')}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Price impact warning */}
            {quote && parseFloat(quote.priceImpact) / 100 > PRICE_IMPACT_WARNING_THRESHOLD && (
              <div className="p-3 rounded-lg mb-3" style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                <p className="text-xs" style={{ color: '#eab308' }}>
                  High price impact: {parseFloat(quote.priceImpact).toFixed(2)}%. Consider reducing the amount or using a different route.
                </p>
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

            {/* Approve + Swap Buttons */}
            {approvalNeeded && quote && (
              <button
                onClick={handleApprove}
                disabled={approvalStatus === 'approving'}
                className="w-full py-4 rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed mb-3"
                style={{
                  background: 'rgba(51, 136, 255, 0.15)',
                  border: '1px solid rgba(51, 136, 255, 0.4)',
                  color: '#3388FF',
                }}
              >
                {approvalStatus === 'approving'
                  ? `Approving ${fromToken?.symbol}...`
                  : `Approve ${fromToken?.symbol}`}
              </button>
            )}

            <button
              onClick={handleSwap}
              disabled={!quote || swapStatus === 'loading' || quoteLoading || approvalNeeded}
              className="w-full py-4 rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white text-black shimmer hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              {swapStatus === 'loading'
                ? 'Swapping...'
                : quoteLoading
                  ? 'Getting quote...'
                  : isCrossChain
                    ? 'Cross-chain Swap'
                    : 'Swap'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
