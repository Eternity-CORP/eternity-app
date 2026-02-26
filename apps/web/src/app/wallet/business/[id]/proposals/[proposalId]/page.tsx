'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ethers } from 'ethers'
import {
  type ProposalStatus,
  type ProposalType,
  getProposal as getOnChainProposal,
  hasVoted as checkHasVoted,
  vote as castVote,
  executeProposal,
  cancelProposal,
  getShareBalance,
  getQuorumBps,
  indexToProposalStatus,
  indexToProposalType,
  getBusiness,
  isQuorumReached,
  type BusinessWallet,
  type OnChainProposal,
  truncateAddress,
} from '@e-y/shared'
import { apiClient } from '@/lib/api'
import { createContractFactory } from '@/lib/contract-utils'
import { useAccount } from '@/contexts/account-context'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import Navigation from '@/components/Navigation'
import BackButton from '@/components/BackButton'
import ConfirmModal from '@/components/shared/ConfirmModal'
import { loadAndDecrypt } from '@e-y/storage'
import { deriveWalletFromMnemonic } from '@e-y/crypto'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function proposalTypeLabel(t: ProposalType): string {
  const map: Record<ProposalType, string> = {
    WITHDRAW_ETH: 'Withdraw ETH',
    WITHDRAW_TOKEN: 'Withdraw Token',
    TRANSFER_SHARES: 'Transfer Shares',
    CHANGE_SETTINGS: 'Change Settings',
    CUSTOM: 'Custom',
    DISTRIBUTE_DIVIDENDS: 'Distribute Dividends',
  }
  return map[t] ?? t
}

function statusColor(s: ProposalStatus): string {
  switch (s) {
    case 'active':
      return 'bg-[#3388FF]/15 text-[#3388FF]'
    case 'passed':
      return 'bg-[#22c55e]/15 text-[#22c55e]'
    case 'executed':
      return 'bg-white/10 text-white/60'
    case 'rejected':
      return 'bg-[#EF4444]/15 text-[#EF4444]'
    case 'canceled':
      return 'bg-[#f59e0b]/15 text-[#f59e0b]'
    default:
      return 'bg-white/10 text-white/60'
  }
}

function formatCountdown(deadline: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = deadline - now
  if (diff <= 0) return 'Voting ended'
  const days = Math.floor(diff / 86400)
  const hours = Math.floor((diff % 86400) / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  const seconds = diff % 60
  if (days > 0) return `${days}d ${hours}h ${minutes}m remaining`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s remaining`
  return `${minutes}m ${seconds}s remaining`
}

function decodeProposalData(type: ProposalType, data: string): Record<string, string> {
  const coder = ethers.AbiCoder.defaultAbiCoder()
  try {
    switch (type) {
      case 'WITHDRAW_ETH': {
        const [to, amount] = coder.decode(['address', 'uint256'], data)
        return { Recipient: to as string, Amount: `${ethers.formatEther(amount as bigint)} ETH` }
      }
      case 'WITHDRAW_TOKEN': {
        const [token, to, amount] = coder.decode(['address', 'address', 'uint256'], data)
        return {
          Token: token as string,
          Recipient: to as string,
          Amount: ethers.formatUnits(amount as bigint, 18),
        }
      }
      case 'TRANSFER_SHARES': {
        const [from, to, amount] = coder.decode(['address', 'address', 'uint256'], data)
        return {
          From: from as string,
          To: to as string,
          Shares: (amount as bigint).toString(),
        }
      }
      case 'CHANGE_SETTINGS': {
        const [quorum, period] = coder.decode(['uint256', 'uint256'], data)
        return {
          'New Quorum': `${Number(quorum as bigint)} bps (${(Number(quorum as bigint) / 100).toFixed(1)}%)`,
          'New Voting Period': `${Number(period as bigint)}s (${(Number(period as bigint) / 3600).toFixed(1)}h)`,
        }
      }
      case 'CUSTOM': {
        const [title, description] = coder.decode(['string', 'string'], data)
        return { Title: title as string, Description: description as string }
      }
      case 'DISTRIBUTE_DIVIDENDS': {
        const [totalAmount, holders] = coder.decode(['uint256', 'address[]'], data)
        return {
          'Total Amount': `${ethers.formatEther(totalAmount as bigint)} ETH`,
          'Recipients': `${(holders as string[]).length} holders`,
          'Holders': (holders as string[]).map((h: string) => `${h.slice(0, 6)}...${h.slice(-4)}`).join(', '),
        }
      }
      default:
        return {}
    }
  } catch {
    return { 'Raw Data': data.length > 66 ? `${data.slice(0, 66)}...` : data }
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProposalDetailPage() {
  useAuthGuard()
  const router = useRouter()
  const params = useParams()
  const businessId = params.id as string
  const proposalId = parseInt(params.proposalId as string)
  const { address, network, currentAccount, accounts } = useAccount()
  const personalAccounts = accounts.filter((a) => a.type !== 'business')

  const [business, setBusiness] = useState<BusinessWallet | null>(null)
  const [proposal, setProposal] = useState<OnChainProposal | null>(null)
  const [proposalType, setProposalType] = useState<ProposalType>('CUSTOM')
  const [proposalStatus, setProposalStatus] = useState<ProposalStatus>('active')
  const [userBalance, setUserBalance] = useState(0)
  const [userHasVoted, setUserHasVoted] = useState(false)
  const [quorumBps, setQuorumBps] = useState(0)
  const [countdown, setCountdown] = useState('')

  // Per-wallet info for the wallet picker
  const [walletInfos, setWalletInfos] = useState<Record<string, { ethBalance: string; shares: number; voted: boolean }>>({})

  const [status, setStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('loading')
  const [error, setError] = useState('')

  // Action state
  const [showVoteFor, setShowVoteFor] = useState(false)
  const [showVoteAgainst, setShowVoteAgainst] = useState(false)
  const [showExecute, setShowExecute] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [actionStatus, setActionStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle')

  // Countdown timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadData = useCallback(async () => {
    try {
      setStatus('loading')
      setError('')

      const biz = await getBusiness(apiClient, businessId)
      setBusiness(biz)

      const provider = new ethers.JsonRpcProvider(network.rpcUrl)

      const [onChain, qBps] = await Promise.all([
        getOnChainProposal(createContractFactory, biz.treasuryAddress, provider, proposalId),
        getQuorumBps(createContractFactory, biz.treasuryAddress, provider),
      ])

      // Load per-wallet data for all personal accounts
      const infos: Record<string, { ethBalance: string; shares: number; voted: boolean }> = {}
      let maxShares = 0
      let anyVoted = false
      await Promise.all(
        personalAccounts.map(async (acc) => {
          const [ethBal, shares, voted] = await Promise.all([
            provider.getBalance(acc.address),
            getShareBalance(createContractFactory, biz.contractAddress, provider, acc.address),
            checkHasVoted(createContractFactory, biz.treasuryAddress, provider, proposalId, acc.address),
          ])
          infos[acc.id] = {
            ethBalance: ethers.formatEther(ethBal),
            shares,
            voted,
          }
          if (shares > maxShares) maxShares = shares
          if (voted) anyVoted = true
        }),
      )
      setWalletInfos(infos)

      setProposal(onChain)
      setProposalType(indexToProposalType(onChain.proposalType))
      setProposalStatus(indexToProposalStatus(onChain.status))
      setUserBalance(maxShares)
      setUserHasVoted(anyVoted)
      setQuorumBps(qBps)
      setCountdown(formatCountdown(onChain.deadline))
      setStatus('succeeded')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load proposal'
      setError(msg)
      setStatus('failed')
    }
  }, [businessId, proposalId, personalAccounts, network.rpcUrl])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Countdown timer
  useEffect(() => {
    if (!proposal) return
    timerRef.current = setInterval(() => {
      setCountdown(formatCountdown(proposal.deadline))
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [proposal])

  // Find the personal wallet that holds shares (auto-select for signing)
  const holderAccount = personalAccounts.find((a) => {
    const info = walletInfos[a.id]
    return info && info.shares > 0
  })

  // Action handlers
  const handleVote = async (password: string, support: boolean) => {
    if (!business || !holderAccount) return

    setActionStatus('loading')
    const mnemonic = await loadAndDecrypt(password)
    const wallet = deriveWalletFromMnemonic(mnemonic, holderAccount.accountIndex)
    const provider = new ethers.JsonRpcProvider(network.rpcUrl)
    const signer = wallet.connect(provider)

    await castVote(createContractFactory, business.treasuryAddress, signer, proposalId, support)

    setActionStatus('succeeded')
    setShowVoteFor(false)
    setShowVoteAgainst(false)
    await loadData()
  }

  const handleExecute = async (password: string) => {
    if (!business) return
    const signerAccount = holderAccount ?? personalAccounts[0]
    if (!signerAccount) return

    setActionStatus('loading')
    const mnemonic = await loadAndDecrypt(password)
    const wallet = deriveWalletFromMnemonic(mnemonic, signerAccount.accountIndex)
    const provider = new ethers.JsonRpcProvider(network.rpcUrl)
    const signer = wallet.connect(provider)

    await executeProposal(createContractFactory, business.treasuryAddress, signer, proposalId)

    setActionStatus('succeeded')
    setShowExecute(false)
    await loadData()
  }

  const handleCancel = async (password: string) => {
    if (!business) return
    const signerAccount = holderAccount ?? personalAccounts[0]
    if (!signerAccount) return

    setActionStatus('loading')
    const mnemonic = await loadAndDecrypt(password)
    const wallet = deriveWalletFromMnemonic(mnemonic, signerAccount.accountIndex)
    const provider = new ethers.JsonRpcProvider(network.rpcUrl)
    const signer = wallet.connect(provider)

    await cancelProposal(createContractFactory, business.treasuryAddress, signer, proposalId)

    setActionStatus('succeeded')
    setShowCancel(false)
    await loadData()
  }

  // Derived values
  const totalVotes = (proposal?.forVotes ?? 0) + (proposal?.againstVotes ?? 0)
  const forPercent = totalVotes > 0 ? Math.round(((proposal?.forVotes ?? 0) / totalVotes) * 100) : 0
  const againstPercent = totalVotes > 0 ? 100 - forPercent : 0
  const snapshotSupply = proposal?.snapshotSupply ?? 0
  const votedPercent = snapshotSupply > 0 ? Math.round((totalVotes / snapshotSupply) * 100) : 0
  const quorumReached = proposal
    ? isQuorumReached(proposal.forVotes, proposal.snapshotSupply, quorumBps)
    : false
  const quorumPercent = quorumBps / 100

  const isCreator = personalAccounts.some(
    (a) => proposal?.creator.toLowerCase() === a.address.toLowerCase(),
  )
  const holderInfo = holderAccount ? walletInfos[holderAccount.id] : undefined
  const canVote = proposalStatus === 'active' && !!holderAccount && (holderInfo?.shares ?? 0) > 0 && !holderInfo?.voted
  const canExecute = proposalStatus === 'passed'
  const canCancel = proposalStatus === 'active' && isCreator

  const decodedData = proposal ? decodeProposalData(proposalType, proposal.data) : {}

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-12 pb-12">
        <div className="w-full max-w-[420px]">
          <BackButton />

          {/* Loading */}
          {status === 'loading' && (
            <div className="glass-card gradient-border rounded-2xl p-6 flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Error */}
          {status === 'failed' && (
            <div className="glass-card gradient-border rounded-2xl p-6">
              <div className="px-4 py-3 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl">
                <p className="text-[#f87171] text-sm">{error}</p>
                <button
                  onClick={loadData}
                  className="text-xs text-white/40 hover:text-white mt-2 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Proposal Detail */}
          {status === 'succeeded' && proposal && (
            <div className="space-y-4">
              {/* Header Card */}
              <div className="glass-card gradient-border rounded-2xl p-6">
                {/* Type + Status */}
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-lg font-semibold text-white">
                    {proposalTypeLabel(proposalType)}
                  </h1>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColor(proposalStatus)}`}>
                    {proposalStatus}
                  </span>
                </div>

                {/* Proposal ID + Creator */}
                <div className="flex items-center justify-between text-xs text-white/40 mb-4">
                  <span>Proposal #{proposalId}</span>
                  <span className="font-mono">{truncateAddress(proposal.creator)}</span>
                </div>

                {/* Countdown */}
                <div className="bg-white/3 border border-white/8 rounded-xl p-3 mb-4">
                  <p className="text-xs text-white/40 mb-1">Deadline</p>
                  <p className="text-sm text-white font-medium">{countdown}</p>
                </div>

                {/* Decoded Data */}
                {Object.keys(decodedData).length > 0 && (
                  <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-2">
                    <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Details</p>
                    {Object.entries(decodedData).map(([key, value]) => (
                      <div key={key} className="flex items-start justify-between gap-3">
                        <span className="text-xs text-white/40 flex-shrink-0">{key}</span>
                        <span className="text-xs text-white font-mono text-right break-all">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Voting Progress Card */}
              <div className="glass-card rounded-2xl p-6">
                <p className="text-xs text-white/40 uppercase tracking-wide mb-4">Voting Progress</p>

                {/* For / Against */}
                <div className="space-y-3 mb-4">
                  {/* For */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[#22c55e] font-medium">For</span>
                      <span className="text-white/60">{proposal.forVotes} votes ({forPercent}%)</span>
                    </div>
                    <div className="h-3 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#22c55e] rounded-full transition-all"
                        style={{ width: `${forPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Against */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[#EF4444] font-medium">Against</span>
                      <span className="text-white/60">{proposal.againstVotes} votes ({againstPercent}%)</span>
                    </div>
                    <div className="h-3 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#EF4444] rounded-full transition-all"
                        style={{ width: `${againstPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Quorum */}
                <div className="bg-white/3 border border-white/8 rounded-xl p-3">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-white/40">Quorum</span>
                    <span className={quorumReached ? 'text-[#22c55e]' : 'text-white/60'}>
                      {votedPercent}% voted / {quorumPercent}% required
                    </span>
                  </div>
                  <div className="h-2 bg-white/8 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all ${quorumReached ? 'bg-[#22c55e]' : 'bg-[#3388FF]'}`}
                      style={{ width: `${Math.min(votedPercent, 100)}%` }}
                    />
                    {/* Quorum threshold marker */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-white/40"
                      style={{ left: `${Math.min(quorumPercent, 100)}%` }}
                    />
                  </div>
                  <p className={`text-[10px] mt-1 ${quorumReached ? 'text-[#22c55e]' : 'text-white/30'}`}>
                    {quorumReached ? 'Quorum reached' : 'Quorum not yet reached'}
                  </p>
                </div>
              </div>

              {/* Actions Card */}
              <div className="glass-card rounded-2xl p-6 space-y-3">
                {/* User vote weight */}
                {userBalance > 0 && (
                  <div className="flex items-center justify-between text-xs text-white/40 mb-2">
                    <span>Your vote weight</span>
                    <span className="text-white font-medium">{userBalance} shares</span>
                  </div>
                )}

                {userHasVoted && (
                  <div className="bg-[#3388FF]/10 border border-[#3388FF]/20 rounded-xl p-3">
                    <p className="text-xs text-[#3388FF]">You have already voted on this proposal</p>
                  </div>
                )}

                {/* Vote Buttons */}
                {canVote && (
                  <>
                    {holderAccount && (
                      <p className="text-[10px] text-white/30 text-center mb-1">
                        Signing from {holderAccount.label || 'Wallet'} ({holderAccount.address.slice(0, 6)}...{holderAccount.address.slice(-4)})
                      </p>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowVoteFor(true)}
                        className="flex-1 py-3 rounded-xl bg-[#22c55e]/15 text-[#22c55e] font-semibold text-sm border border-[#22c55e]/30 hover:bg-[#22c55e]/25 transition-colors"
                      >
                        Vote For
                      </button>
                      <button
                        onClick={() => setShowVoteAgainst(true)}
                        className="flex-1 py-3 rounded-xl bg-[#EF4444]/15 text-[#EF4444] font-semibold text-sm border border-[#EF4444]/30 hover:bg-[#EF4444]/25 transition-colors"
                      >
                        Vote Against
                      </button>
                    </div>
                  </>
                )}

                {/* Execute Button */}
                {canExecute && (
                  <button
                    onClick={() => setShowExecute(true)}
                    className="w-full py-3 rounded-xl bg-white text-black font-semibold shimmer hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-colors"
                  >
                    Execute Proposal
                  </button>
                )}

                {/* Cancel Button */}
                {canCancel && (
                  <button
                    onClick={() => setShowCancel(true)}
                    className="w-full py-3 rounded-xl text-sm font-medium text-[#f87171] bg-[#f87171]/8 border border-[#f87171]/15 hover:bg-[#f87171]/15 transition-colors"
                  >
                    Cancel Proposal
                  </button>
                )}

                {/* No action available */}
                {!canVote && !canExecute && !canCancel && !userHasVoted && (
                  <p className="text-xs text-white/30 text-center">
                    {userBalance === 0
                      ? 'You need to hold shares to vote'
                      : 'No actions available'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Vote For Confirmation */}
      {showVoteFor && holderAccount && (
        <ConfirmModal
          title="Vote For"
          summary={`Vote FOR with ${holderInfo?.shares ?? 0} shares`}
          details={[
            { label: 'Proposal', value: `#${proposalId} ${proposalTypeLabel(proposalType)}` },
            { label: 'Weight', value: `${holderInfo?.shares ?? 0} shares` },
            { label: 'Signing from', value: `${holderAccount.label || 'Wallet'} (${holderAccount.address.slice(0, 6)}...${holderAccount.address.slice(-4)})` },
            { label: 'Network', value: network.name },
          ]}
          confirmLabel="Vote For"

          onConfirm={(pwd) => handleVote(pwd, true)}
          onCancel={() => setShowVoteFor(false)}
        />
      )}

      {/* Vote Against Confirmation */}
      {showVoteAgainst && holderAccount && (
        <ConfirmModal
          title="Vote Against"
          summary={`Vote AGAINST with ${holderInfo?.shares ?? 0} shares`}
          details={[
            { label: 'Proposal', value: `#${proposalId} ${proposalTypeLabel(proposalType)}` },
            { label: 'Weight', value: `${holderInfo?.shares ?? 0} shares` },
            { label: 'Signing from', value: `${holderAccount.label || 'Wallet'} (${holderAccount.address.slice(0, 6)}...${holderAccount.address.slice(-4)})` },
            { label: 'Network', value: network.name },
          ]}
          confirmLabel="Vote Against"

          onConfirm={(pwd) => handleVote(pwd, false)}
          onCancel={() => setShowVoteAgainst(false)}
        />
      )}

      {/* Execute Confirmation */}
      {showExecute && (
        <ConfirmModal
          title="Execute Proposal"
          summary={`Execute proposal #${proposalId}`}
          details={[
            { label: 'Type', value: proposalTypeLabel(proposalType) },
            { label: 'Network', value: network.name },
          ]}
          confirmLabel="Execute"
          onConfirm={handleExecute}
          onCancel={() => setShowExecute(false)}
        />
      )}

      {/* Cancel Confirmation */}
      {showCancel && (
        <ConfirmModal
          title="Cancel Proposal"
          summary={`Cancel proposal #${proposalId}`}
          details={[
            { label: 'Type', value: proposalTypeLabel(proposalType) },
            { label: 'Network', value: network.name },
          ]}
          confirmLabel="Cancel Proposal"
          onConfirm={handleCancel}
          onCancel={() => setShowCancel(false)}
        />
      )}

    </div>
  )
}
