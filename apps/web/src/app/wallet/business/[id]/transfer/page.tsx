'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ethers } from 'ethers'
import {
  type ContractFactory,
  type EthersLikeContract,
  type TransferPolicy,
  getTokenInfo,
  getShareBalance,
  calculateOwnershipPercent,
  getBusiness,
  type BusinessWallet,
  BUSINESS_TOKEN_ABI,
} from '@e-y/shared'
import { apiClient } from '@/lib/api'
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

const contractFactory: ContractFactory = (address, abi, signerOrProvider) =>
  new ethers.Contract(
    address,
    abi as ethers.InterfaceAbi,
    signerOrProvider as ethers.ContractRunner,
  ) as unknown as EthersLikeContract

function shortenAddress(addr: string): string {
  if (addr.length <= 14) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

interface TransferEvent {
  from: string
  to: string
  value: number
  txHash: string
  blockNumber: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TransferSharesPage() {
  useAuthGuard()
  const router = useRouter()
  const params = useParams()
  const businessId = params.id as string
  const { address, network, currentAccount } = useAccount()

  const [business, setBusiness] = useState<BusinessWallet | null>(null)
  const [balance, setBalance] = useState(0)
  const [totalSupply, setTotalSupply] = useState(0)
  const [tokenSymbol, setTokenSymbol] = useState('')
  const [transferPolicy, setTransferPolicy] = useState<TransferPolicy>('FREE')
  const [transfers, setTransfers] = useState<TransferEvent[]>([])

  // Form
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')

  // State
  const [status, setStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('loading')
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const ownershipPercent = useMemo(
    () => calculateOwnershipPercent(balance, totalSupply),
    [balance, totalSupply],
  )

  const isValidForm = useMemo(() => {
    if (!ethers.isAddress(recipient)) return false
    const parsed = parseInt(amount)
    if (isNaN(parsed) || parsed <= 0 || parsed > balance) return false
    return true
  }, [recipient, amount, balance])

  // Load data
  const loadData = useCallback(async () => {
    try {
      setStatus('loading')
      setError('')

      const biz = await getBusiness(apiClient, businessId)
      setBusiness(biz)

      const provider = new ethers.JsonRpcProvider(network.rpcUrl)

      const [tokenInfo, userBalance] = await Promise.all([
        getTokenInfo(contractFactory, biz.contractAddress, provider),
        address
          ? getShareBalance(contractFactory, biz.contractAddress, provider, address)
          : Promise.resolve(0),
      ])

      setBalance(userBalance)
      setTotalSupply(tokenInfo.totalSupply)
      setTokenSymbol(tokenInfo.symbol)
      setTransferPolicy(tokenInfo.transferPolicy)

      // Load recent transfer events from on-chain
      try {
        const tokenContract = new ethers.Contract(
          biz.contractAddress,
          BUSINESS_TOKEN_ABI as unknown as ethers.InterfaceAbi,
          provider,
        )
        const filter = tokenContract.filters.Transfer()
        const currentBlock = await provider.getBlockNumber()
        const fromBlock = Math.max(0, currentBlock - 10000)
        const events = await tokenContract.queryFilter(filter, fromBlock, currentBlock)

        const parsed: TransferEvent[] = events
          .filter((e): e is ethers.EventLog => 'args' in e)
          .map((e) => ({
            from: e.args[0] as string,
            to: e.args[1] as string,
            value: Number(e.args[2] as bigint),
            txHash: e.transactionHash,
            blockNumber: e.blockNumber,
          }))
          .reverse()

        setTransfers(parsed)
      } catch {
        // Transfer events are optional, don't fail the page
        setTransfers([])
      }

      setStatus('succeeded')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load transfer data'
      setError(msg)
      setStatus('failed')
    }
  }, [businessId, address, network.rpcUrl])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Direct transfer (FREE policy)
  const handleDirectTransfer = async (password: string) => {
    if (!business || !currentAccount) return

    const mnemonic = await loadAndDecrypt(password)
    const wallet = deriveWalletFromMnemonic(mnemonic, currentAccount.accountIndex)
    const provider = new ethers.JsonRpcProvider(network.rpcUrl)
    const signer = wallet.connect(provider)

    const tokenContract = new ethers.Contract(
      business.contractAddress,
      BUSINESS_TOKEN_ABI as unknown as ethers.InterfaceAbi,
      signer,
    )

    const tx = await tokenContract.transfer(recipient, BigInt(amount))
    await (tx as { wait(): Promise<unknown> }).wait()

    setShowConfirm(false)
    setRecipient('')
    setAmount('')
    await loadData()
  }

  // Redirect to proposal creation (APPROVAL_REQUIRED policy)
  const handleCreateProposal = () => {
    const searchParams = new URLSearchParams({
      type: 'TRANSFER_SHARES',
      from: address,
      to: recipient,
      amount: amount,
    })
    router.push(`/wallet/business/${businessId}/proposals/create?${searchParams.toString()}`)
  }

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

          {/* Main Content */}
          {status === 'succeeded' && (
            <div className="space-y-4">
              {/* Balance Card */}
              <div className="glass-card gradient-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-xl font-semibold text-white">Transfer Shares</h1>
                    {business && (
                      <p className="text-xs text-white/40 mt-1">{business.name}</p>
                    )}
                  </div>
                </div>

                {/* Token Info */}
                <div className="bg-white/3 border border-white/8 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/40">Your Balance</span>
                    <span className="text-lg font-bold text-white">
                      {balance} {tokenSymbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/40">Ownership</span>
                    <span className="text-sm text-[#3388FF] font-medium">{ownershipPercent}%</span>
                  </div>
                </div>

                {/* Transfer Policy Notice */}
                {transferPolicy === 'APPROVAL_REQUIRED' && (
                  <div className="bg-[#f59e0b]/8 border border-[#f59e0b]/20 rounded-xl p-3 mb-4">
                    <div className="flex items-start gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <div>
                        <p className="text-xs text-[#f59e0b] font-medium">Approval Required</p>
                        <p className="text-[10px] text-[#f59e0b]/70 mt-0.5">
                          Transfers require governance approval. This will create a TRANSFER_SHARES proposal.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form */}
                <div className="space-y-3">
                  <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                    <label className="text-xs text-white/40 uppercase tracking-wide mb-2 block">
                      Recipient Address
                    </label>
                    <input
                      type="text"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="0x..."
                      className="w-full bg-transparent text-white placeholder:text-white/25 focus:outline-none text-sm font-mono"
                    />
                  </div>

                  <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-white/40 uppercase tracking-wide">Amount</label>
                      <button
                        onClick={() => setAmount(String(balance))}
                        className="text-xs text-white/40 hover:text-white transition-colors"
                      >
                        Max: {balance}
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0"
                        step="1"
                        min="1"
                        max={balance}
                        className="flex-1 bg-transparent text-xl font-bold text-white placeholder:text-white/25 focus:outline-none"
                      />
                      <span className="text-white/40 text-sm flex-shrink-0">{tokenSymbol}</span>
                    </div>
                  </div>

                  {/* Preview */}
                  {isValidForm && (
                    <div className="bg-[#22c55e]/8 border border-[#22c55e]/20 rounded-xl p-3">
                      <p className="text-[#22c55e] text-sm">
                        Transfer {amount} {tokenSymbol} to {shortenAddress(recipient)}
                      </p>
                    </div>
                  )}

                  {/* Submit */}
                  {transferPolicy === 'FREE' ? (
                    <button
                      onClick={() => setShowConfirm(true)}
                      disabled={!isValidForm}
                      className="w-full py-3 rounded-xl bg-white text-black font-semibold shimmer hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Transfer Shares
                    </button>
                  ) : (
                    <button
                      onClick={handleCreateProposal}
                      disabled={!isValidForm}
                      className="w-full py-3 rounded-xl bg-[#3388FF] text-white font-semibold hover:bg-[#3388FF]/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Create Transfer Proposal
                    </button>
                  )}
                </div>
              </div>

              {/* Transfer History */}
              {transfers.length > 0 && (
                <div className="glass-card rounded-2xl p-6">
                  <p className="text-xs text-white/40 uppercase tracking-wide mb-4">Transfer History</p>
                  <div className="space-y-3">
                    {transfers.slice(0, 20).map((tx, i) => {
                      const isSender = tx.from.toLowerCase() === address.toLowerCase()
                      const isReceiver = tx.to.toLowerCase() === address.toLowerCase()
                      const isZeroAddr = tx.from === ethers.ZeroAddress

                      return (
                        <div
                          key={`${tx.txHash}-${i}`}
                          className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                isZeroAddr
                                  ? 'bg-[#3388FF]'
                                  : isSender
                                  ? 'bg-[#EF4444]'
                                  : isReceiver
                                  ? 'bg-[#22c55e]'
                                  : 'bg-white/30'
                              }`}
                            />
                            <div className="min-w-0">
                              <p className="text-xs text-white truncate">
                                {isZeroAddr
                                  ? `Minted to ${shortenAddress(tx.to)}`
                                  : isSender
                                  ? `Sent to ${shortenAddress(tx.to)}`
                                  : isReceiver
                                  ? `Received from ${shortenAddress(tx.from)}`
                                  : `${shortenAddress(tx.from)} -> ${shortenAddress(tx.to)}`}
                              </p>
                              <p className="text-[10px] text-white/25 font-mono">
                                {shortenAddress(tx.txHash)}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-white/60 font-mono flex-shrink-0 ml-3">
                            {tx.value} {tokenSymbol}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Transfer Confirmation Modal */}
      {showConfirm && (
        <ConfirmModal
          title="Transfer Shares"
          summary={`${amount} ${tokenSymbol}`}
          details={[
            { label: 'To', value: shortenAddress(recipient) },
            { label: 'Amount', value: `${amount} ${tokenSymbol}` },
            { label: 'Network', value: network.name },
          ]}
          confirmLabel="Transfer"
          onConfirm={handleDirectTransfer}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  )
}
