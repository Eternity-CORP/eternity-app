import { io, type Socket } from 'socket.io-client'
import {
  createAiSocketService,
  buildSocketAuth,
  type AiSocketService,
  type AiSocketCallbacks as SharedAiSocketCallbacks,
  type WsHandshakeAuth,
} from '@e-y/shared'
import type {
  AiContact,
  ChunkPayload,
  DonePayload,
  ToolCall,
  ToolResult,
  AiSuggestion,
  AiErrorPayload,
} from '@e-y/shared'
import { API_BASE_URL } from '@/lib/api'

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pendingCallbacks: Record<string, any> = {}
  private userAddress = ''
  private userContacts: AiContact[] | undefined
  private userAccountType: string | undefined

  connect(
    address: string,
    contacts?: AiContact[],
    accountType?: string,
    signMessage?: (message: string) => Promise<string>,
  ): void {
    if (this.socket?.connected && this.userAddress === address) return

    this.disconnect()
    this.userAddress = address
    this.userContacts = contacts
    this.userAccountType = accountType

    // Build auth and connect
    const doConnect = (auth?: WsHandshakeAuth) => {
      this.socket = io(`${API_BASE_URL}/ai`, {
        transports: ['websocket'],
        autoConnect: true,
        ...(auth ? { auth } : {}),
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.service = createAiSocketService(this.socket as any)

      // Apply any callbacks that were registered before connect
      if (Object.keys(this.pendingCallbacks).length > 0) {
        this.service.setCallbacks(this.pendingCallbacks as Partial<SharedAiSocketCallbacks>)
        this.pendingCallbacks = {}
      }

      this.socket.on('connect', () => {
        this.service?.subscribe(this.userAddress, this.userContacts, this.userAccountType)
        this.localCallbacks.onConnect?.()
      })

      this.socket.on('disconnect', (reason: string) => {
        this.localCallbacks.onDisconnect?.(reason)
      })
    }

    // If signMessage is provided, build auth credentials before connecting
    if (signMessage && address) {
      buildSocketAuth(address, signMessage)
        .then((auth) => doConnect(auth))
        .catch(() => {
          // Fallback to unauthenticated connection if signing fails
          console.warn('[AI Socket] Auth signing failed, connecting without auth')
          doConnect()
        })
    } else {
      doConnect()
    }
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

  addSystemMessage(content: string): void {
    this.service?.addSystemMessage(content)
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
    if (!sharedKey) return

    // Build the callback (with history tracking for onDone)
    let wrappedCallback: unknown
    if (event === 'onDone') {
      const originalCallback = callback as AiSocketCallbacks['onDone']
      wrappedCallback = (payload: DonePayload) => {
        if (payload.content) {
          this.service?.addResponseToHistory(payload.content)
        }
        originalCallback(payload)
      }
    } else {
      wrappedCallback = callback
    }

    if (this.service) {
      this.service.setCallbacks({
        [sharedKey]: wrappedCallback,
      } as Partial<SharedAiSocketCallbacks>)
    } else {
      // Store for later — will be applied when connect() is called
      this.pendingCallbacks[sharedKey] = wrappedCallback
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
