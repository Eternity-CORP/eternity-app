'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ethers } from 'ethers'
import { lookupUsername, getAddressPreferences, checkGasAvailability, SUPPORTED_NETWORKS, type NetworkId, type BridgeStatusResult, type GasGuardResult } from '@e-y/shared'
import type { AggregatedTokenBalance } from '@e-y/shared'
import { apiClient } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'
import { useBalance } from '@/contexts/balance-context'
import Navigation from '@/components/Navigation'
import TokenSelector from '@/components/TokenSelector'
import BridgeBanner from '@/components/BridgeBanner'
import BridgeProgress from '@/components/BridgeProgress'
import { sendOnNetwork, estimateGasOnNetwork } from '@/lib/send-service'
import { calculateTransferRoute, type RoutingResult } from '@/lib/routing-service'
import { executeBridgeWithRetry } from '@/lib/bridge-service'
import BackButton from '@/components/BackButton'
import { useAuthGuard } from '@/hooks/useAuthGuard'

function SendContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillTo = searchParams.get('to')
  const prefillToken = searchParams.get('token')

  useAuthGuard()
  const { wallet, address } = useAccount()
  const { aggregatedBalances } = useBalance()

  const [recipient, setRecipient] = useState(prefillTo || '')
  const [amount, setAmount] = useState('')
  const [selectedToken, setSelectedToken] = useState(prefillToken?.toUpperCase() || 'ETH')
  const [resolvedAddress, setResolvedAddress] = useState('')
  const [gasEstimate, setGasEstimate] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle')
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState('')

  // Bridge state
  const [route, setRoute] = useState<RoutingResult | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [bridging, setBridging] = useState(false)
  const [bridgeStep, setBridgeStep] = useState('')
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatusResult | null>(null)
  const [bridgeTxHash, setBridgeTxHash] = useState<string | null>(null)

  // Gas guard
  const [gasGuard, setGasGuard] = useState<GasGuardResult | null>(null)

  // Get balance for selected token
  const tokenData = aggregatedBalances.find(
    (t) => t.symbol.toUpperCase() === selectedToken,
  )
  const balance = tokenData?.totalBalance || '0'

  // Get the best network/contract for the selected token
  const primaryNetwork = tokenData?.networks?.[0]

  useEffect(() => {
    const resolve = async () => {
      setError('')
      setResolvedAddress('')

      if (!recipient) return

      if (recipient.startsWith('0x') && recipient.length === 42) {
        if (ethers.isAddress(recipient)) {
          setResolvedAddress(recipient)
        } else {
          setError('Invalid address')
        }
        return
      }

      if (recipient.startsWith('@') || !recipient.startsWith('0x')) {
        setResolving(true)
        const username = recipient.startsWith('@') ? recipient.slice(1) : recipient
        const result = await lookupUsername(apiClient, username)
        setResolving(false)

        if (result) {
          setResolvedAddress(result.address)
        } else {
          setError(`Username @${username} not found`)
        }
      }
    }

    const timeout = setTimeout(resolve, 500)
    return () => clearTimeout(timeout)
  }, [recipient])

  // Calculate route when address/amount/token change
  useEffect(() => {
    if (!resolvedAddress || !amount || parseFloat(amount) <= 0 || !address) {
      setRoute(null)
      return
    }

    let cancelled = false
    setRouteLoading(true)

    const calculateRoute = async () => {
      // Fetch recipient preferences
      let recipientPrefNetwork: NetworkId | null = null
      try {
        const prefs = await getAddressPreferences(apiClient, resolvedAddress)
        if (prefs?.defaultNetwork) {
          recipientPrefNetwork = prefs.defaultNetwork as NetworkId
        }
      } catch (err) {
        console.error('Failed to load recipient network preferences:', err)
      }

      if (cancelled) return

      const result = await calculateTransferRoute(
        aggregatedBalances,
        selectedToken,
        amount,
        recipientPrefNetwork,
        address,
        resolvedAddress,
      )

      if (!cancelled) {
        setRoute(result)
        setRouteLoading(false)
      }
    }

    const timeout = setTimeout(calculateRoute, 800)
    return () => { cancelled = true; clearTimeout(timeout) }
  }, [resolvedAddress, amount, selectedToken, address, aggregatedBalances])

  // Estimate gas when address/amount/token change
  useEffect(() => {
    if (!resolvedAddress || !amount || parseFloat(amount) <= 0) {
      setGasEstimate('')
      setGasGuard(null)
      return
    }

    const runGasGuard = (networkId: string, gasEstimateValue: string) => {
      const networkConfig = SUPPORTED_NETWORKS[networkId as NetworkId]
      const nativeSymbol = networkConfig?.nativeCurrency?.symbol || 'ETH'

      // Find native balance on the sending network
      const nativeToken = aggregatedBalances.find(
        t => t.symbol.toUpperCase() === nativeSymbol.toUpperCase()
      )
      const nativeOnNetwork = nativeToken?.networks.find(n => n.networkId === networkId)
      const nativeBalance = nativeOnNetwork?.balance || '0'

      // Use USD value ratio to derive approximate native token price
      const nativeTokenPriceUsd = nativeOnNetwork && parseFloat(nativeOnNetwork.balance) > 0
        ? nativeOnNetwork.usdValue / parseFloat(nativeOnNetwork.balance)
        : 0

      const guardResult = checkGasAvailability(
        networkId,
        nativeSymbol,
        nativeBalance,
        gasEstimateValue,
        nativeTokenPriceUsd,
      )
      setGasGuard(guardResult)
    }

    const doEstimate = async () => {
      try {
        // Use route's network when available, otherwise fall back to default
        const networkId = route?.fromNetwork || 'ethereum'
        const isNative = selectedToken === 'ETH' || (primaryNetwork?.contractAddress === 'native')
        const tokenInfo = !isNative && primaryNetwork
          ? { address: primaryNetwork.contractAddress, decimals: tokenData?.decimals || 18 }
          : undefined

        const estimate = await estimateGasOnNetwork(networkId, address, resolvedAddress, amount, tokenInfo)
        setGasEstimate(estimate.totalGasCost)
        runGasGuard(networkId, estimate.totalGasCost)
      } catch (err) {
        console.error('Gas estimation failed, falling back to basic estimate:', err)
        try {
          const { getProvider } = await import('@/lib/multi-network')
          const networkId = route?.fromNetwork || 'ethereum'
          const provider = getProvider(networkId)
          const feeData = await provider.getFeeData()
          const gasLimit = BigInt(21000)
          const gasCost = gasLimit * (feeData.gasPrice || BigInt(0))
          const gasCostEth = ethers.formatEther(gasCost)
          setGasEstimate(gasCostEth)
          runGasGuard(networkId, gasCostEth)
        } catch (fallbackErr) {
          console.error('Fallback gas estimation also failed:', fallbackErr)
          setGasEstimate('')
          setGasGuard(null)
        }
      }
    }

    doEstimate()
  }, [resolvedAddress, amount, selectedToken, address, route, aggregatedBalances])

  const handleSend = async () => {
    if (!wallet || !resolvedAddress || !amount) return

    setStatus('loading')
    setError('')

    try {
      const networkId = route?.fromNetwork || 'ethereum'
      const isNative = selectedToken === 'ETH' || (primaryNetwork?.contractAddress === 'native')
      const tokenInfo = !isNative && primaryNetwork
        ? { address: primaryNetwork.contractAddress, decimals: tokenData?.decimals || 18 }
        : undefined

      const txHash = await sendOnNetwork(wallet, networkId, resolvedAddress, amount, tokenInfo)

      setStatus('succeeded')
      router.push(`/wallet/send/success?hash=${txHash}&network=${networkId}`)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed'
      setError(errorMessage.includes('insufficient') ? 'Insufficient balance' : errorMessage)
      setStatus('failed')
    }
  }

  const handleBridgeProceed = async () => {
    if (!wallet || !route?.bridgeQuote) return

    setBridging(true)
    setError('')
    setBridgeStep('Starting bridge...')
    setBridgeStatus(null)
    setBridgeTxHash(null)

    try {
      const sourceNet = SUPPORTED_NETWORKS[route.fromNetwork]
      const rpcUrl = sourceNet.rpcUrlTemplate.replace('{apiKey}', process.env.NEXT_PUBLIC_ALCHEMY_KEY || '')
      const provider = new ethers.JsonRpcProvider(rpcUrl)

      const { txHash, result } = await executeBridgeWithRetry(
        route.bridgeQuote,
        wallet,
        provider,
        (step) => setBridgeStep(step),
        (status) => setBridgeStatus(status),
      )

      setBridgeTxHash(txHash)

      if (result.status === 'DONE') {
        setBridgeStatus(result)
      } else {
        setError(result.message || 'Bridge failed')
        setBridgeStatus(result)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Bridge failed'
      setError(msg)
      setBridgeStatus({ status: 'FAILED', message: msg })
    }
  }

  const handleBridgeCancel = () => {
    setRoute(null)
  }

  const handleBridgeDone = () => {
    setBridging(false)
    setBridgeStep('')
    setBridgeStatus(null)
    setBridgeTxHash(null)
    router.push('/wallet')
  }

  const handleTokenSelect = (token: AggregatedTokenBalance) => {
    setSelectedToken(token.symbol.toUpperCase())
    setAmount('')
    setRoute(null)
  }

  const loading = status === 'loading'
  const isValid = resolvedAddress && amount && parseFloat(amount) > 0 && parseFloat(amount) <= parseFloat(balance)
  const showBridgeBanner = route && route.type === 'bridge' && !bridging
  const showBridgeProgress = bridging
  const isDirect = !route || route.type === 'direct'

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-12 pb-12">
        <div className="w-full max-w-[420px]">
          <BackButton />
          {/* Bridge Progress (replaces form when active) */}
          {showBridgeProgress ? (
            <BridgeProgress
              currentStep={bridgeStep}
              bridgeStatus={bridgeStatus}
              txHash={bridgeTxHash}
              fromNetworkName={SUPPORTED_NETWORKS[route!.fromNetwork].name}
              toNetworkName={SUPPORTED_NETWORKS[route!.toNetwork].name}
              onRetry={handleBridgeProceed}
              onDone={handleBridgeDone}
            />
          ) : (
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

              {/* Amount + Token Selector */}
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
                  <TokenSelector
                    selectedSymbol={selectedToken}
                    onSelect={handleTokenSelect}
                  />
                </div>
              </div>

              {/* Gas */}
              {gasEstimate && isDirect && (
                <div className="flex items-center justify-between px-1 mb-4 text-sm">
                  <span className="text-white/40">Network fee</span>
                  <span className="text-white">{parseFloat(gasEstimate).toFixed(6)} ETH</span>
                </div>
              )}

              {/* Bridge Info Banner */}
              {route?.type === 'bridge' && (
                <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(51, 136, 255, 0.08)', border: '1px solid rgba(51, 136, 255, 0.2)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SUPPORTED_NETWORKS[route.fromNetwork]?.color }} />
                    <span className="text-sm">{SUPPORTED_NETWORKS[route.fromNetwork]?.name}</span>
                    <span style={{ color: 'var(--muted)' }}>&rarr;</span>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SUPPORTED_NETWORKS[route.toNetwork]?.color }} />
                    <span className="text-sm">{SUPPORTED_NETWORKS[route.toNetwork]?.name}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    Your tokens will be bridged first, then sent to the recipient.
                    {route.bridgeQuote && ` Fee: ~$${route.bridgeQuote.totalFeeUsd?.toFixed(2)}. Time: ${route.estimatedTime || '~2 min'}.`}
                  </p>
                </div>
              )}

              {/* Route Loading */}
              {routeLoading && (
                <div className="flex items-center gap-2 px-1 mb-4">
                  <div className="w-3 h-3 border border-white/20 border-t-white rounded-full animate-spin" />
                  <span className="text-xs text-white/40">Finding best route...</span>
                </div>
              )}

              {/* Gas Guard Warning */}
              {gasGuard && !gasGuard.sufficient && (
                <div className="px-4 py-3 rounded-xl mb-4" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <p className="text-sm" style={{ color: '#ef4444' }}>
                    Insufficient {gasGuard.nativeSymbol} for gas on {SUPPORTED_NETWORKS[gasGuard.networkId as NetworkId]?.name || gasGuard.networkId}.
                    {' '}Need ~{parseFloat(gasGuard.estimatedGasCostEth).toFixed(6)} {gasGuard.nativeSymbol}, have {parseFloat(gasGuard.nativeBalance).toFixed(6)}.
                  </p>
                </div>
              )}

              {/* Bridge Banner */}
              {showBridgeBanner && (
                <BridgeBanner
                  route={route}
                  onProceed={handleBridgeProceed}
                  onCancel={handleBridgeCancel}
                  loading={loading}
                />
              )}

              {/* Error */}
              {error && (
                <div className="px-4 py-3 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl mb-4">
                  <p className="text-[#f87171] text-sm">{error}</p>
                </div>
              )}

              {/* Submit (only for direct sends) */}
              {isDirect && (
                <button
                  onClick={handleSend}
                  disabled={!isValid || loading || (gasGuard != null && !gasGuard.sufficient)}
                  className="w-full py-4 rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white text-black shimmer hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                >
                  {loading ? 'Sending...' : `Send ${selectedToken}`}
                </button>
              )}
            </div>
          )}
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
