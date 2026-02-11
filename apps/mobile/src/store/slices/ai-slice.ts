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
  BlikPreview,
  SwapPreview,
} from '@/src/services/ai-service';
import type { UsernamePreview, ScheduledPaymentPreview, SplitPreview } from '@e-y/shared';

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

  // Pending BLIK from AI (awaiting user confirmation)
  pendingBlik: BlikPreview | null;

  // Pending swap from AI (awaiting user confirmation)
  pendingSwap: SwapPreview | null;

  // Pending username registration from AI
  pendingUsername: UsernamePreview | null;

  // Pending scheduled payment from AI (awaiting user confirmation)
  pendingScheduled: ScheduledPaymentPreview | null;

  // Pending split bill from AI (awaiting user confirmation)
  pendingSplit: SplitPreview | null;

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
  pendingBlik: null,
  pendingSwap: null,
  pendingUsername: null,
  pendingScheduled: null,
  pendingSplit: null,
  error: null,
  errorCode: null,
  rateLimit: null,
};

// ============================================
// Helpers (called outside reducers — in prepare callbacks)
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
     * Uses prepare callback to keep Date.now()/Math.random() out of the reducer
     */
    sendMessage: {
      reducer: (
        state,
        action: PayloadAction<{
          content: string;
          messageId: string;
          streamingMessageId: string;
          timestamp: string;
        }>,
      ) => {
        const message: ChatMessage = {
          id: action.payload.messageId,
          role: 'user',
          content: action.payload.content,
          timestamp: action.payload.timestamp,
        };

        state.messages.push(message);
        state.status = 'sending';
        state.error = null;
        state.errorCode = null;

        // Prepare for streaming response
        state.streamingContent = '';
        state.streamingMessageId = action.payload.streamingMessageId;
      },
      prepare: (content: string) => ({
        payload: {
          content,
          messageId: generateMessageId(),
          streamingMessageId: generateMessageId(),
          timestamp: new Date().toISOString(),
        },
      }),
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
     * Uses prepare callback to keep Date.now() out of the reducer
     */
    streamingComplete: {
      reducer: (
        state,
        action: PayloadAction<{
          content: string;
          timestamp: string;
          toolCalls?: ToolCall[];
          toolResults?: ToolResult[];
        }>,
      ) => {
        if (state.streamingMessageId) {
          const message: ChatMessage = {
            id: state.streamingMessageId,
            role: 'assistant',
            content: action.payload.content,
            timestamp: action.payload.timestamp,
            toolCalls: action.payload.toolCalls,
            toolResults: action.payload.toolResults,
          };

          state.messages.push(message);
        }

        state.status = 'connected';
        state.streamingContent = '';
        state.streamingMessageId = null;
      },
      prepare: (payload: {
        content: string;
        toolCalls?: ToolCall[];
        toolResults?: ToolResult[];
      }) => ({
        payload: {
          ...payload,
          timestamp: new Date().toISOString(),
        },
      }),
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
    // BLIK Actions
    // ========================================

    /**
     * Set pending BLIK from AI
     */
    setPendingBlik: (state, action: PayloadAction<BlikPreview | null>) => {
      state.pendingBlik = action.payload;
    },

    /**
     * Clear pending BLIK (after confirm/cancel)
     */
    clearPendingBlik: (state) => {
      state.pendingBlik = null;
    },

    // ========================================
    // Swap Actions
    // ========================================

    /**
     * Set pending swap from AI
     */
    setPendingSwap: (state, action: PayloadAction<SwapPreview | null>) => {
      state.pendingSwap = action.payload;
    },

    /**
     * Clear pending swap (after confirm/cancel)
     */
    clearPendingSwap: (state) => {
      state.pendingSwap = null;
    },

    // ========================================
    // Username Actions
    // ========================================

    /**
     * Set pending username registration from AI
     */
    setPendingUsername: (state, action: PayloadAction<UsernamePreview | null>) => {
      state.pendingUsername = action.payload;
    },

    /**
     * Clear pending username (after confirm/cancel)
     */
    clearPendingUsername: (state) => {
      state.pendingUsername = null;
    },

    // ========================================
    // Scheduled Payment Actions
    // ========================================

    /**
     * Set pending scheduled payment from AI
     */
    setPendingScheduled: (state, action: PayloadAction<ScheduledPaymentPreview | null>) => {
      state.pendingScheduled = action.payload;
    },

    /**
     * Clear pending scheduled payment (after confirm/cancel)
     */
    clearPendingScheduled: (state) => {
      state.pendingScheduled = null;
    },

    // ========================================
    // Split Bill Actions
    // ========================================

    /**
     * Set pending split bill from AI
     */
    setPendingSplit: (state, action: PayloadAction<SplitPreview | null>) => {
      state.pendingSplit = action.payload;
    },

    /**
     * Clear pending split bill (after confirm/cancel)
     */
    clearPendingSplit: (state) => {
      state.pendingSplit = null;
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

  // BLIK
  setPendingBlik,
  clearPendingBlik,

  // Swap
  setPendingSwap,
  clearPendingSwap,

  // Username
  setPendingUsername,
  clearPendingUsername,

  // Scheduled Payment
  setPendingScheduled,
  clearPendingScheduled,

  // Split Bill
  setPendingSplit,
  clearPendingSplit,

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
