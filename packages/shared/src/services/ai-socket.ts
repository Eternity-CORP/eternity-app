/**
 * AI Socket Factory
 * Creates a typed AI chat service from any SocketLike instance.
 * Zero dependencies — socket creation is done by the app.
 */

import type { SocketLike } from './socket-types';
import {
  AI_EVENTS,
  type AiContact,
  type ChunkPayload,
  type DonePayload,
  type ToolCall,
  type ToolResult,
  type AiSuggestion,
  type AiErrorPayload,
} from '../types/ai';

const MAX_HISTORY_LENGTH = 10;

export interface AiSocketCallbacks {
  onChunk?: (payload: ChunkPayload) => void;
  onDone?: (payload: DonePayload) => void;
  onToolCall?: (payload: ToolCall) => void;
  onToolResult?: (payload: ToolResult) => void;
  onSuggestion?: (payload: AiSuggestion) => void;
  onError?: (payload: AiErrorPayload & { rateLimit?: { remaining: number; resetIn: number; limit: number } }) => void;
}

export interface AiSocketService {
  subscribe(address: string, contacts?: AiContact[], accountType?: string): void;
  unsubscribe(): void;
  sendMessage(content: string): void;
  addResponseToHistory(content: string): void;
  addSystemMessage(content: string): void;
  clearHistory(): void;
  setCallbacks(callbacks: AiSocketCallbacks): void;
  clearCallbacks(): void;
}

export function createAiSocketService(socket: SocketLike): AiSocketService {
  let callbacks: AiSocketCallbacks = {};
  let messageHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  let userAddress = '';

  // Set up event listeners
  socket.on(AI_EVENTS.CHUNK, (payload: unknown) => {
    callbacks.onChunk?.(payload as ChunkPayload);
  });

  socket.on(AI_EVENTS.DONE, (payload: unknown) => {
    callbacks.onDone?.(payload as DonePayload);
  });

  socket.on(AI_EVENTS.TOOL_CALL, (payload: unknown) => {
    callbacks.onToolCall?.(payload as ToolCall);
  });

  socket.on(AI_EVENTS.TOOL_RESULT, (payload: unknown) => {
    callbacks.onToolResult?.(payload as ToolResult);
  });

  socket.on(AI_EVENTS.SUGGESTION, (payload: unknown) => {
    const suggestion = payload as AiSuggestion;
    callbacks.onSuggestion?.({
      ...suggestion,
      id: suggestion.id || `sug_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: suggestion.createdAt || new Date().toISOString(),
    });
  });

  socket.on(AI_EVENTS.ERROR, (payload: unknown) => {
    callbacks.onError?.(payload as AiErrorPayload);
  });

  return {
    subscribe(address: string, contacts?: AiContact[], accountType?: string): void {
      userAddress = address.toLowerCase();
      if (socket.connected) {
        socket.emit(AI_EVENTS.SUBSCRIBE, { address: userAddress, contacts, accountType });
      }
    },

    unsubscribe(): void {
      socket.emit(AI_EVENTS.UNSUBSCRIBE);
      userAddress = '';
      messageHistory = [];
    },

    sendMessage(content: string): void {
      if (!socket.connected || !userAddress) return;

      messageHistory.push({ role: 'user', content });
      if (messageHistory.length > MAX_HISTORY_LENGTH) {
        messageHistory = messageHistory.slice(-MAX_HISTORY_LENGTH);
      }

      socket.emit(AI_EVENTS.CHAT, {
        content,
        history: messageHistory.slice(-MAX_HISTORY_LENGTH),
      });
    },

    addResponseToHistory(content: string): void {
      messageHistory.push({ role: 'assistant', content });
      if (messageHistory.length > MAX_HISTORY_LENGTH) {
        messageHistory = messageHistory.slice(-MAX_HISTORY_LENGTH);
      }
    },

    addSystemMessage(content: string): void {
      messageHistory.push({ role: 'user', content: `[SYSTEM] ${content}` });
      if (messageHistory.length > MAX_HISTORY_LENGTH) {
        messageHistory = messageHistory.slice(-MAX_HISTORY_LENGTH);
      }
    },

    clearHistory(): void {
      messageHistory = [];
    },

    setCallbacks(newCallbacks: AiSocketCallbacks): void {
      callbacks = { ...callbacks, ...newCallbacks };
    },

    clearCallbacks(): void {
      callbacks = {};
    },
  };
}
