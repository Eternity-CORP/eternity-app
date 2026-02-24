/**
 * useAiChat Hook
 * Provides AI chat functionality with automatic connection management
 */

import { useEffect, useCallback, useMemo } from 'react';
import { contactsToAiFormat } from '@e-y/shared';
import { useAppDispatch, useAppSelector } from '@/src/store/hooks';
import {
  aiSocket,
  type ChunkPayload,
  type DonePayload,
  type ToolCall,
  type ToolResult,
  type AiSuggestion,
  type AiErrorPayloadExtended,
} from '@/src/services/ai-service';
import {
  connecting,
  connected,
  disconnected,
  sendMessage as sendMessageAction,
  receiveChunk,
  streamingComplete,
  setPendingTransaction,
  setPendingBlik,
  setPendingSwap,
  setPendingUsername,
  setPendingScheduled,
  setPendingSplit,
  addSuggestion,
  dismissSuggestion as dismissSuggestionAction,
  addMessage,
  setError,
  clearMessages,
  type AiState,
} from '@/src/store/slices/ai-slice';

interface UseAiChatOptions {
  autoConnect?: boolean;
}

interface UseAiChatReturn {
  // State
  messages: AiState['messages'];
  suggestions: AiState['suggestions'];
  status: AiState['status'];
  isConnected: boolean;
  isStreaming: boolean;
  streamingContent: string;
  pendingTransaction: AiState['pendingTransaction'];
  pendingBlik: AiState['pendingBlik'];
  pendingSwap: AiState['pendingSwap'];
  pendingUsername: AiState['pendingUsername'];
  pendingScheduled: AiState['pendingScheduled'];
  pendingSplit: AiState['pendingSplit'];
  error: string | null;
  rateLimit: AiState['rateLimit'];

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  sendMessage: (content: string) => void;
  dismissSuggestion: (id: string) => void;
  clearChat: () => void;
  clearPendingTransaction: () => void;
  clearPendingBlik: () => void;
  clearPendingSwap: () => void;
  clearPendingUsername: () => void;
  clearPendingScheduled: () => void;
  clearPendingSplit: () => void;
  addLocalMessage: (content: string, role?: 'user' | 'assistant') => void;
}

export function useAiChat(options: UseAiChatOptions = {}): UseAiChatReturn {
  const { autoConnect = true } = options;
  const dispatch = useAppDispatch();

  // Selectors
  const walletAddress = useAppSelector((state) => {
    const { accounts, currentAccountIndex } = state.wallet;
    return accounts[currentAccountIndex]?.address || null;
  });
  const accountType = useAppSelector((state) => {
    const { accounts, currentAccountIndex } = state.wallet;
    return accounts[currentAccountIndex]?.type || 'test';
  });
  const savedContacts = useAppSelector((state) => state.contacts.contacts);
  const aiState = useAppSelector((state) => state.ai);

  const {
    messages,
    suggestions,
    status,
    isConnected,
    streamingContent,
    pendingTransaction,
    pendingBlik,
    pendingSwap,
    pendingUsername,
    pendingScheduled,
    pendingSplit,
    error,
    rateLimit,
  } = aiState;

  // Derived state
  const isStreaming = useMemo(
    () => status === 'streaming' || status === 'sending',
    [status],
  );

  // Connect to AI service
  const connect = useCallback(async () => {
    if (!walletAddress) {
      dispatch(setError({ message: 'Wallet not connected', code: 'NO_WALLET' }));
      return;
    }

    dispatch(connecting());

    try {
      const aiContacts = savedContacts.length > 0
        ? contactsToAiFormat(savedContacts)
        : undefined;
      await aiSocket.connect(walletAddress, aiContacts, accountType);
    } catch (err) {
      dispatch(
        setError({
          message: 'Failed to connect to AI service',
          code: 'CONNECTION_ERROR',
        }),
      );
    }
  }, [walletAddress, savedContacts, accountType, dispatch]);

  // Disconnect from AI service
  const disconnect = useCallback(() => {
    aiSocket.disconnect();
    dispatch(disconnected());
  }, [dispatch]);

  // Send a message
  const sendMessage = useCallback(
    (content: string) => {
      if (!content.trim()) return;

      dispatch(sendMessageAction(content));
      aiSocket.sendMessage(content);
    },
    [dispatch],
  );

  // Dismiss a suggestion
  const dismissSuggestion = useCallback(
    (id: string) => {
      dispatch(dismissSuggestionAction(id));
    },
    [dispatch],
  );

  // Clear chat history
  const clearChat = useCallback(() => {
    dispatch(clearMessages());
    aiSocket.clearHistory();
  }, [dispatch]);

  // Clear pending transaction
  const clearPendingTx = useCallback(() => {
    dispatch(setPendingTransaction(null));
  }, [dispatch]);

  // Clear pending BLIK
  const clearPendingBlikAction = useCallback(() => {
    dispatch(setPendingBlik(null));
  }, [dispatch]);

  // Clear pending swap
  const clearPendingSwapAction = useCallback(() => {
    dispatch(setPendingSwap(null));
  }, [dispatch]);

  // Clear pending username
  const clearPendingUsernameAction = useCallback(() => {
    dispatch(setPendingUsername(null));
  }, [dispatch]);

  // Clear pending scheduled payment
  const clearPendingScheduledAction = useCallback(() => {
    dispatch(setPendingScheduled(null));
  }, [dispatch]);

  // Clear pending split bill
  const clearPendingSplitAction = useCallback(() => {
    dispatch(setPendingSplit(null));
  }, [dispatch]);

  // Add a local-only message (not sent to AI server)
  const addLocalMessage = useCallback((content: string, role: 'user' | 'assistant' = 'assistant') => {
    dispatch(addMessage({
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      role,
      content,
      timestamp: new Date().toISOString(),
    }));
  }, [dispatch]);

  // Setup socket callbacks
  useEffect(() => {
    aiSocket.setCallbacks({
      onConnect: () => {
        dispatch(connected());
      },

      onDisconnect: () => {
        dispatch(disconnected());
      },

      onChunk: (payload: ChunkPayload) => {
        dispatch(receiveChunk(payload));
      },

      onDone: (payload: DonePayload) => {
        dispatch(
          streamingComplete({
            content: payload.content,
            toolCalls: payload.toolCalls,
            toolResults: payload.toolResults,
          }),
        );

        // Add to socket history for context
        aiSocket.addAiResponseMessage(payload.content);

        // Handle pending transaction
        if (payload.pendingTransaction) {
          dispatch(setPendingTransaction(payload.pendingTransaction));
        }

        // Handle pending BLIK
        if (payload.pendingBlik) {
          dispatch(setPendingBlik(payload.pendingBlik));
        }

        // Handle pending swap
        if (payload.pendingSwap) {
          dispatch(setPendingSwap(payload.pendingSwap));
        }

        // Handle pending username
        if (payload.pendingUsername) {
          dispatch(setPendingUsername(payload.pendingUsername));
        }

        // Handle pending scheduled payment
        if (payload.pendingScheduled) {
          dispatch(setPendingScheduled(payload.pendingScheduled));
        }

        // Handle pending split bill
        if (payload.pendingSplit) {
          dispatch(setPendingSplit(payload.pendingSplit));
        }
      },

      onToolCall: (_payload: ToolCall) => {
        // Tool calls are included in done payload, no separate handling needed
      },

      onToolResult: (_payload: ToolResult) => {
        // Tool results are included in done payload, no separate handling needed
      },

      onSuggestion: (payload: AiSuggestion) => {
        dispatch(addSuggestion(payload));
      },

      onError: (payload: AiErrorPayloadExtended) => {
        dispatch(
          setError({
            message: payload.message,
            code: payload.code,
            rateLimit: payload.rateLimit,
          }),
        );
      },
    });

    return () => {
      aiSocket.clearCallbacks();
    };
  }, [dispatch]);

  // Auto-connect when wallet is available
  useEffect(() => {
    if (autoConnect && walletAddress && !isConnected && status === 'idle') {
      connect();
    }
  }, [autoConnect, walletAddress, isConnected, status, connect]);

  return {
    // State
    messages,
    suggestions,
    status,
    isConnected,
    isStreaming,
    streamingContent,
    pendingTransaction,
    pendingBlik,
    pendingSwap,
    pendingUsername,
    pendingScheduled,
    pendingSplit,
    error,
    rateLimit,

    // Actions
    connect,
    disconnect,
    sendMessage,
    dismissSuggestion,
    clearChat,
    clearPendingTransaction: clearPendingTx,
    clearPendingBlik: clearPendingBlikAction,
    clearPendingSwap: clearPendingSwapAction,
    clearPendingUsername: clearPendingUsernameAction,
    clearPendingScheduled: clearPendingScheduledAction,
    clearPendingSplit: clearPendingSplitAction,
    addLocalMessage,
  };
}
