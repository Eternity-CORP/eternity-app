/**
 * AI WebSocket Service
 * Handles real-time AI chat operations via Socket.IO with streaming support
 *
 * Uses shared socket factory for event wiring.
 * Keeps: socket creation, reconnection, connect/disconnect lifecycle (platform-specific).
 */

import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/src/config/api';
import { createLogger } from '@/src/utils/logger';
import {
  createAiSocketService,
  type AiSocketService,
  AI_EVENTS,
  AiContact,
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

class AiSocketServiceWrapper {
  private socket: Socket | null = null;
  private sharedService: AiSocketService | null = null;
  private callbacks: AiCallbacks = {};
  private isConnecting = false;
  private userAddress: string | null = null;
  private userContacts: AiContact[] | undefined;
  private userAccountType: string | undefined;

  /**
   * Connect to the AI WebSocket server
   */
  connect(address: string, contacts?: AiContact[], accountType?: string): Promise<void> {
    this.userContacts = contacts;
    this.userAccountType = accountType;

    if (this.socket?.connected) {
      if (address && address !== this.userAddress) {
        this.userAddress = address;
        this.sharedService?.subscribe(address, contacts, accountType);
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

      // Create shared service that wires up all event listeners
      this.sharedService = createAiSocketService(this.socket);
      this.syncCallbacksToShared();

      this.socket.on('connect', () => {
        log.info('Connected to AI WebSocket');
        this.isConnecting = false;

        if (this.userAddress) {
          this.sharedService?.subscribe(this.userAddress, this.userContacts, this.userAccountType);
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
          this.sharedService?.subscribe(this.userAddress, this.userContacts, this.userAccountType);
        }
      });

      // Timeout fallback
      setTimeout(() => {
        if (this.isConnecting) {
          this.isConnecting = false;
          resolve();
        }
      }, 5000);
    });
  }

  /**
   * Sync local callbacks to shared service
   */
  private syncCallbacksToShared(): void {
    if (!this.sharedService) return;

    this.sharedService.setCallbacks({
      onChunk: (payload) => this.callbacks.onChunk?.(payload),
      onDone: (payload) => this.callbacks.onDone?.(payload),
      onToolCall: (payload) => this.callbacks.onToolCall?.(payload),
      onToolResult: (payload) => this.callbacks.onToolResult?.(payload),
      onSuggestion: (payload) => this.callbacks.onSuggestion?.(payload),
      onError: (payload) => this.callbacks.onError?.(payload),
    });
  }

  /**
   * Disconnect from the AI WebSocket server
   */
  disconnect(): void {
    if (this.sharedService) {
      this.sharedService.unsubscribe();
      this.sharedService.clearCallbacks();
      this.sharedService = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.callbacks = {};
    this.userAddress = null;
  }

  /**
   * Set event callbacks
   */
  setCallbacks(callbacks: AiCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
    this.syncCallbacksToShared();
  }

  /**
   * Clear all callbacks
   */
  clearCallbacks(): void {
    this.callbacks = {};
    this.sharedService?.clearCallbacks();
  }

  /**
   * Send a chat message
   */
  sendMessage(content: string): void {
    if (!this.socket?.connected) {
      if (this.userAddress) {
        log.info('Attempting to reconnect before sending message');
        this.connect(this.userAddress)
          .then(() => {
            if (this.socket?.connected) {
              this.sharedService?.sendMessage(content);
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
    this.sharedService?.sendMessage(content);
  }

  /**
   * Add AI response message to history
   */
  addAiResponseMessage(content: string): void {
    this.sharedService?.addResponseToHistory(content);
  }

  /**
   * Add system message to history (not sent to server, just context for AI)
   */
  addSystemMessage(content: string): void {
    this.sharedService?.addSystemMessage(content);
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.sharedService?.clearHistory();
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
export const aiSocket = new AiSocketServiceWrapper();
