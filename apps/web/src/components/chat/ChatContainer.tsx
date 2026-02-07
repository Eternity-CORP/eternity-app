'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ethers } from 'ethers'
import { loadAndDecrypt } from '@e-y/storage'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { useAccount } from '@/contexts/account-context'
import { useAiChat } from '@/hooks/useAiChat'
import { saveTransaction } from '@/lib/supabase'
import MessageBubble, { type ChatMessage as BubbleChatMessage } from './MessageBubble'
import TypingIndicator from './TypingIndicator'
import SuggestionChips from './SuggestionChips'
import InputBar from './InputBar'
import SendPreviewCard from './cards/SendPreviewCard'
import BlikCard from './cards/BlikCard'
import SwapCard from './cards/SwapCard'
import ConfirmModal from './cards/ConfirmModal'

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

type ConfirmTarget =
  | { type: 'send'; transaction: SendCardTransaction }
  | { type: 'blik'; blik: Parameters<typeof BlikCard>[0]['blik'] }
  | { type: 'swap'; swap: Parameters<typeof SwapCard>[0]['swap'] }

export default function ChatContainer() {
  const { address, network, currentAccount } = useAccount()
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

  const [balance, setBalance] = useState('0')
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)

  // Fetch balance
  useEffect(() => {
    if (!address) return

    let cancelled = false

    const fetchBalance = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(network.rpcUrl)
        const bal = await provider.getBalance(address)
        if (!cancelled) {
          setBalance(ethers.formatEther(bal))
        }
      } catch (err) {
        console.error('Failed to fetch balance:', err)
      } finally {
        if (!cancelled) {
          setBalanceLoading(false)
        }
      }
    }

    setBalanceLoading(true)
    fetchBalance()

    return () => { cancelled = true }
  }, [address, network.rpcUrl])

  // Auto-scroll to bottom on new messages or streaming
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent, pendingTransaction, pendingBlik, pendingSwap])

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
      const tx = await connectedWallet.sendTransaction({
        to: confirmTarget.transaction.to,
        value: ethers.parseEther(confirmTarget.transaction.amount),
      })

      await tx.wait()

      await saveTransaction({
        hash: tx.hash,
        from_address: address.toLowerCase(),
        to_address: confirmTarget.transaction.to.toLowerCase(),
        amount: confirmTarget.transaction.amount,
        token_symbol: network.symbol,
        status: 'confirmed',
        direction: 'sent',
      })

      clearPendingTransaction()
      setConfirmTarget(null)
      sendMessage(`Transaction sent! Hash: ${tx.hash}`)
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
      const swap = confirmTarget.swap

      // For swaps, we send the fromToken amount as a native transaction
      // In production this would call a DEX router contract
      const tx = await connectedWallet.sendTransaction({
        to: address, // Self-send placeholder for swap execution
        value: ethers.parseEther(swap.fromToken.amount),
      })

      await tx.wait()

      clearPendingSwap()
      setConfirmTarget(null)
      sendMessage(`Swap executed! Swapped ${swap.fromToken.amount} ${swap.fromToken.symbol} → ${swap.toToken.amount} ${swap.toToken.symbol}. Hash: ${tx.hash}`)
    }
  }, [confirmTarget, currentAccount, network, address, clearPendingTransaction, clearPendingBlik, clearPendingSwap, sendMessage])

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

  const formattedBalance = parseFloat(balance).toFixed(4)
  const networkColor = currentAccount?.type === 'real' ? '#22C55E' : '#F59E0B'
  const hasMessages = messages.length > 0

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
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Balance Panel */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className="glass-card rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {balanceLoading ? (
              <div className="h-6 w-24 bg-white/5 rounded-lg animate-pulse" />
            ) : (
              <span className="text-lg font-bold text-white">
                {formattedBalance} <span className="text-sm font-medium text-white/40">{network.symbol}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: networkColor }}
            />
            <span className="text-xs text-white/40">
              {network.name}{currentAccount?.type === 'test' ? ' Testnet' : ''}
            </span>
          </div>
        </div>
      </div>

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
