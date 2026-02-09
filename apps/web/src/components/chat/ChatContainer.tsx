'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ethers } from 'ethers'
import { loadAndDecrypt } from '@e-y/storage'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { useAccount } from '@/contexts/account-context'
import { useBalance } from '@/contexts/balance-context'
import { useAiChat } from '@/hooks/useAiChat'
import { sendNativeToken, sendErc20Token } from '@/lib/send-service'
import MessageBubble, { type ChatMessage as BubbleChatMessage } from './MessageBubble'
import TypingIndicator from './TypingIndicator'
import SuggestionChips from './SuggestionChips'
import InputBar from './InputBar'
import SendPreviewCard from './cards/SendPreviewCard'
import BlikCard from './cards/BlikCard'
import SwapCard from './cards/SwapCard'
import ContactSaveCard from './cards/ContactSaveCard'
import ConfirmModal from './cards/ConfirmModal'
import { loadContacts, saveContact } from '@/lib/contacts-service'

interface SendCardTransaction {
  id: string
  from: string
  to: string
  toUsername?: string
  amount: string
  token: string
  amountUsd?: string
  estimatedGas?: string
  estimatedGasUsd?: string
  network?: string
}

interface PendingContactSave {
  address: string
  username?: string
}

type ConfirmTarget =
  | { type: 'send'; transaction: SendCardTransaction }
  | { type: 'blik'; blik: Parameters<typeof BlikCard>[0]['blik'] }
  | { type: 'swap'; swap: Parameters<typeof SwapCard>[0]['swap'] }

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
    error,
    isConnected,
    isStreaming,
    sendMessage,
    clearPendingTransaction,
    clearPendingBlik,
    clearPendingSwap,
  } = useAiChat()

  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null)
  const [pendingContactSave, setPendingContactSave] = useState<PendingContactSave | null>(null)
  const [hasTransitioned, setHasTransitioned] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages or streaming
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent, pendingTransaction, pendingBlik, pendingSwap, pendingContactSave])

  const handleSendConfirm = useCallback((updated: SendCardTransaction) => {
    setConfirmTarget({ type: 'send', transaction: updated })
  }, [])

  const handleBlikConfirm = useCallback((blik: Parameters<typeof BlikCard>[0]['blik']) => {
    setConfirmTarget({ type: 'blik', blik })
  }, [])

  const handleConfirmModalSubmit = useCallback(async (password: string) => {
    if (!confirmTarget || !currentAccount) return

    const mnemonic = await loadAndDecrypt(password)
    const wallet = deriveWalletFromMnemonic(mnemonic, currentAccount.accountIndex)
    const provider = new ethers.JsonRpcProvider(network.rpcUrl)
    const connectedWallet = wallet.connect(provider)

    if (confirmTarget.type === 'send') {
      const txn = confirmTarget.transaction
      const token = txn.token.toUpperCase()
      const isNative = token === 'ETH' || token === network.symbol

      let txHash: string
      if (isNative) {
        txHash = await sendNativeToken(connectedWallet, provider, txn.to, txn.amount)
      } else {
        // Find token contract from aggregated balances
        const tokenData = aggregatedBalances.find(
          (t) => t.symbol.toUpperCase() === token,
        )
        const primaryNet = tokenData?.networks?.[0]

        if (primaryNet && primaryNet.contractAddress !== 'native') {
          txHash = await sendErc20Token(
            connectedWallet,
            provider,
            txn.to,
            txn.amount,
            primaryNet.contractAddress,
            tokenData?.decimals || 18,
          )
        } else {
          // Fallback to native send
          txHash = await sendNativeToken(connectedWallet, provider, txn.to, txn.amount)
        }
      }

      clearPendingTransaction()
      setConfirmTarget(null)
      sendMessage(`Transaction sent! Hash: ${txHash}`)

      // Offer to save recipient as contact if not already saved
      const existingContacts = loadContacts(address)
      const alreadySaved = existingContacts.some(
        (c) => c.address.toLowerCase() === txn.to.toLowerCase(),
      )
      if (!alreadySaved) {
        setPendingContactSave({
          address: txn.to,
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
      sendMessage(`BLIK payment sent! Hash: ${tx.hash}`)
    } else if (confirmTarget.type === 'swap') {
      clearPendingSwap()
      setConfirmTarget(null)
      sendMessage('Swap execution is not yet available via AI chat. Please use the Swap page.')
    }
  }, [confirmTarget, currentAccount, network, address, aggregatedBalances, clearPendingTransaction, clearPendingBlik, clearPendingSwap, sendMessage])

  const handleConfirmCancel = useCallback(() => {
    setConfirmTarget(null)
  }, [])

  const handleCancelTransaction = useCallback(() => {
    clearPendingTransaction()
  }, [clearPendingTransaction])

  const handleCancelBlik = useCallback(() => {
    clearPendingBlik()
  }, [clearPendingBlik])

  const handleSwapConfirm = useCallback((swap: Parameters<typeof SwapCard>[0]['swap']) => {
    setConfirmTarget({ type: 'swap', swap })
  }, [])

  const handleCancelSwap = useCallback(() => {
    clearPendingSwap()
  }, [clearPendingSwap])

  const hasMessages = messages.length > 0
  const showEmptyState = !hasMessages && !isStreaming

  // Reset empty state overlay when chat is cleared
  useEffect(() => {
    if (showEmptyState) {
      setHasTransitioned(false)
    }
  }, [showEmptyState])

  // Build confirm modal props
  const confirmModalProps = confirmTarget
    ? confirmTarget.type === 'send'
      ? {
          title: 'Confirm Send',
          summary: `${confirmTarget.transaction.amount} ${confirmTarget.transaction.token}`,
          details: [
            { label: 'To', value: confirmTarget.transaction.toUsername || `${confirmTarget.transaction.to.slice(0, 6)}...${confirmTarget.transaction.to.slice(-4)}` },
            { label: 'Network', value: confirmTarget.transaction.network || network.name },
            ...(confirmTarget.transaction.estimatedGas
              ? [{ label: 'Gas fee', value: `${confirmTarget.transaction.estimatedGas} ETH` }]
              : []),
          ],
        }
      : confirmTarget.type === 'blik'
        ? {
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
          }
        : {
            title: 'Confirm Swap',
            summary: `${confirmTarget.swap.fromToken.amount} ${confirmTarget.swap.fromToken.symbol} → ${confirmTarget.swap.toToken.amount} ${confirmTarget.swap.toToken.symbol}`,
            details: [
              { label: 'Rate', value: confirmTarget.swap.rate },
              { label: 'Price Impact', value: confirmTarget.swap.priceImpact },
              { label: 'Gas fee', value: `${confirmTarget.swap.estimatedGas} ETH` },
              { label: 'Slippage', value: confirmTarget.swap.slippage },
              { label: 'Network', value: confirmTarget.swap.network },
            ],
          }
    : null

  return (
    <div className="flex flex-col h-full relative">
      {/* Active chat layout — always in DOM, hidden during empty state */}
      <div
        className={`flex-1 flex flex-col min-h-0 transition-opacity duration-500 ease-out ${
          showEmptyState ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
          {messages.map((msg) => {
            const bubbleMsg: BubbleChatMessage = {
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.timestamp).getTime(),
              toolCalls: msg.toolCalls,
            }
            return <MessageBubble key={msg.id} message={bubbleMsg} />
          })}

          {/* Pending Transaction Card */}
          {pendingTransaction && (
            <SendPreviewCard
              transaction={pendingTransaction}
              onConfirm={handleSendConfirm}
              onCancel={handleCancelTransaction}
            />
          )}

          {/* Pending Blik Card */}
          {pendingBlik && (
            <BlikCard
              blik={pendingBlik}
              onConfirmPay={handleBlikConfirm}
              onCancel={handleCancelBlik}
            />
          )}

          {/* Pending Swap Card */}
          {pendingSwap && (
            <SwapCard
              swap={pendingSwap}
              onConfirm={handleSwapConfirm}
              onCancel={handleCancelSwap}
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
            <div className="px-4 py-2 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl">
              <p className="text-xs text-[#EF4444]">{error}</p>
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

      {/* Empty state overlay — Gemini-style centered welcome */}
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
              <span className="text-white/60">Welcome to </span>
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
          onConfirm={handleConfirmModalSubmit}
          onCancel={handleConfirmCancel}
        />
      )}
    </div>
  )
}
