'use client'

import type { ReactNode } from 'react'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { ethers } from 'ethers'
import { loadAndDecrypt } from '@e-y/storage'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { useAccount } from '@/contexts/account-context'
import { useBalance } from '@/contexts/balance-context'
import { useAiChat } from '@/hooks/useAiChat'
import { aiSocket } from '@/services/ai-service'
import { sendNativeToken, sendErc20Token, signTransaction } from '@/lib/send-service'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'
import SuggestionChips from './SuggestionChips'
import InputBar from './InputBar'
import BlikCard from './cards/BlikCard'
import ContactSaveCard from './cards/ContactSaveCard'
import ConfirmModal from '../shared/ConfirmModal'
import type { ConfirmDetail } from '../shared/ConfirmModal'
import { loadContacts, saveContact } from '@/lib/contacts-service'
import { createSplitBill, registerUsername, createScheduledPayment } from '@e-y/shared'
import type { TransactionPreview, SwapPreview } from '@e-y/shared'
import { apiClient } from '@/lib/api'

interface PendingContactSave {
  address: string
  username?: string
}

type ConfirmTarget =
  | { type: 'send'; transaction: TransactionPreview }
  | { type: 'blik'; blik: Parameters<typeof BlikCard>[0]['blik'] }
  | { type: 'swap'; swap: SwapPreview }
  | { type: 'username' }
  | { type: 'scheduled' }
  | { type: 'split' }

export default function ChatContainer() {
  const { address, network, currentAccount } = useAccount()
  const { aggregatedBalances } = useBalance()
  const {
    messages,
    status,
    streamingContent,
    pendingTransaction,
    pendingBlik,
    pendingSwap,
    pendingUsername,
    pendingScheduled,
    pendingSplit,
    error,
    lastFailedMessage,
    isConnected,
    isStreaming,
    sendMessage,
    retryLastMessage,
    clearPendingTransaction,
    clearPendingBlik,
    clearPendingSwap,
    clearPendingUsername,
    clearPendingScheduled,
    clearPendingSplit,
    addLocalMessage,
  } = useAiChat()

  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null)
  const [pendingContactSave, setPendingContactSave] = useState<PendingContactSave | null>(null)
  const [hasTransitioned, setHasTransitioned] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages or streaming
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent, pendingBlik, pendingContactSave])

  // Auto-open modal when pending data arrives
  useEffect(() => {
    if (pendingTransaction) setConfirmTarget({ type: 'send', transaction: pendingTransaction })
  }, [pendingTransaction])

  useEffect(() => {
    if (pendingScheduled) setConfirmTarget({ type: 'scheduled' })
  }, [pendingScheduled])

  useEffect(() => {
    if (pendingSplit) setConfirmTarget({ type: 'split' })
  }, [pendingSplit])

  useEffect(() => {
    if (pendingSwap) setConfirmTarget({ type: 'swap', swap: pendingSwap })
  }, [pendingSwap])

  useEffect(() => {
    if (pendingUsername) setConfirmTarget({ type: 'username' })
  }, [pendingUsername])

  useEffect(() => {
    if (pendingBlik && pendingBlik.type === 'pay') setConfirmTarget({ type: 'blik', blik: pendingBlik })
  }, [pendingBlik])

  const handleBlikConfirm = useCallback((blik: Parameters<typeof BlikCard>[0]['blik']) => {
    setConfirmTarget({ type: 'blik', blik })
  }, [])

  const handleCancelBlik = useCallback(() => {
    clearPendingBlik()
  }, [clearPendingBlik])

  const handleConfirmModalSubmit = useCallback(async (password: string, editedValues?: Record<string, string>) => {
    if (!confirmTarget || !currentAccount) return

    // Verify password for all actions
    const mnemonic = await loadAndDecrypt(password)

    if (confirmTarget.type === 'split') {
      if (!pendingSplit || !address) return
      const totalAmount = editedValues?.totalAmount || pendingSplit.totalAmount
      const description = editedValues?.description ?? pendingSplit.description
      await createSplitBill(apiClient, {
        creatorAddress: address,
        totalAmount,
        tokenSymbol: pendingSplit.token,
        description,
        participants: pendingSplit.participants,
      })
      clearPendingSplit()
      setConfirmTarget(null)
      addLocalMessage('Split bill created successfully! View your splits on the Split page.')
      return
    }
    const wallet = deriveWalletFromMnemonic(mnemonic, currentAccount.accountIndex)
    const provider = new ethers.JsonRpcProvider(network.rpcUrl)
    const connectedWallet = wallet.connect(provider)

    if (confirmTarget.type === 'send') {
      const txn = confirmTarget.transaction
      const toAddress = editedValues?.to || txn.to
      const amount = editedValues?.amount || txn.amount
      const token = txn.token.toUpperCase()
      const isNative = token === 'ETH' || token === network.symbol

      let txHash: string
      if (isNative) {
        txHash = await sendNativeToken(connectedWallet, provider, toAddress, amount)
      } else {
        const tokenData = aggregatedBalances.find(
          (t) => t.symbol.toUpperCase() === token,
        )
        const primaryNet = tokenData?.networks?.[0]

        if (primaryNet && primaryNet.contractAddress !== 'native') {
          txHash = await sendErc20Token(
            connectedWallet,
            provider,
            toAddress,
            amount,
            primaryNet.contractAddress,
            tokenData?.decimals || 18,
          )
        } else {
          txHash = await sendNativeToken(connectedWallet, provider, toAddress, amount)
        }
      }

      clearPendingTransaction()
      setConfirmTarget(null)
      addLocalMessage(`Transaction sent! Hash: ${txHash}`)

      const existingContacts = loadContacts(address)
      const alreadySaved = existingContacts.some(
        (c) => c.address.toLowerCase() === toAddress.toLowerCase(),
      )
      if (!alreadySaved) {
        setPendingContactSave({
          address: toAddress,
          username: txn.toUsername,
        })
      }
    } else if (confirmTarget.type === 'blik' && confirmTarget.blik.type === 'pay') {
      const blik = confirmTarget.blik
      const tx = await connectedWallet.sendTransaction({
        to: blik.receiverAddress,
        value: ethers.parseEther(blik.amount),
      })

      await tx.wait()

      clearPendingBlik()
      setConfirmTarget(null)
      addLocalMessage(`BLIK payment sent! Hash: ${tx.hash}`)
    } else if (confirmTarget.type === 'swap') {
      clearPendingSwap()
      setConfirmTarget(null)
      addLocalMessage('Swap execution is not yet available via AI chat. Please use the Swap page.')
    } else if (confirmTarget.type === 'username' && pendingUsername) {
      const signature = await wallet.signMessage(pendingUsername.messageToSign || '')

      await registerUsername(apiClient, {
        username: pendingUsername.username,
        address: pendingUsername.address,
        signature,
        timestamp: pendingUsername.timestamp || Date.now(),
      })

      clearPendingUsername()
      setConfirmTarget(null)
      addLocalMessage(`Username @${pendingUsername.username} registered successfully!`)
    } else if (confirmTarget.type === 'scheduled' && pendingScheduled) {
      const recipient = editedValues?.to || pendingScheduled.recipient
      const amount = editedValues?.amount || pendingScheduled.amount
      const signedData = await signTransaction(connectedWallet, provider, recipient, amount)

      await createScheduledPayment(apiClient, {
        creatorAddress: address,
        recipient,
        recipientUsername: pendingScheduled.recipientUsername,
        amount,
        tokenSymbol: pendingScheduled.token,
        scheduledAt: pendingScheduled.scheduledAt,
        recurringInterval: pendingScheduled.recurring === 'once' ? undefined : pendingScheduled.recurring,
        description: pendingScheduled.description,
        signedTransaction: signedData.signedTx,
        estimatedGasPrice: signedData.gasPrice,
        nonce: signedData.nonce,
        chainId: signedData.chainId,
      })

      clearPendingScheduled()
      setConfirmTarget(null)
      addLocalMessage('Scheduled payment created and pre-signed for automatic execution!')
    }
  }, [confirmTarget, currentAccount, network, address, aggregatedBalances, pendingUsername, pendingScheduled, pendingSplit, clearPendingTransaction, clearPendingBlik, clearPendingSwap, clearPendingUsername, clearPendingScheduled, clearPendingSplit, addLocalMessage])

  const handleConfirmCancel = useCallback(() => {
    const typeLabel = confirmTarget?.type || 'operation'
    if (confirmTarget?.type === 'send') clearPendingTransaction()
    else if (confirmTarget?.type === 'scheduled') clearPendingScheduled()
    else if (confirmTarget?.type === 'split') clearPendingSplit()
    else if (confirmTarget?.type === 'swap') clearPendingSwap()
    else if (confirmTarget?.type === 'username') clearPendingUsername()
    else if (confirmTarget?.type === 'blik') clearPendingBlik()
    setConfirmTarget(null)
    aiSocket.addSystemMessage(`The user CANCELLED the pending ${typeLabel} confirmation. Do NOT re-prepare it unless they explicitly request a new operation with full parameters.`)
  }, [confirmTarget, clearPendingTransaction, clearPendingScheduled, clearPendingSplit, clearPendingSwap, clearPendingUsername, clearPendingBlik])

  const hasMessages = messages.length > 0
  const showEmptyState = !hasMessages && !isStreaming

  // Reset empty state overlay when chat is cleared
  useEffect(() => {
    if (showEmptyState) {
      setHasTransitioned(false)
    }
  }, [showEmptyState])

  // Build confirm modal props (memoized to avoid unnecessary re-renders)
  const confirmModalProps = useMemo((): { title: string; summary: string; details: ConfirmDetail[]; extraContent?: ReactNode; requiresPassword?: boolean; confirmLabel?: string } | null => {
    if (!confirmTarget) return null

    if (confirmTarget.type === 'send') {
      const txn = confirmTarget.transaction
      return {
        title: 'Confirm Send',
        summary: `${txn.amount} ${txn.token}`,
        details: [
          { key: 'to', label: 'To', value: txn.toUsername || txn.to, editable: true },
          { key: 'amount', label: 'Amount', value: txn.amount, editable: true, type: 'number' as const },
          { label: 'Network', value: txn.network || network.name },
          ...(txn.estimatedGas
            ? [{ label: 'Gas fee', value: `${txn.estimatedGas} ETH` }]
            : []),
        ],
        requiresPassword: true,
        confirmLabel: 'Send',
      }
    }

    if (confirmTarget.type === 'blik') {
      return {
        title: 'Confirm BLIK Payment',
        summary: `${confirmTarget.blik.amount} ${confirmTarget.blik.token}`,
        details: [
          ...(confirmTarget.blik.type === 'pay'
            ? [
                { label: 'BLIK Code', value: confirmTarget.blik.code },
                { label: 'Receiver', value: confirmTarget.blik.receiverUsername || `${confirmTarget.blik.receiverAddress.slice(0, 6)}...${confirmTarget.blik.receiverAddress.slice(-4)}` },
              ]
            : []),
        ],
        requiresPassword: true,
        confirmLabel: 'Pay',
      }
    }

    if (confirmTarget.type === 'swap') {
      return {
        title: 'Confirm Swap',
        summary: `${confirmTarget.swap.fromToken.amount} ${confirmTarget.swap.fromToken.symbol} → ${confirmTarget.swap.toToken.amount} ${confirmTarget.swap.toToken.symbol}`,
        details: [
          { label: 'Rate', value: confirmTarget.swap.rate },
          { label: 'Price Impact', value: confirmTarget.swap.priceImpact },
          { label: 'Gas fee', value: `${confirmTarget.swap.estimatedGas} ETH` },
          { label: 'Slippage', value: confirmTarget.swap.slippage },
          { label: 'Network', value: confirmTarget.swap.network },
        ],
        requiresPassword: true,
        confirmLabel: 'Swap',
      }
    }

    if (confirmTarget.type === 'username' && pendingUsername) {
      return {
        title: 'Register Username',
        summary: `@${pendingUsername.username}`,
        details: [
          { label: 'Username', value: `@${pendingUsername.username}` },
          { label: 'Wallet', value: `${pendingUsername.address.slice(0, 6)}...${pendingUsername.address.slice(-4)}` },
        ],
        requiresPassword: true,
        confirmLabel: 'Register',
      }
    }

    if (confirmTarget.type === 'scheduled' && pendingScheduled) {
      return {
        title: 'Confirm Scheduled Payment',
        summary: `${pendingScheduled.amount} ${pendingScheduled.token}`,
        details: [
          { key: 'to', label: 'Recipient', value: pendingScheduled.recipientUsername || pendingScheduled.recipient, editable: true },
          { key: 'amount', label: 'Amount', value: pendingScheduled.amount, editable: true, type: 'number' as const },
          { label: 'When', value: new Date(pendingScheduled.scheduledAt).toLocaleString() },
          ...(pendingScheduled.recurring && pendingScheduled.recurring !== 'once'
            ? [{ label: 'Recurring', value: pendingScheduled.recurring }]
            : []),
          { label: 'Network', value: network.name },
        ],
        requiresPassword: true,
        confirmLabel: 'Schedule',
      }
    }

    if (confirmTarget.type === 'split' && pendingSplit) {
      const participantsContent = (
        <div className="border-t border-[var(--border-light)] pt-2 mb-4">
          <span className="text-[10px] uppercase tracking-wider text-[var(--foreground-subtle)] block mb-1.5">Participants</span>
          <div className="space-y-1 max-h-[100px] overflow-y-auto">
            {pendingSplit.participants.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-xs gap-2">
                <span className="text-[var(--foreground-muted)] truncate max-w-[140px] flex-shrink-0">
                  {p.username ? `@${p.username}` : p.name || `${p.address.slice(0, 6)}...${p.address.slice(-4)}`}
                </span>
                <span className="text-[var(--foreground-muted)] font-mono flex-shrink-0">{p.amount} {pendingSplit.token}</span>
              </div>
            ))}
          </div>
        </div>
      )

      return {
        title: 'Create Split Bill',
        summary: `${pendingSplit.totalAmount} ${pendingSplit.token}`,
        details: [
          { key: 'totalAmount', label: 'Total', value: pendingSplit.totalAmount, editable: true, type: 'number' as const },
          { label: 'Per person', value: `${pendingSplit.perPerson} ${pendingSplit.token}` },
          { key: 'description', label: 'Description', value: pendingSplit.description || '', editable: true },
          ...(pendingSplit.splitType ? [{ label: 'Mode', value: pendingSplit.splitType === 'split_with_me' ? 'Split with me' : 'Collect' }] : []),
        ],
        extraContent: participantsContent,
        requiresPassword: true,
        confirmLabel: 'Create Split',
      }
    }

    return null
  }, [confirmTarget, network, pendingUsername, pendingScheduled, pendingSplit])

  return (
    <div className="flex flex-col h-full relative">
      {/* Active chat layout */}
      <div
        className={`flex-1 flex flex-col min-h-0 transition-opacity duration-500 ease-out ${
          showEmptyState ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {/* BLIK generate card — stays in chat with countdown */}
          {pendingBlik && pendingBlik.type === 'generate' && (
            <BlikCard
              blik={pendingBlik}
              onConfirmPay={handleBlikConfirm}
              onCancel={handleCancelBlik}
            />
          )}

          {/* Contact Save suggestion after successful send */}
          {pendingContactSave && (
            <ContactSaveCard
              recipientAddress={pendingContactSave.address}
              recipientUsername={pendingContactSave.username}
              onSave={(name) => {
                saveContact(address, {
                  name,
                  address: pendingContactSave.address,
                  username: pendingContactSave.username,
                }).catch((err) => {
                  console.error('Failed to save contact:', err)
                })
                setPendingContactSave(null)
              }}
              onSkip={() => setPendingContactSave(null)}
            />
          )}

          {/* Typing/streaming indicator */}
          {isStreaming && (
            <TypingIndicator streamingContent={streamingContent || undefined} />
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex-shrink-0 px-4 py-2">
            <div className="px-4 py-2 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl flex items-center gap-2">
              <p className="text-xs text-[#EF4444] flex-1">{error}</p>
              {lastFailedMessage && (
                <button
                  onClick={retryLastMessage}
                  className="text-xs font-semibold text-[#EF4444] hover:text-[#F87171] px-2 py-0.5 rounded-md bg-[#EF4444]/10 border border-[#EF4444]/20 hover:bg-[#EF4444]/20 transition-colors whitespace-nowrap cursor-pointer"
                >
                  &#x21bb; Retry
                </button>
              )}
            </div>
          </div>
        )}

        {/* Connection warning */}
        {!isConnected && status !== 'idle' && status !== 'connecting' && (
          <div className="flex-shrink-0 px-4 py-2">
            <div className="px-4 py-2 bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl">
              <p className="text-xs text-[#F59E0B]">Connection lost. Reconnecting...</p>
            </div>
          </div>
        )}

        {/* Suggestion Chips */}
        <div className="flex-shrink-0 px-4 py-2">
          <SuggestionChips
            onSelect={sendMessage}
            hasMessages={hasMessages}
          />
        </div>

        {/* Input Bar */}
        <div className="flex-shrink-0 px-4 pb-4">
          <InputBar
            onSend={sendMessage}
            disabled={isStreaming}
          />
        </div>
      </div>

      {/* Empty state overlay */}
      {!hasTransitioned && (
        <div
          className={`absolute inset-0 z-10 flex flex-col items-center justify-center px-6 transition-all duration-500 ease-out ${
            showEmptyState
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-6 pointer-events-none'
          }`}
          onTransitionEnd={(e) => {
            if (e.propertyName === 'opacity' && !showEmptyState) {
              setHasTransitioned(true)
            }
          }}
        >
          {/* Greeting */}
          <div className="text-center mb-8 select-none">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              <span className="text-[var(--foreground-muted)]">Welcome to </span>
              <span className="text-gradient-accent">Eternity</span>
            </h1>
          </div>

          {/* Centered Input */}
          <div className="w-full max-w-[640px] mb-4">
            <InputBar
              onSend={sendMessage}
              disabled={isStreaming}
            />
          </div>

          {/* Centered Suggestion Chips */}
          <div className="w-full max-w-[640px]">
            <SuggestionChips
              onSelect={sendMessage}
              hasMessages={false}
              centered
            />
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmTarget && confirmModalProps && (
        <ConfirmModal
          title={confirmModalProps.title}
          summary={confirmModalProps.summary}
          details={confirmModalProps.details}
          extraContent={confirmModalProps.extraContent}
          requiresPassword={confirmModalProps.requiresPassword}
          confirmLabel={confirmModalProps.confirmLabel}
          onConfirm={handleConfirmModalSubmit}
          onCancel={handleConfirmCancel}
        />
      )}
    </div>
  )
}
