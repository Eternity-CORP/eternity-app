/**
 * AI WebSocket Service
 * Handles real-time AI chat operations via Socket.IO with streaming support
 */

import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/src/config/api';
import { createLogger } from '@/src/utils/logger';

const log = createLogger('AiService');

// ============================================
// Event Constants
// ============================================

export const AI_EVENTS = {
  // Incoming (to server)
  CHAT: 'chat',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',

  // Outgoing (from server)
  CHUNK: 'chunk',
  DONE: 'done',
  TOOL_CALL: 'tool_call',
  TOOL_RESULT: 'tool_result',
  SUGGESTION: 'suggestion',
  ERROR: 'error',
} as const;

// ============================================
// Types
// ============================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  name: string;
  result: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
}

export interface ChunkPayload {
  content: string;
  index: number;
}

export interface DonePayload {
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  pendingTransaction?: TransactionPreview;
}

export interface TransactionPreview {
  id: string;
  from: string;
  to: string;
  toUsername?: string;
  amount: string;
  token: string;
  amountUsd: string;
  estimatedGas: string;
  estimatedGasUsd: string;
  network: string;
}

export interface AiSuggestion {
  id: string;
  type: 'payment_reminder' | 'security_alert' | 'transaction_tip' | 'savings_tip';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  action?: {
    label: string;
    route?: string;
    type?: string;
    payload?: unknown;
  };
}

export interface AiErrorPayload {
  code: string;
  message: string;
  rateLimit?: {
    remaining: number;
    resetIn: number;
    limit: number;
  };
}

// ============================================
// Callbacks
// ============================================

export interface AiCallbacks {
  onChunk?: (payload: ChunkPayload) => void;
  onDone?: (payload: DonePayload) => void;
  onToolCall?: (payload: ToolCall) => void;
  onToolResult?: (payload: ToolResult) => void;
  onSuggestion?: (payload: AiSuggestion) => void;
  onError?: (payload: AiErrorPayload) => void;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
}

// ============================================
// Service
// ============================================

class AiSocketService {
  private socket: Socket | null = null;
  private callbacks: AiCallbacks = {};
  private isConnecting = false;
  private userAddress: string | null = null;
  private messageHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  /**
   * Connect to the AI WebSocket server
   */
  connect(address: string): Promise<void> {
    if (this.socket?.connected) {
      // Already connected, just subscribe with new address if different
      if (address && address !== this.userAddress) {
        this.subscribe(address);
      }
      return Promise.resolve();
    }

    if (this.isConnecting) {
      return new Promise((resolve) => {
        const checkConnection = setInterval(() => {
          if (this.socket?.connected) {
            clearInterval(checkConnection);
            resolve();
          }
        }, 100);
      });
    }

    this.isConnecting = true;
    this.userAddress = address;

    return new Promise((resolve) => {
      this.socket = io(`${API_BASE_URL}/ai`, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on('connect', () => {
        log.info('Connected to AI WebSocket');
        this.isConnecting = false;

        if (this.userAddress) {
          this.subscribe(this.userAddress);
        }

        this.callbacks.onConnect?.();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        log.warn('AI WebSocket connection error', { message: error.message });
        this.isConnecting = false;
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        log.debug('Disconnected from AI WebSocket', { reason });
        this.callbacks.onDisconnect?.(reason);
      });

      this.socket.on('reconnect', () => {
        log.info('Reconnected to AI WebSocket');
        if (this.userAddress) {
          this.subscribe(this.userAddress);
        }
      });

      this.setupEventListeners();

      // Timeout fallback
      setTimeout(() => {
        if (this.isConnecting) {
          this.isConnecting = false;
          resolve();
        }
      }, 5000);
    });
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on(AI_EVENTS.CHUNK, (payload: ChunkPayload) => {
      this.callbacks.onChunk?.(payload);
    });

    this.socket.on(AI_EVENTS.DONE, (payload: DonePayload) => {
      this.callbacks.onDone?.(payload);
    });

    this.socket.on(AI_EVENTS.TOOL_CALL, (payload: ToolCall) => {
      this.callbacks.onToolCall?.(payload);
    });

    this.socket.on(AI_EVENTS.TOOL_RESULT, (payload: ToolResult) => {
      this.callbacks.onToolResult?.(payload);
    });

    this.socket.on(AI_EVENTS.SUGGESTION, (payload: AiSuggestion) => {
      // Add ID and timestamp if not present
      const suggestion = {
        ...payload,
        id: payload.id || `sug_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        createdAt: payload.createdAt || new Date(),
      };
      this.callbacks.onSuggestion?.(suggestion);
    });

    this.socket.on(AI_EVENTS.ERROR, (payload: AiErrorPayload) => {
      log.warn('AI WebSocket error', payload);
      this.callbacks.onError?.(payload);
    });
  }

  /**
   * Disconnect from the AI WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.emit(AI_EVENTS.UNSUBSCRIBE);
      this.socket.disconnect();
      this.socket = null;
    }
    this.callbacks = {};
    this.userAddress = null;
    this.messageHistory = [];
  }

  /**
   * Subscribe to AI events for a wallet address
   */
  private subscribe(address: string): void {
    this.userAddress = address.toLowerCase();
    if (this.socket?.connected) {
      this.socket.emit(AI_EVENTS.SUBSCRIBE, { address: this.userAddress });
      log.debug('Subscribed to AI events', { address: this.userAddress });
    }
  }

  /**
   * Set event callbacks
   */
  setCallbacks(callbacks: AiCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Clear all callbacks
   */
  clearCallbacks(): void {
    this.callbacks = {};
  }

  /**
   * Send a chat message
   */
  sendMessage(content: string): void {
    if (!this.socket?.connected) {
      this.callbacks.onError?.({
        code: 'NOT_CONNECTED',
        message: 'Not connected to AI server',
      });
      return;
    }

    if (!this.userAddress) {
      this.callbacks.onError?.({
        code: 'NOT_SUBSCRIBED',
        message: 'Please subscribe with your wallet address first',
      });
      return;
    }

    // Add to local history
    this.messageHistory.push({ role: 'user', content });

    // Send with history for context
    this.socket.emit(AI_EVENTS.CHAT, {
      content,
      history: this.messageHistory.slice(-10), // Last 10 messages for context
    });

    log.debug('Sent chat message', { content: content.substring(0, 50) });
  }

  /**
   * Add assistant message to history (call after receiving full response)
   */
  addAssistantMessage(content: string): void {
    this.messageHistory.push({ role: 'assistant', content });
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.messageHistory = [];
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get current user address
   */
  getUserAddress(): string | null {
    return this.userAddress;
  }
}

// Export singleton instance
export const aiSocket = new AiSocketService();
