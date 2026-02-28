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
  formatErrorMessage,
} from '@e-y/shared'
import { getProvider } from '@/lib/multi-network'

export default function SwapPage() {
  const { isReady } = useAuthGuard()
  const { wallet, address, network, currentAccount } = useAccount()

  const isTestAccount = currentAccount?.type === 'test'

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
      setError(formatErrorMessage(err, 'Failed to get swap quote'))
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
      setError(formatErrorMessage(err, 'Token approval failed'))
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
      setError(formatErrorMessage(err, 'Swap failed. Please try again.'))
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
      <label className="text-[10px] text-[var(--foreground-subtle)] uppercase tracking-wider mb-1.5 block">{label}</label>
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
                borderColor: isSelected ? net.color + '60' : 'var(--border)',
                color: isSelected ? net.color : 'var(--foreground-subtle)',
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
            <h1 className="text-xl font-semibold text-[var(--foreground)] text-center mb-6">Swap</h1>

            {/* Testnet block */}
            {isTestAccount && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#eab308]/10 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#eab308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">Swap unavailable on testnet</h2>
                <p className="text-sm text-[var(--foreground-muted)] mb-1">
                  Token swaps require real DEX liquidity and are only available on mainnet networks.
                </p>
                <p className="text-sm text-[var(--foreground-muted)] mb-6">
                  Switch to a real account to use swaps and cross-chain bridges.
                </p>
                <button
                  onClick={() => window.history.back()}
                  className="px-6 py-3 rounded-xl font-medium transition-all bg-[var(--surface-hover)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                >
                  Go back
                </button>
              </div>
            )}

            {!isTestAccount && <>
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
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-3 mb-4">
              <p className="text-xs text-[var(--foreground-subtle)] text-center">
                {isCrossChain
                  ? `${SUPPORTED_NETWORKS[fromNetworkId].name} -> ${SUPPORTED_NETWORKS[toNetworkId].name} via LI.FI`
                  : `Swaps on ${SUPPORTED_NETWORKS[fromNetworkId].name} via LI.FI`}
              </p>
            </div>

            {/* Slippage selector */}
            <div className="flex items-center gap-2 mb-4">
              <div className="relative group">
                <span className="text-xs flex items-center gap-1 cursor-help" style={{ color: 'var(--muted)' }}>
                  Slippage
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-50">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </span>
                <div className="absolute bottom-full left-0 mb-2 w-56 p-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground-muted)] opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-20 shadow-lg">
                  Max price change allowed during swap. If the price moves more than this, the transaction is cancelled to protect you.
                </div>
              </div>
              {SLIPPAGE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => setSlippage(opt)}
                  className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                  style={{
                    background: slippage === opt ? 'var(--surface-hover)' : 'transparent',
                    border: `1px solid ${slippage === opt ? 'var(--border)' : 'var(--border-light)'}`,
                    color: slippage === opt ? 'var(--foreground)' : 'var(--foreground-subtle)',
                  }}
                >
                  {SLIPPAGE_LABELS[opt]}
                </button>
              ))}
            </div>

            {/* From section: Network + Token */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
              <NetworkChips selectedId={fromNetworkId} onChange={handleFromNetworkChange} label="From network" />

              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide">You pay</label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  placeholder="0"
                  step="0.0001"
                  className="flex-1 min-w-0 bg-transparent text-2xl font-bold text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none"
                />
                <button
                  onClick={() => setShowFromTokens(!showFromTokens)}
                  className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-hover)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                >
                  {fromToken?.logoURI && (
                    <img src={fromToken.logoURI} alt="" className="w-5 h-5 rounded-full" />
                  )}
                  <span className="text-[var(--foreground)] font-medium">{fromToken?.symbol || 'Select'}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--foreground-subtle)]">
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
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      {token.logoURI ? (
                        <img src={token.logoURI} alt="" className="w-6 h-6 rounded-full" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[var(--surface-hover)]" />
                      )}
                      <div className="text-left">
                        <p className="text-[var(--foreground)] text-sm font-medium">{token.symbol}</p>
                        <p className="text-xs text-[var(--foreground-subtle)]">{token.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Swap direction button */}
            <div className="flex justify-center my-3 relative z-10">
              <button
                onClick={handleSwapTokens}
                className="w-10 h-10 rounded-xl glass-card flex items-center justify-center text-[var(--foreground)] hover:border-[var(--border)] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 16V4M7 4L3 8M7 4L11 8"/>
                  <path d="M17 8V20M17 20L21 16M17 20L13 16"/>
                </svg>
              </button>
            </div>

            {/* To section: Network + Token */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 mb-5">
              <NetworkChips selectedId={toNetworkId} onChange={handleToNetworkChange} label="To network" />

              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide">You receive</label>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  {quoteLoading ? (
                    <div className="h-8 w-24 bg-[var(--surface-hover)] rounded animate-pulse" />
                  ) : (
                    <p className="text-2xl font-bold text-[var(--foreground)]">
                      {quote ? formatTokenAmount(quote.toAmount, quote.toToken.decimals, 6) : '0'}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowToTokens(!showToTokens)}
                  className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-hover)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                >
                  {toToken?.logoURI && (
                    <img src={toToken.logoURI} alt="" className="w-5 h-5 rounded-full" />
                  )}
                  <span className="text-[var(--foreground)] font-medium">{toToken?.symbol || 'Select'}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--foreground-subtle)]">
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
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
                    >
                      {token.logoURI ? (
                        <img src={token.logoURI} alt="" className="w-6 h-6 rounded-full" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[var(--surface-hover)]" />
                      )}
                      <div className="text-left">
                        <p className="text-[var(--foreground)] text-sm font-medium">{token.symbol}</p>
                        <p className="text-xs text-[var(--foreground-subtle)]">{token.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quote Details */}
            {quote && (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 mb-5 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--foreground-subtle)]">Rate</span>
                  <span className="text-[var(--foreground)]">
                    1 {fromToken?.symbol} = {parseFloat(quote.exchangeRate).toFixed(4)} {toToken?.symbol}
                  </span>
                </div>
                {parseFloat(quote.priceImpact) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--foreground-subtle)]">Price Impact</span>
                    <span className={parseFloat(quote.priceImpact) > 1 ? 'text-[#f87171]' : 'text-[var(--foreground)]'}>
                      {parseFloat(quote.priceImpact).toFixed(2)}%
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--foreground-subtle)]">Network Fee</span>
                  <span className="text-[var(--foreground)]">${parseFloat(quote.gasCostUSD).toFixed(2)}</span>
                </div>
                {/* Route info for cross-chain */}
                {isCrossChain && quote.route && (
                  <>
                    {quote.route.totalDuration > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--foreground-subtle)]">Estimated Time</span>
                        <span className="text-[var(--foreground)]">
                          ~{Math.ceil(quote.route.totalDuration / 60)} min
                        </span>
                      </div>
                    )}
                    {quote.route.steps.length > 1 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--foreground-subtle)]">Route Steps</span>
                        <span className="text-[var(--foreground)]">
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
              <div className="flex items-start gap-2.5 px-4 py-3 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl mb-5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
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
              className="w-full py-4 rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[var(--foreground)] text-[var(--background)] shimmer hover:opacity-90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              {swapStatus === 'loading'
                ? 'Swapping...'
                : quoteLoading
                  ? 'Getting quote...'
                  : isCrossChain
                    ? 'Cross-chain Swap'
                    : 'Swap'}
            </button>
            </>}
          </div>
        </div>
      </main>
    </div>
  )
}
