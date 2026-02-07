/**
 * AI WebSocket Service
 * Handles real-time AI chat operations via Socket.IO with streaming support
 */

import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/src/config/api';
import { createLogger } from '@/src/utils/logger';
import {
  AI_EVENTS,
  ChatMessage,
  ToolCall,
  ToolResult,
  ChunkPayload,
  BlikPreview,
  SwapPreview,
  TransactionPreview,
  DonePayload,
  AiSuggestion,
  AiErrorPayload,
} from '@e-y/shared';

const log = createLogger('AiService');

// Re-export types for consumers of this service
export {
  AI_EVENTS,
  ChatMessage,
  ToolCall,
  ToolResult,
  ChunkPayload,
  BlikPreview,
  SwapPreview,
  TransactionPreview,
  DonePayload,
  AiSuggestion,
  AiErrorPayload,
};
export type { BlikGeneratePreview, BlikPayPreview } from '@e-y/shared';

// Extended error payload with rate limit info (mobile-specific)
export interface AiErrorPayloadExtended extends AiErrorPayload {
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
  onError?: (payload: AiErrorPayloadExtended) => void;
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
      // Try to reconnect before failing
      if (this.userAddress) {
        log.info('Attempting to reconnect before sending message');
        this.connect(this.userAddress)
          .then(() => {
            if (this.socket?.connected) {
              this.sendMessageInternal(content);
            } else {
              this.callbacks.onError?.({
                code: 'CONNECTION_FAILED',
                message: 'Unable to connect to AI server. Please check your connection and try again.',
              });
            }
          })
          .catch(() => {
            this.callbacks.onError?.({
              code: 'CONNECTION_FAILED',
              message: 'Unable to connect to AI server. Please check your connection and try again.',
            });
          });
        return;
      }
      this.callbacks.onError?.({
        code: 'NOT_CONNECTED',
        message: 'Not connected to AI server. Please try again.',
      });
      return;
    }
    this.sendMessageInternal(content);
  }

  /**
   * Internal method to actually send the message
   */
  private sendMessageInternal(content: string): void {
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
    this.socket!.emit(AI_EVENTS.CHAT, {
      content,
      history: this.messageHistory.slice(-10), // Last 10 messages for context
    });

    log.debug('Sent chat message', { content: content.substring(0, 50) });
  }

  /**
   * Add AI response message to history (call after receiving full response)
   */
  addAiResponseMessage(content: string): void {
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
