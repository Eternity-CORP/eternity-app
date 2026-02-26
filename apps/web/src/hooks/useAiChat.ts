'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  ChatMessage,
  AiSuggestion,
  TransactionPreview,
  BlikPreview,
  SwapPreview,
  UsernamePreview,
  ScheduledPaymentPreview,
  SplitPreview,
  ChunkPayload,
  DonePayload,
  ToolCall,
  ToolResult,
  AiErrorPayload,
} from '@e-y/shared'
import { contactsToAiFormat } from '@e-y/shared'
import { useAccount } from '@/contexts/account-context'
import { aiSocket } from '@/services/ai-service'
import { loadContacts } from '@/lib/contacts-service'

type ChatStatus = 'idle' | 'connecting' | 'connected' | 'sending' | 'streaming' | 'error'

interface RateLimit {
  remaining: number
  resetIn: number
  limit: number
}

interface UseAiChatReturn {
  messages: ChatMessage[]
  suggestions: AiSuggestion[]
  status: ChatStatus
  streamingContent: string
  pendingTransaction: TransactionPreview | null
  pendingBlik: BlikPreview | null
  pendingSwap: SwapPreview | null
  pendingUsername: UsernamePreview | null
  pendingScheduled: ScheduledPaymentPreview | null
  pendingSplit: SplitPreview | null
  error: string | null
  rateLimit: RateLimit | null
  lastFailedMessage: string | null
  isConnected: boolean
  isStreaming: boolean
  connect: () => void
  disconnect: () => void
  sendMessage: (content: string) => void
  retryLastMessage: () => void
  dismissSuggestion: (id: string) => void
  clearChat: () => void
  clearPendingTransaction: () => void
  clearPendingBlik: () => void
  clearPendingSwap: () => void
  clearPendingUsername: () => void
  clearPendingScheduled: () => void
  clearPendingSplit: () => void
  addLocalMessage: (content: string, role?: 'user' | 'assistant') => void
}

export function useAiChat(): UseAiChatReturn {
  const { address, isLoggedIn, currentAccount } = useAccount()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([])
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [streamingContent, setStreamingContent] = useState('')
  const [pendingTransaction, setPendingTransaction] = useState<TransactionPreview | null>(null)
  const [pendingBlik, setPendingBlik] = useState<BlikPreview | null>(null)
  const [pendingSwap, setPendingSwap] = useState<SwapPreview | null>(null)
  const [pendingUsername, setPendingUsername] = useState<UsernamePreview | null>(null)
  const [pendingScheduled, setPendingScheduled] = useState<ScheduledPaymentPreview | null>(null)
  const [pendingSplit, setPendingSplit] = useState<SplitPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rateLimit, setRateLimit] = useState<RateLimit | null>(null)
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null)

  const streamingRef = useRef('')

  const isConnected = status === 'connected' || status === 'sending' || status === 'streaming'
  const isStreaming = status === 'streaming' || status === 'sending'

  const connect = useCallback(() => {
    if (!address) return

    setStatus('connecting')
    const contacts = loadContacts(address)
    const aiContacts = contacts.length > 0 ? contactsToAiFormat(contacts) : undefined
    aiSocket.connect(address, aiContacts, currentAccount?.type)
  }, [address, currentAccount?.type])

  const disconnect = useCallback(() => {
    aiSocket.disconnect()
    setStatus('idle')
  }, [])

  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setStreamingContent('')
    streamingRef.current = ''
    setError(null)
    setLastFailedMessage(null)
    setStatus('sending')

    aiSocket.sendMessage(content.trim())
  }, [])

  const retryLastMessage = useCallback(() => {
    if (!lastFailedMessage) return
    const content = lastFailedMessage

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setStreamingContent('')
    streamingRef.current = ''
    setError(null)
    setLastFailedMessage(null)
    setStatus('sending')

    aiSocket.sendMessage(content)
  }, [lastFailedMessage])

  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const clearChat = useCallback(() => {
    setMessages([])
    setSuggestions([])
    setStreamingContent('')
    streamingRef.current = ''
    setError(null)
    setPendingTransaction(null)
    setPendingBlik(null)
    setPendingSwap(null)
    setPendingUsername(null)
    setPendingScheduled(null)
    setPendingSplit(null)
    aiSocket.clearHistory()
  }, [])

  const clearPendingTransaction = useCallback(() => {
    setPendingTransaction(null)
  }, [])

  const clearPendingBlik = useCallback(() => {
    setPendingBlik(null)
  }, [])

  const clearPendingSwap = useCallback(() => {
    setPendingSwap(null)
  }, [])

  const clearPendingUsername = useCallback(() => {
    setPendingUsername(null)
  }, [])

  const clearPendingScheduled = useCallback(() => {
    setPendingScheduled(null)
  }, [])

  const clearPendingSplit = useCallback(() => {
    setPendingSplit(null)
  }, [])

  const addLocalMessage = useCallback((content: string, role: 'user' | 'assistant' = 'assistant') => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, msg])
  }, [])

  useEffect(() => {
    aiSocket.on('onConnect', () => {
      setStatus('connected')
      setError(null)
    })

    aiSocket.on('onDisconnect', (reason: string) => {
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        setStatus('idle')
      } else {
        setStatus('error')
        setError(`Disconnected: ${reason}`)
      }
    })

    aiSocket.on('onChunk', (payload: ChunkPayload) => {
      setStatus('streaming')
      streamingRef.current += payload.content
      setStreamingContent(streamingRef.current)
    })

    aiSocket.on('onDone', (payload: DonePayload) => {
      const aiResponseMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: payload.content || streamingRef.current,
        timestamp: new Date().toISOString(),
        toolCalls: payload.toolCalls,
        toolResults: payload.toolResults,
      }

      setMessages((prev) => [...prev, aiResponseMessage])
      setStreamingContent('')
      streamingRef.current = ''
      setStatus('connected')

      if (payload.pendingTransaction) {
        setPendingTransaction(payload.pendingTransaction)
      }
      if (payload.pendingBlik) {
        setPendingBlik(payload.pendingBlik)
      }
      if (payload.pendingSwap) {
        setPendingSwap(payload.pendingSwap)
      }
      if (payload.pendingUsername) {
        setPendingUsername(payload.pendingUsername)
      }
      if (payload.pendingScheduled) {
        setPendingScheduled(payload.pendingScheduled)
      }
      if (payload.pendingSplit) {
        setPendingSplit(payload.pendingSplit)
      }
    })

    aiSocket.on('onToolCall', (_toolCall: ToolCall) => {
      setStatus('streaming')
    })

    aiSocket.on('onToolResult', (_toolResult: ToolResult) => {
      // Tool results are included in the done payload
    })

    aiSocket.on('onSuggestion', (suggestion: AiSuggestion) => {
      setSuggestions((prev) => {
        const exists = prev.some((s) => s.id === suggestion.id)
        if (exists) return prev
        return [...prev, suggestion]
      })
    })

    aiSocket.on('onError', (payload: AiErrorPayload) => {
      // Capture the last user message for retry before setting error
      setMessages((prev) => {
        const lastUser = [...prev].reverse().find((m) => m.role === 'user')
        if (lastUser) {
          setLastFailedMessage(lastUser.content)
        }
        return prev
      })

      setError(payload.message)
      setStatus('connected')

      if (payload.code === 'RATE_LIMITED') {
        const match = payload.message.match(/(\d+)\s*seconds?/)
        if (match) {
          setRateLimit({
            remaining: 0,
            resetIn: parseInt(match[1], 10),
            limit: 0,
          })
        }
      }
    })

    return () => {
      aiSocket.off('onConnect')
      aiSocket.off('onDisconnect')
      aiSocket.off('onChunk')
      aiSocket.off('onDone')
      aiSocket.off('onToolCall')
      aiSocket.off('onToolResult')
      aiSocket.off('onSuggestion')
      aiSocket.off('onError')
    }
  }, [])

  useEffect(() => {
    if (address && isLoggedIn && status === 'idle') {
      connect()
    }
  }, [address, isLoggedIn, status, connect])

  useEffect(() => {
    return () => {
      aiSocket.disconnect()
    }
  }, [])

  return {
    messages,
    suggestions,
    status,
    streamingContent,
    pendingTransaction,
    pendingBlik,
    pendingSwap,
    pendingUsername,
    pendingScheduled,
    pendingSplit,
    error,
    rateLimit,
    lastFailedMessage,
    isConnected,
    isStreaming,
    connect,
    disconnect,
    sendMessage,
    retryLastMessage,
    dismissSuggestion,
    clearChat,
    clearPendingTransaction,
    clearPendingBlik,
    clearPendingSwap,
    clearPendingUsername,
    clearPendingScheduled,
    clearPendingSplit,
    addLocalMessage,
  }
}
