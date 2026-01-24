/**
 * AI Redux Slice
 * Manages AI chat state, messages, suggestions, and pending transactions
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  ChatMessage,
  ToolCall,
  ToolResult,
  TransactionPreview,
  AiSuggestion,
} from '@/src/services/ai-service';

// ============================================
// Types
// ============================================

export type AiStatus = 'idle' | 'connecting' | 'connected' | 'sending' | 'streaming' | 'error';

export interface AiState {
  // Connection status
  status: AiStatus;
  isConnected: boolean;

  // Chat messages
  messages: ChatMessage[];

  // Current streaming message (built up from chunks)
  streamingContent: string;
  streamingMessageId: string | null;

  // Proactive suggestions
  suggestions: AiSuggestion[];

  // Pending transaction from AI (awaiting user confirmation)
  pendingTransaction: TransactionPreview | null;

  // Error state
  error: string | null;
  errorCode: string | null;

  // Rate limit info
  rateLimit: {
    remaining: number;
    resetIn: number;
    limit: number;
  } | null;
}

const initialState: AiState = {
  status: 'idle',
  isConnected: false,
  messages: [],
  streamingContent: '',
  streamingMessageId: null,
  suggestions: [],
  pendingTransaction: null,
  error: null,
  errorCode: null,
  rateLimit: null,
};

// ============================================
// Helpers
// ============================================

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ============================================
// Slice
// ============================================

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    // ========================================
    // Connection Actions
    // ========================================

    /**
     * Started connecting to AI server
     */
    connecting: (state) => {
      state.status = 'connecting';
      state.error = null;
      state.errorCode = null;
    },

    /**
     * Successfully connected to AI server
     */
    connected: (state) => {
      state.status = 'connected';
      state.isConnected = true;
      state.error = null;
      state.errorCode = null;
    },

    /**
     * Disconnected from AI server
     */
    disconnected: (state) => {
      state.status = 'idle';
      state.isConnected = false;
    },

    // ========================================
    // Message Actions
    // ========================================

    /**
     * Send a user message
     */
    sendMessage: (state, action: PayloadAction<string>) => {
      const message: ChatMessage = {
        id: generateMessageId(),
        role: 'user',
        content: action.payload,
        timestamp: new Date().toISOString(),
      };

      state.messages.push(message);
      state.status = 'sending';
      state.error = null;
      state.errorCode = null;

      // Prepare for streaming response
      state.streamingContent = '';
      state.streamingMessageId = generateMessageId();
    },

    /**
     * Receive a streaming chunk
     */
    receiveChunk: (state, action: PayloadAction<{ content: string; index: number }>) => {
      state.status = 'streaming';
      state.streamingContent += action.payload.content;
    },

    /**
     * Streaming complete - finalize message
     */
    streamingComplete: (
      state,
      action: PayloadAction<{
        content: string;
        toolCalls?: ToolCall[];
        toolResults?: ToolResult[];
      }>,
    ) => {
      if (state.streamingMessageId) {
        const message: ChatMessage = {
          id: state.streamingMessageId,
          role: 'assistant',
          content: action.payload.content,
          timestamp: new Date().toISOString(),
          toolCalls: action.payload.toolCalls,
          toolResults: action.payload.toolResults,
        };

        state.messages.push(message);
      }

      state.status = 'connected';
      state.streamingContent = '';
      state.streamingMessageId = null;
    },

    /**
     * Add a complete message (for non-streaming responses)
     */
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },

    /**
     * Clear all messages
     */
    clearMessages: (state) => {
      state.messages = [];
      state.streamingContent = '';
      state.streamingMessageId = null;
    },

    // ========================================
    // Transaction Actions
    // ========================================

    /**
     * Set pending transaction from AI
     */
    setPendingTransaction: (state, action: PayloadAction<TransactionPreview | null>) => {
      state.pendingTransaction = action.payload;
    },

    /**
     * Clear pending transaction (after confirm/cancel)
     */
    clearPendingTransaction: (state) => {
      state.pendingTransaction = null;
    },

    // ========================================
    // Suggestion Actions
    // ========================================

    /**
     * Add a new suggestion
     */
    addSuggestion: (state, action: PayloadAction<AiSuggestion>) => {
      // Avoid duplicates
      const exists = state.suggestions.some((s) => s.id === action.payload.id);
      if (!exists) {
        state.suggestions.unshift(action.payload);
        // Keep only last 10 suggestions
        if (state.suggestions.length > 10) {
          state.suggestions.pop();
        }
      }
    },

    /**
     * Dismiss a suggestion
     */
    dismissSuggestion: (state, action: PayloadAction<string>) => {
      state.suggestions = state.suggestions.filter((s) => s.id !== action.payload);
    },

    /**
     * Clear all suggestions
     */
    clearSuggestions: (state) => {
      state.suggestions = [];
    },

    // ========================================
    // Error Actions
    // ========================================

    /**
     * Set error state
     */
    setError: (
      state,
      action: PayloadAction<{
        message: string;
        code?: string;
        rateLimit?: { remaining: number; resetIn: number; limit: number };
      }>,
    ) => {
      state.status = 'error';
      state.error = action.payload.message;
      state.errorCode = action.payload.code || null;

      if (action.payload.rateLimit) {
        state.rateLimit = action.payload.rateLimit;
      }

      // Clear streaming state on error
      state.streamingContent = '';
      state.streamingMessageId = null;
    },

    /**
     * Clear error state
     */
    clearError: (state) => {
      state.error = null;
      state.errorCode = null;
      if (state.status === 'error') {
        state.status = state.isConnected ? 'connected' : 'idle';
      }
    },

    // ========================================
    // Global Actions
    // ========================================

    /**
     * Reset all AI state
     */
    resetAi: () => initialState,
  },
});

export const {
  // Connection
  connecting,
  connected,
  disconnected,

  // Messages
  sendMessage,
  receiveChunk,
  streamingComplete,
  addMessage,
  clearMessages,

  // Transactions
  setPendingTransaction,
  clearPendingTransaction,

  // Suggestions
  addSuggestion,
  dismissSuggestion,
  clearSuggestions,

  // Errors
  setError,
  clearError,

  // Global
  resetAi,
} = aiSlice.actions;

export default aiSlice.reducer;
