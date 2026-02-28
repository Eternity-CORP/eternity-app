'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { ethers } from 'ethers'
import { loadAndDecrypt } from '@e-y/storage'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { useAccount } from '@/contexts/account-context'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import {
  getSplitsByCreator,
  getPendingSplits,
  createSplitBill,
  cancelSplit,
  markSplitPaid,
  calculateEqualSplit,
  calculateCustomSplitFromPercentages,
  validateCustomAmounts,
  lookupUsername,
  formatErrorMessage,
  SUPPORTED_NETWORKS,
  TIER1_NETWORK_IDS,
  CHAIN_ID_TO_NETWORK,
  resolveChainId,
  getNetworkLabel,
  type NetworkId,
  type SplitBill,
} from '@e-y/shared'
import { apiClient } from '@/lib/api'
import { sendNativeToken } from '@/lib/send-service'
import { getProvider } from '@/lib/multi-network'
import Navigation from '@/components/Navigation'
import BackButton from '@/components/BackButton'
import ConfirmModal from '@/components/shared/ConfirmModal'

export default function SplitPage() {
  useAuthGuard()
  const { address, network, currentAccount } = useAccount()
  const isTestAccount = currentAccount?.type === 'test'

  const [selectedNetwork, setSelectedNetwork] = useState<NetworkId>('base')
  const [splits, setSplits] = useState<SplitBill[]>([])
  const [pendingSplitsList, setPendingSplitsList] = useState<SplitBill[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [totalAmount, setTotalAmount] = useState('')
  const [description, setDescription] = useState('')
  const [participantAddresses, setParticipantAddresses] = useState('')
  const [splitType, setSplitType] = useState<'split_with_me' | 'collect'>('split_with_me')
  const [recipientAddress, setRecipientAddress] = useState('')
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal')
  const [customAmounts, setCustomAmounts] = useState<string[]>([])
  const [usePercentages, setUsePercentages] = useState(false)
  const [expandedSplitId, setExpandedSplitId] = useState<string | null>(null)
  const [pendingPayment, setPendingPayment] = useState<{ splitId: string; to: string; amount: string; description: string; chainId?: number } | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('loading')
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle')
  const [error, setError] = useState('')

  // Parse participant entries from textarea
  const parsedEntries = useMemo(() => {
    return participantAddresses
      .split(/[,\n]/)
      .map(a => a.trim())
      .filter(a => a.length > 0)
  }, [participantAddresses])

  // Sync customAmounts array length with participants
  useEffect(() => {
    setCustomAmounts(prev => {
      if (prev.length === parsedEntries.length) return prev
      const next = [...prev]
      while (next.length < parsedEntries.length) next.push('')
      return next.slice(0, parsedEntries.length)
    })
  }, [parsedEntries.length])

  // Custom mode validation
  const customValidation = useMemo(() => {
    if (splitMode !== 'custom' || parsedEntries.length === 0) return null
    if (usePercentages) {
      const pcts = customAmounts.map(a => parseFloat(a || '0'))
      const sum = pcts.reduce((acc, v) => acc + v, 0)
      if (sum > 100.0001) return { valid: false, sum: sum.toFixed(1), error: `Percentages sum to ${sum.toFixed(1)}% (max 100%)` }
      if (sum <= 0) return { valid: false, sum: '0', error: 'Enter percentages for participants' }
      return { valid: true, sum: sum.toFixed(1) }
    }
    // For custom amounts mode: validate amounts and check against total if provided
    const result = validateCustomAmounts(totalAmount || null, customAmounts)
    // Additional check: if no totalAmount, ensure each amount is reasonable (max 1000 ETH per participant)
    if (result.valid && !totalAmount) {
      const parsed = customAmounts.map(a => parseFloat(a || '0'))
      if (parsed.some(a => a > 1000)) {
        return { valid: false, sum: result.sum, error: 'Individual amount exceeds 1000 — set a total amount for large splits' }
      }
    }
    return result
  }, [splitMode, parsedEntries.length, customAmounts, usePercentages, totalAmount])

  // Load splits from API when address is available
  useEffect(() => {
    if (!address) return

    let cancelled = false

    async function load() {
      try {
        const [created, pending] = await Promise.all([
          getSplitsByCreator(apiClient, address),
          getPendingSplits(apiClient, address),
        ])
        if (!cancelled) {
          setSplits(created)
          setPendingSplitsList(pending)
        }
      } catch (err) {
        console.error('Failed to load split bills:', err)
      } finally {
        if (!cancelled) setStatus('succeeded')
      }
    }

    load()
    return () => { cancelled = true }
  }, [address])

  const handleCreate = async () => {
    if (!participantAddresses) return
    if (splitMode === 'equal' && !totalAmount) return

    const entries = parsedEntries
    if (entries.length === 0) return

    setSubmitStatus('loading')
    setError('')

    try {
      // Resolve @usernames to addresses
      const resolvedAddresses: string[] = []
      for (const entry of entries) {
        if (entry.startsWith('@')) {
          const result = await lookupUsername(apiClient, entry)
          if (!result?.address) {
            throw new Error(`Username ${entry} not found`)
          }
          resolvedAddresses.push(result.address)
        } else {
          resolvedAddresses.push(entry)
        }
      }

      let participantAmounts: string[]
      let finalTotal: string

      if (splitMode === 'equal') {
        const divisor = splitType === 'split_with_me' ? resolvedAddresses.length + 1 : resolvedAddresses.length
        const perPerson = calculateEqualSplit(totalAmount, divisor)
        participantAmounts = resolvedAddresses.map(() => perPerson)
        finalTotal = totalAmount
      } else if (usePercentages) {
        if (!totalAmount) {
          throw new Error('Total amount is required when using percentages')
        }
        const pcts = customAmounts.map(a => parseFloat(a || '0'))
        participantAmounts = calculateCustomSplitFromPercentages(totalAmount, pcts)
        finalTotal = totalAmount
      } else {
        // Custom amounts
        participantAmounts = customAmounts.map(a => a || '0')
        finalTotal = totalAmount || participantAmounts.reduce((acc, a) => acc + parseFloat(a || '0'), 0).toFixed(6)
      }

      const chainId = resolveChainId(isTestAccount, selectedNetwork)

      const newSplit = await createSplitBill(apiClient, {
        creatorAddress: address,
        recipientAddress: recipientAddress || undefined,
        totalAmount: finalTotal,
        tokenSymbol: network.symbol,
        description: description || 'Split bill',
        chainId,
        participants: resolvedAddresses.map((addr, i) => ({
          address: addr,
          amount: participantAmounts[i],
        })),
      })

      setSplits((prev) => [...prev, newSplit])

      setShowCreate(false)
      setTotalAmount('')
      setDescription('')
      setRecipientAddress('')
      setParticipantAddresses('')
      setCustomAmounts([])
      setUsePercentages(false)
      setSplitMode('equal')
      setSplitType('split_with_me')
      setSubmitStatus('succeeded')
    } catch (err) {
      setError(formatErrorMessage(err, 'Failed to create split'))
      setSubmitStatus('failed')
    }
  }

  const handleCancel = async (id: string) => {
    try {
      await cancelSplit(apiClient, id, address)
      setSplits((prev) =>
        prev.map(s => (s.id === id ? { ...s, status: 'cancelled' as const } : s)),
      )
    } catch (err) {
      console.error('Failed to cancel split bill:', err)
    }
  }

  const handlePayConfirm = useCallback(async (password: string) => {
    if (!pendingPayment || !currentAccount) return

    const mnemonic = await loadAndDecrypt(password)
    const wallet = deriveWalletFromMnemonic(mnemonic, currentAccount.accountIndex)

    // Use the correct provider for the split's network, falling back to account network
    let provider: ethers.JsonRpcProvider
    if (!isTestAccount && pendingPayment.chainId) {
      const networkId = CHAIN_ID_TO_NETWORK[pendingPayment.chainId]
      if (networkId) {
        provider = getProvider(networkId)
      } else {
        provider = new ethers.JsonRpcProvider(network.rpcUrl)
      }
    } else {
      provider = new ethers.JsonRpcProvider(network.rpcUrl)
    }

    const txHash = await sendNativeToken(wallet, provider, pendingPayment.to, String(pendingPayment.amount))

    // Mark participant as paid on backend
    await markSplitPaid(apiClient, pendingPayment.splitId, address, txHash)

    // Update local state — move from pending to paid
    setPendingSplitsList((prev) =>
      prev.map(s => {
        if (s.id !== pendingPayment.splitId) return s
        return {
          ...s,
          participants: s.participants.map(p =>
            p.address.toLowerCase() === address.toLowerCase()
              ? { ...p, status: 'paid' as const, paidTxHash: txHash }
              : p
          ),
        }
      })
    )

    setPendingPayment(null)
  }, [pendingPayment, currentAccount, network, address, isTestAccount])

  const canSubmit = splitMode === 'equal'
    ? !!totalAmount && parsedEntries.length > 0
    : parsedEntries.length > 0 && (customValidation?.valid ?? false)

  const createdSplits = splits.filter(s => s.creatorAddress.toLowerCase() === address.toLowerCase() && (s.status === 'active' || s.status === 'completed'))
  const pendingSplitsFiltered = pendingSplitsList.filter(s =>
    s.status === 'active' &&
    s.participants.some(p => p.address.toLowerCase() === address.toLowerCase() && p.status === 'pending')
  )
  const paidSplitsFiltered = pendingSplitsList.filter(s =>
    s.participants.some(p => p.address.toLowerCase() === address.toLowerCase() && p.status === 'paid')
  )

  // Modal payment network label
  const paymentNetworkLabel = pendingPayment?.chainId
    ? (CHAIN_ID_TO_NETWORK[pendingPayment.chainId]
        ? SUPPORTED_NETWORKS[CHAIN_ID_TO_NETWORK[pendingPayment.chainId]].name
        : network.name)
    : network.name

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-12 pb-12">
        <div className="w-full max-w-[420px]">
          <BackButton />
          <div className="glass-card gradient-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-xl font-semibold text-[var(--foreground)]">Split Bill</h1>
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="w-8 h-8 rounded-lg glass-card flex items-center justify-center text-[var(--foreground)] hover:border-[var(--border)] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            </div>

            {/* Create Form */}
            {showCreate && (
              <div className="mb-6 space-y-3">
                {/* Network Selector (real accounts only) */}
                {!isTestAccount && (
                  <div className="mb-4">
                    <label className="text-[10px] text-[var(--foreground-subtle)] uppercase tracking-wider mb-1.5 block">Network</label>
                    <div className="flex flex-wrap gap-1.5">
                      {TIER1_NETWORK_IDS.map((id) => {
                        const net = SUPPORTED_NETWORKS[id]
                        const isSelected = id === selectedNetwork
                        return (
                          <button
                            key={id}
                            onClick={() => setSelectedNetwork(id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all border"
                            style={{
                              backgroundColor: isSelected ? net.color + '20' : 'transparent',
                              borderColor: isSelected ? net.color + '60' : 'var(--border)',
                              color: isSelected ? net.color : 'var(--foreground-subtle)',
                            }}
                          >
                            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: net.color }} />
                            {net.shortName}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                  <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-2 block">
                    Total Amount {splitMode === 'custom' && !usePercentages ? '(recommended)' : ''}
                  </label>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <input
                      type="number"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      placeholder="0"
                      step="0.0001"
                      className="flex-1 min-w-0 bg-transparent text-xl font-bold text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none"
                    />
                    <span className="flex-shrink-0 text-[var(--foreground-subtle)]">{network.symbol}</span>
                  </div>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                  <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-2 block">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Dinner, tickets, etc."
                    className="w-full bg-transparent text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none"
                  />
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                  <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-2 block">Recipient Address</label>
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder="Your address (default)"
                    className="w-full bg-transparent text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none text-sm font-mono break-all"
                  />
                  <p className="text-[10px] text-[var(--foreground-subtle)] mt-1">Leave empty to receive payments at your wallet</p>
                </div>
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                  <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-2 block">Participants</label>
                  <textarea
                    value={participantAddresses}
                    onChange={(e) => setParticipantAddresses(e.target.value)}
                    placeholder="Addresses or @usernames (one per line)"
                    rows={3}
                    className="w-full bg-transparent text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none resize-none"
                  />
                </div>

                {/* Split Type Toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSplitType('split_with_me')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                      splitType === 'split_with_me'
                        ? 'bg-[#3388FF]/20 text-[#3388FF] border border-[#3388FF]/30'
                        : 'glass-card text-[var(--foreground-subtle)]'
                    }`}
                  >
                    Split with me
                  </button>
                  <button
                    onClick={() => setSplitType('collect')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                      splitType === 'collect'
                        ? 'bg-[#3388FF]/20 text-[#3388FF] border border-[#3388FF]/30'
                        : 'glass-card text-[var(--foreground-subtle)]'
                    }`}
                  >
                    Collect from others
                  </button>
                </div>

                {/* Equal / Custom Toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSplitMode('equal')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      splitMode === 'equal'
                        ? 'bg-[var(--foreground)] text-[var(--background)]'
                        : 'glass-card text-[var(--foreground-subtle)]'
                    }`}
                  >
                    Equal Split
                  </button>
                  <button
                    onClick={() => setSplitMode('custom')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      splitMode === 'custom'
                        ? 'bg-[var(--foreground)] text-[var(--background)]'
                        : 'glass-card text-[var(--foreground-subtle)]'
                    }`}
                  >
                    Custom
                  </button>
                </div>

                {/* Custom Mode: Amount vs % toggle + per-participant inputs */}
                {splitMode === 'custom' && parsedEntries.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setUsePercentages(false)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          !usePercentages
                            ? 'bg-[#3388FF]/20 text-[#3388FF] border border-[#3388FF]/30'
                            : 'glass-card text-[var(--foreground-subtle)]'
                        }`}
                      >
                        Amount
                      </button>
                      <button
                        onClick={() => {
                          if (!totalAmount) {
                            setError('Set total amount first to use percentages')
                            return
                          }
                          setUsePercentages(true)
                          setError('')
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          usePercentages
                            ? 'bg-[#3388FF]/20 text-[#3388FF] border border-[#3388FF]/30'
                            : 'glass-card text-[var(--foreground-subtle)]'
                        }`}
                      >
                        %
                      </button>
                    </div>
                    {parsedEntries.map((entry, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-[var(--foreground-muted)] truncate max-w-[80px] flex-shrink-0" title={entry}>
                          {entry.startsWith('@') ? entry : `${entry.slice(0, 6)}...${entry.slice(-4)}`}
                        </span>
                        <input
                          type="number"
                          value={customAmounts[i] || ''}
                          onChange={(e) => {
                            const next = [...customAmounts]
                            next[i] = e.target.value
                            setCustomAmounts(next)
                          }}
                          placeholder={usePercentages ? '0' : '0.00'}
                          step={usePercentages ? '1' : '0.0001'}
                          className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--border)]"
                        />
                        <span className="text-xs text-[var(--foreground-subtle)] flex-shrink-0 w-8">
                          {usePercentages ? '%' : network.symbol}
                        </span>
                      </div>
                    ))}
                    {/* Running sum display */}
                    {customValidation && (
                      <div className={`rounded-xl p-3 ${
                        customValidation.valid
                          ? 'bg-[#22c55e]/8 border border-[#22c55e]/20'
                          : 'bg-[#EF4444]/8 border border-[#EF4444]/20'
                      }`}>
                        <p className={`text-sm break-words ${customValidation.valid ? 'text-[#22c55e]' : 'text-[#f87171]'}`}>
                          {usePercentages
                            ? `Total: ${customValidation.sum}%${customValidation.error ? ` — ${customValidation.error}` : ''}`
                            : `Sum: ${customValidation.sum} ${network.symbol}${customValidation.error ? ` — ${customValidation.error}` : ''}`
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Equal mode preview */}
                {splitMode === 'equal' && totalAmount && parsedEntries.length > 0 && (
                  <div className="bg-[#22c55e]/8 border border-[#22c55e]/20 rounded-xl p-3">
                    <p className="text-[#22c55e] text-sm">
                      {splitType === 'split_with_me'
                        ? `You + ${parsedEntries.length} people. Each pays: ${calculateEqualSplit(totalAmount, parsedEntries.length + 1).slice(0, -2)} ${network.symbol}`
                        : `${parsedEntries.length} people. Each pays: ${calculateEqualSplit(totalAmount, parsedEntries.length).slice(0, -2)} ${network.symbol}`
                      }
                    </p>
                  </div>
                )}

                {error && (
                  <div className="px-4 py-3 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl">
                    <p className="text-[#f87171] text-sm">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleCreate}
                  disabled={!canSubmit || submitStatus === 'loading'}
                  className="w-full py-3 rounded-xl bg-[var(--foreground)] text-[var(--background)] font-semibold shimmer hover:opacity-90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-colors disabled:opacity-40"
                >
                  {submitStatus === 'loading' ? 'Creating...' : 'Create Split'}
                </button>
              </div>
            )}

            {/* Loading state */}
            {status === 'loading' && (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--foreground)] rounded-full animate-spin" />
              </div>
            )}

            {/* Pending Payments (you owe) */}
            {status !== 'loading' && pendingSplitsFiltered.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide">You Owe</p>
                <div className="space-y-3 mt-5">
                  {pendingSplitsFiltered.map((split) => {
                    const myPart = split.participants.find(
                      p => p.address.toLowerCase() === address.toLowerCase()
                    )
                    const networkLabel = getNetworkLabel(split.chainId)
                    return (
                      <div
                        key={split.id}
                        className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[var(--foreground)] font-medium">{myPart?.amount} {network.symbol}</p>
                          <div className="flex items-center gap-2">
                            {networkLabel && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--foreground-subtle)] font-mono">
                                {networkLabel}
                              </span>
                            )}
                            <span className="text-xs px-2 py-1 rounded-full bg-[#f59e0b]/10 text-[#f59e0b]">
                              pending
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-[var(--foreground-muted)]">{split.description}</p>
                        <button
                          onClick={() => setPendingPayment({
                            splitId: split.id,
                            to: split.recipientAddress || split.creatorAddress,
                            amount: myPart?.amount || '0',
                            description: split.description || 'Split bill',
                            chainId: split.chainId,
                          })}
                          className="w-full mt-3 py-2 rounded-lg bg-[var(--foreground)] text-[var(--background)] text-sm font-semibold shimmer hover:opacity-90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-colors"
                        >
                          Pay Now
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Paid by you */}
            {status !== 'loading' && paidSplitsFiltered.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide">Paid</p>
                <div className="space-y-3 mt-5">
                  {paidSplitsFiltered.map((split) => {
                    const myPart = split.participants.find(
                      p => p.address.toLowerCase() === address.toLowerCase()
                    )
                    const networkLabel = getNetworkLabel(split.chainId)
                    return (
                      <div
                        key={split.id}
                        className="bg-[#22c55e]/5 border border-[#22c55e]/15 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[var(--foreground)] font-medium">{myPart?.amount} {network.symbol}</p>
                          <div className="flex items-center gap-2">
                            {networkLabel && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--foreground-subtle)] font-mono">
                                {networkLabel}
                              </span>
                            )}
                            <span className="text-xs px-2 py-1 rounded-full bg-[#22c55e]/15 text-[#22c55e]">
                              paid
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-[var(--foreground-muted)]">{split.description}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Created Splits */}
            {status !== 'loading' && createdSplits.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide">Your Splits</p>
                <div className="space-y-3 mt-5">
                  {createdSplits.map((split) => {
                    const paidCount = split.participants.filter(p => p.status === 'paid').length
                    const allPaid = paidCount === split.participants.length
                    const hasPaid = paidCount > 0
                    const isExpanded = expandedSplitId === split.id
                    const networkLabel = getNetworkLabel(split.chainId)
                    return (
                      <div
                        key={split.id}
                        className={`rounded-xl overflow-hidden ${allPaid ? 'bg-[#22c55e]/5 border border-[#22c55e]/15' : 'bg-[var(--surface)] border border-[var(--border)]'}`}
                      >
                        {/* Clickable header */}
                        <button
                          onClick={() => setExpandedSplitId(isExpanded ? null : split.id)}
                          className="w-full p-4 text-left"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[var(--foreground)] font-medium">{split.totalAmount} {network.symbol}</p>
                            <div className="flex items-center gap-2">
                              {networkLabel && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--foreground-subtle)] font-mono">
                                  {networkLabel}
                                </span>
                              )}
                              <span className={`text-xs px-2 py-0.5 rounded-full ${allPaid ? 'bg-[#22c55e]/15 text-[#22c55e]' : 'bg-[#3388FF]/10 text-[#3388FF]'}`}>
                                {allPaid ? 'completed' : `${paidCount}/${split.participants.length} paid`}
                              </span>
                              <svg
                                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                className={`text-[var(--foreground-subtle)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              >
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </div>
                          </div>
                          <p className="text-sm text-[var(--foreground-muted)] mb-2">{split.description}</p>
                          {allPaid ? (
                            <div className="flex items-center gap-1.5">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span className="text-xs text-[#22c55e]">All participants paid</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-[var(--surface-hover)] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#22c55e] transition-all"
                                  style={{ width: `${(paidCount / split.participants.length) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </button>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="px-4 pb-5 border-t border-[var(--border-light)]">
                            <p className="text-[10px] text-[var(--foreground-subtle)] uppercase tracking-wide mt-4 mb-4">Participants</p>
                            <div className="space-y-3">
                              {split.participants.map((p, i) => (
                                <div key={i} className="flex items-center justify-between py-3 px-3 rounded-lg bg-[var(--surface)]">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${p.status === 'paid' ? 'bg-[#22c55e]' : 'bg-[#f59e0b]'}`} />
                                    <span className="text-xs text-[var(--foreground-muted)] truncate">
                                      {p.username ? `@${p.username}` : p.name || `${p.address.slice(0, 6)}...${p.address.slice(-4)}`}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="text-xs text-[var(--foreground-muted)] font-mono">{p.amount} {network.symbol}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                                      p.status === 'paid'
                                        ? 'bg-[#22c55e]/10 text-[#22c55e]'
                                        : 'bg-[#f59e0b]/10 text-[#f59e0b]'
                                    }`}>
                                      {p.status === 'paid' ? 'paid' : 'pending'}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Cancel button */}
                            {!hasPaid ? (
                              <button
                                onClick={() => handleCancel(split.id)}
                                className="w-full mt-4 py-2.5 rounded-lg text-sm font-medium text-[#f87171] bg-[#f87171]/8 border border-[#f87171]/15 hover:bg-[#f87171]/15 transition-colors"
                              >
                                Cancel Split
                              </button>
                            ) : (
                              <p className="text-[10px] text-[var(--foreground-subtle)] text-center mt-4">Cannot cancel — participants already paid</p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {status !== 'loading' && splits.length === 0 && pendingSplitsList.length === 0 && !showCreate && (
              <div className="text-center py-8">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-[var(--foreground-subtle)] mb-4">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <p className="text-[var(--foreground-subtle)]">No split bills</p>
                <p className="text-xs text-[var(--foreground-subtle)] mt-1">Tap + to split a bill</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Pay confirmation modal */}
      {pendingPayment && (
        <ConfirmModal
          title="Pay Split Bill"
          summary={`${pendingPayment.amount} ${network.symbol}`}
          details={[
            { label: 'To', value: `${pendingPayment.to.slice(0, 6)}...${pendingPayment.to.slice(-4)}` },
            { label: 'Memo', value: pendingPayment.description },
            { label: 'Network', value: paymentNetworkLabel },
          ]}
          onConfirm={handlePayConfirm}
          onCancel={() => setPendingPayment(null)}
        />
      )}
    </div>
  )
}
