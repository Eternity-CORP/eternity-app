'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  ChatMessage,
  AiSuggestion,
  TransactionPreview,
  BlikPreview,
  ChunkPayload,
  DonePayload,
  ToolCall,
  ToolResult,
  AiErrorPayload,
} from '@e-y/shared'
import { useAccount } from '@/contexts/account-context'
import { aiSocket } from '@/services/ai-service'

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
  error: string | null
  rateLimit: RateLimit | null
  isConnected: boolean
  isStreaming: boolean
  connect: () => void
  disconnect: () => void
  sendMessage: (content: string) => void
  dismissSuggestion: (id: string) => void
  clearChat: () => void
  clearPendingTransaction: () => void
  clearPendingBlik: () => void
}

export function useAiChat(): UseAiChatReturn {
  const { address, isLoggedIn } = useAccount()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([])
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [streamingContent, setStreamingContent] = useState('')
  const [pendingTransaction, setPendingTransaction] = useState<TransactionPreview | null>(null)
  const [pendingBlik, setPendingBlik] = useState<BlikPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rateLimit, setRateLimit] = useState<RateLimit | null>(null)

  const streamingRef = useRef('')

  const isConnected = status === 'connected' || status === 'sending' || status === 'streaming'
  const isStreaming = status === 'streaming' || status === 'sending'

  const connect = useCallback(() => {
    if (!address) return

    setStatus('connecting')
    aiSocket.connect(address)
  }, [address])

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
    setStatus('sending')

    aiSocket.sendMessage(content.trim())
  }, [])

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
    aiSocket.clearHistory()
  }, [])

  const clearPendingTransaction = useCallback(() => {
    setPendingTransaction(null)
  }, [])

  const clearPendingBlik = useCallback(() => {
    setPendingBlik(null)
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
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: payload.content || streamingRef.current,
        timestamp: new Date().toISOString(),
        toolCalls: payload.toolCalls,
        toolResults: payload.toolResults,
      }

      setMessages((prev) => [...prev, assistantMessage])
      setStreamingContent('')
      streamingRef.current = ''
      setStatus('connected')

      if (payload.pendingTransaction) {
        setPendingTransaction(payload.pendingTransaction)
      }
      if (payload.pendingBlik) {
        setPendingBlik(payload.pendingBlik)
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
    error,
    rateLimit,
    isConnected,
    isStreaming,
    connect,
    disconnect,
    sendMessage,
    dismissSuggestion,
    clearChat,
    clearPendingTransaction,
    clearPendingBlik,
  }
}
