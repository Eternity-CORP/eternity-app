import { io, type Socket } from 'socket.io-client'
import type {
  ChunkPayload,
  DonePayload,
  ToolCall,
  ToolResult,
  AiSuggestion,
  AiErrorPayload,
  ChatMessage,
} from '@e-y/shared'
import { AI_EVENTS } from '@e-y/shared'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
const MAX_HISTORY_LENGTH = 10

interface AiSocketCallbacks {
  onChunk: (payload: ChunkPayload) => void
  onDone: (payload: DonePayload) => void
  onToolCall: (toolCall: ToolCall) => void
  onToolResult: (toolResult: ToolResult) => void
  onSuggestion: (suggestion: AiSuggestion) => void
  onError: (payload: AiErrorPayload) => void
  onConnect: () => void
  onDisconnect: (reason: string) => void
}

type CallbackKey = keyof AiSocketCallbacks

class AiSocketService {
  private socket: Socket | null = null
  private callbacks: Partial<AiSocketCallbacks> = {}
  private messageHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  private userAddress = ''

  connect(address: string): void {
    if (this.socket?.connected && this.userAddress === address) return

    this.disconnect()
    this.userAddress = address

    this.socket = io(`${API_BASE_URL}/ai`, {
      transports: ['websocket'],
      autoConnect: true,
    })

    this.socket.on('connect', () => {
      this.socket?.emit(AI_EVENTS.SUBSCRIBE, { address: this.userAddress })
      this.callbacks.onConnect?.()
    })

    this.socket.on('disconnect', (reason: string) => {
      this.callbacks.onDisconnect?.(reason)
    })

    this.socket.on(AI_EVENTS.CHUNK, (payload: ChunkPayload) => {
      this.callbacks.onChunk?.(payload)
    })

    this.socket.on(AI_EVENTS.DONE, (payload: DonePayload) => {
      if (payload.content) {
        this.addToHistory('assistant', payload.content)
      }
      this.callbacks.onDone?.(payload)
    })

    this.socket.on(AI_EVENTS.TOOL_CALL, (toolCall: ToolCall) => {
      this.callbacks.onToolCall?.(toolCall)
    })

    this.socket.on(AI_EVENTS.TOOL_RESULT, (toolResult: ToolResult) => {
      this.callbacks.onToolResult?.(toolResult)
    })

    this.socket.on(AI_EVENTS.SUGGESTION, (suggestion: AiSuggestion) => {
      this.callbacks.onSuggestion?.(suggestion)
    })

    this.socket.on(AI_EVENTS.ERROR, (payload: AiErrorPayload) => {
      this.callbacks.onError?.(payload)
    })
  }

  disconnect(): void {
    if (!this.socket) return

    if (this.socket.connected && this.userAddress) {
      this.socket.emit(AI_EVENTS.UNSUBSCRIBE, { address: this.userAddress })
    }

    this.socket.removeAllListeners()
    this.socket.disconnect()
    this.socket = null
  }

  sendMessage(content: string): void {
    if (!this.socket?.connected) return

    this.addToHistory('user', content)

    this.socket.emit(AI_EVENTS.CHAT, {
      content,
      userAddress: this.userAddress,
      messageHistory: [...this.messageHistory],
    })
  }

  addAssistantMessage(content: string): void {
    this.addToHistory('assistant', content)
  }

  clearHistory(): void {
    this.messageHistory = []
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  on<K extends CallbackKey>(event: K, callback: AiSocketCallbacks[K]): void {
    this.callbacks[event] = callback
  }

  off(event: CallbackKey): void {
    delete this.callbacks[event]
  }

  private addToHistory(role: 'user' | 'assistant', content: string): void {
    this.messageHistory.push({ role, content })
    if (this.messageHistory.length > MAX_HISTORY_LENGTH) {
      this.messageHistory = this.messageHistory.slice(-MAX_HISTORY_LENGTH)
    }
  }
}

export const aiSocket = new AiSocketService()
