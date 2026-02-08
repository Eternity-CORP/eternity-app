import { io, type Socket } from 'socket.io-client'
import {
  createAiSocketService,
  type AiSocketService,
  type AiSocketCallbacks as SharedAiSocketCallbacks,
} from '@e-y/shared'
import type {
  ChunkPayload,
  DonePayload,
  ToolCall,
  ToolResult,
  AiSuggestion,
  AiErrorPayload,
} from '@e-y/shared'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

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

class WebAiSocketService {
  private socket: Socket | null = null
  private service: AiSocketService | null = null
  private localCallbacks: Partial<Pick<AiSocketCallbacks, 'onConnect' | 'onDisconnect'>> = {}
  private userAddress = ''

  connect(address: string): void {
    if (this.socket?.connected && this.userAddress === address) return

    this.disconnect()
    this.userAddress = address

    this.socket = io(`${API_BASE_URL}/ai`, {
      transports: ['websocket'],
      autoConnect: true,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.service = createAiSocketService(this.socket as any)

    this.socket.on('connect', () => {
      this.service?.subscribe(this.userAddress)
      this.localCallbacks.onConnect?.()
    })

    this.socket.on('disconnect', (reason: string) => {
      this.localCallbacks.onDisconnect?.(reason)
    })
  }

  disconnect(): void {
    if (!this.socket) return

    this.service?.unsubscribe()
    this.service?.clearCallbacks()
    this.service = null

    this.socket.removeAllListeners()
    this.socket.disconnect()
    this.socket = null
  }

  sendMessage(content: string): void {
    this.service?.sendMessage(content)
  }

  clearHistory(): void {
    this.service?.clearHistory()
  }

  on<K extends CallbackKey>(event: K, callback: AiSocketCallbacks[K]): void {
    // Handle connect/disconnect on socket level
    if (event === 'onConnect') {
      this.localCallbacks.onConnect = callback as AiSocketCallbacks['onConnect']
      return
    }
    if (event === 'onDisconnect') {
      this.localCallbacks.onDisconnect = callback as AiSocketCallbacks['onDisconnect']
      return
    }

    // Map to shared service callbacks
    const mapping: Record<string, keyof SharedAiSocketCallbacks> = {
      onChunk: 'onChunk',
      onDone: 'onDone',
      onToolCall: 'onToolCall',
      onToolResult: 'onToolResult',
      onSuggestion: 'onSuggestion',
      onError: 'onError',
    }

    const sharedKey = mapping[event]
    if (sharedKey && this.service) {
      // For onDone, we need to also add response to history
      if (event === 'onDone') {
        const originalCallback = callback as AiSocketCallbacks['onDone']
        const service = this.service
        this.service.setCallbacks({
          [sharedKey]: (payload: DonePayload) => {
            if (payload.content) {
              service.addResponseToHistory(payload.content)
            }
            originalCallback(payload)
          },
        } as Partial<SharedAiSocketCallbacks>)
      } else {
        this.service.setCallbacks({
          [sharedKey]: callback,
        } as Partial<SharedAiSocketCallbacks>)
      }
    }
  }

  off(event: CallbackKey): void {
    if (event === 'onConnect' || event === 'onDisconnect') {
      delete this.localCallbacks[event]
      return
    }
    // Shared service doesn't support removing individual callbacks,
    // but the whole service gets replaced on disconnect anyway.
  }
}

export const aiSocket = new WebAiSocketService()
