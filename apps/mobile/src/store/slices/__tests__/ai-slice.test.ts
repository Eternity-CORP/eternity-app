/**
 * Tests for AI Redux Slice
 * Covers connection lifecycle, message flow, pending operations,
 * suggestions, error handling, and full reset.
 */

jest.mock('@/src/services/ai-service', () => ({}));

import reducer, {
  connecting,
  connected,
  disconnected,
  sendMessage,
  receiveChunk,
  streamingComplete,
  addMessage,
  clearMessages,
  setPendingTransaction,
  clearPendingTransaction,
  setPendingBlik,
  clearPendingBlik,
  setPendingSwap,
  clearPendingSwap,
  addSuggestion,
  dismissSuggestion,
  clearSuggestions,
  setError,
  clearError,
  resetAi,
  type AiState,
} from '../ai-slice';

// ============================================
// Helpers
// ============================================

const INITIAL_STATE: AiState = {
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
  error: null,
  errorCode: null,
  rateLimit: null,
};

function makeChatMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg_test_001',
    role: 'user' as const,
    content: 'Hello AI',
    timestamp: '2025-01-15T10:00:00.000Z',
    ...overrides,
  };
}

function makeTransactionPreview(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tx_001',
    from: '0xAAA',
    to: '0xBBB',
    amount: '1.5',
    token: 'ETH',
    amountUsd: '3000.00',
    estimatedGas: '0.002',
    estimatedGasUsd: '4.00',
    network: 'ethereum',
    ...overrides,
  };
}

function makeBlikPreview(overrides: Record<string, unknown> = {}) {
  return {
    type: 'generate' as const,
    id: 'blik_001',
    code: '123456',
    amount: '50',
    token: 'USDC',
    amountUsd: '50.00',
    expiresAt: Date.now() + 120_000,
    status: 'pending' as const,
    ...overrides,
  };
}

function makeSwapPreview(overrides: Record<string, unknown> = {}) {
  return {
    id: 'swap_001',
    fromToken: { symbol: 'ETH', amount: '1', amountUsd: '2000' },
    toToken: { symbol: 'USDC', amount: '2000', amountUsd: '2000' },
    rate: '2000',
    priceImpact: '0.05',
    estimatedGas: '0.003',
    estimatedGasUsd: '6.00',
    slippage: '0.5',
    network: 'ethereum',
    requiresApproval: false,
    status: 'pending_confirmation' as const,
    ...overrides,
  };
}

function makeSuggestion(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sug_001',
    type: 'savings_tip' as const,
    title: 'Save more',
    message: 'Consider staking your ETH',
    priority: 'medium' as const,
    createdAt: '2025-01-15T10:00:00.000Z',
    ...overrides,
  };
}

// ============================================
// Tests
// ============================================

describe('ai-slice reducer', () => {
  // ------------------------------------------
  // 1. Initial state
  // ------------------------------------------
  describe('initial state', () => {
    it('should return the correct initial state when called with undefined', () => {
      const state = reducer(undefined, { type: '@@INIT' });
      expect(state).toEqual(INITIAL_STATE);
    });

    it('should have the expected shape', () => {
      const state = reducer(undefined, { type: '@@INIT' });

      expect(state).toHaveProperty('status', 'idle');
      expect(state).toHaveProperty('isConnected', false);
      expect(state).toHaveProperty('messages');
      expect(Array.isArray(state.messages)).toBe(true);
      expect(state.messages).toHaveLength(0);
      expect(state).toHaveProperty('streamingContent', '');
      expect(state).toHaveProperty('streamingMessageId', null);
      expect(state).toHaveProperty('suggestions');
      expect(Array.isArray(state.suggestions)).toBe(true);
      expect(state).toHaveProperty('pendingTransaction', null);
      expect(state).toHaveProperty('pendingBlik', null);
      expect(state).toHaveProperty('pendingSwap', null);
      expect(state).toHaveProperty('error', null);
      expect(state).toHaveProperty('errorCode', null);
      expect(state).toHaveProperty('rateLimit', null);
    });
  });

  // ------------------------------------------
  // 2. Connection lifecycle
  // ------------------------------------------
  describe('connection lifecycle', () => {
    it('connecting: should set status to "connecting" and clear errors', () => {
      const prev: AiState = {
        ...INITIAL_STATE,
        status: 'error',
        error: 'old error',
        errorCode: 'OLD_CODE',
      };
      const state = reducer(prev, connecting());

      expect(state.status).toBe('connecting');
      expect(state.error).toBeNull();
      expect(state.errorCode).toBeNull();
    });

    it('connected: should set status to "connected", isConnected true, and clear errors', () => {
      const prev: AiState = {
        ...INITIAL_STATE,
        status: 'connecting',
        error: 'old error',
        errorCode: 'OLD_CODE',
      };
      const state = reducer(prev, connected());

      expect(state.status).toBe('connected');
      expect(state.isConnected).toBe(true);
      expect(state.error).toBeNull();
      expect(state.errorCode).toBeNull();
    });

    it('disconnected: should set status to "idle" and isConnected false', () => {
      const prev: AiState = {
        ...INITIAL_STATE,
        status: 'connected',
        isConnected: true,
      };
      const state = reducer(prev, disconnected());

      expect(state.status).toBe('idle');
      expect(state.isConnected).toBe(false);
    });

    it('full cycle: idle -> connecting -> connected -> disconnected', () => {
      let state = reducer(undefined, { type: '@@INIT' });
      expect(state.status).toBe('idle');
      expect(state.isConnected).toBe(false);

      state = reducer(state, connecting());
      expect(state.status).toBe('connecting');
      expect(state.isConnected).toBe(false);

      state = reducer(state, connected());
      expect(state.status).toBe('connected');
      expect(state.isConnected).toBe(true);

      state = reducer(state, disconnected());
      expect(state.status).toBe('idle');
      expect(state.isConnected).toBe(false);
    });
  });

  // ------------------------------------------
  // 3. Message flow
  // ------------------------------------------
  describe('message flow', () => {
    describe('sendMessage', () => {
      it('should add a user message and set status to "sending"', () => {
        const prev: AiState = { ...INITIAL_STATE, status: 'connected', isConnected: true };
        const state = reducer(prev, sendMessage('Hi there'));

        expect(state.status).toBe('sending');
        expect(state.messages).toHaveLength(1);
        expect(state.messages[0].role).toBe('user');
        expect(state.messages[0].content).toBe('Hi there');
        expect(state.messages[0].id).toMatch(/^msg_/);
        expect(state.messages[0].timestamp).toBeDefined();
      });

      it('should clear previous errors', () => {
        const prev: AiState = {
          ...INITIAL_STATE,
          status: 'connected',
          isConnected: true,
          error: 'previous error',
          errorCode: 'PREV_CODE',
        };
        const state = reducer(prev, sendMessage('retry'));

        expect(state.error).toBeNull();
        expect(state.errorCode).toBeNull();
      });

      it('should prepare streaming state', () => {
        const prev: AiState = { ...INITIAL_STATE, status: 'connected' };
        const state = reducer(prev, sendMessage('question'));

        expect(state.streamingContent).toBe('');
        expect(state.streamingMessageId).toMatch(/^msg_/);
      });

      it('should reset old streaming content when sending a new message', () => {
        const prev: AiState = {
          ...INITIAL_STATE,
          status: 'connected',
          streamingContent: 'leftover data',
          streamingMessageId: 'msg_old',
        };
        const state = reducer(prev, sendMessage('new message'));

        expect(state.streamingContent).toBe('');
        expect(state.streamingMessageId).not.toBe('msg_old');
      });
    });

    describe('receiveChunk', () => {
      it('should set status to "streaming" and append content', () => {
        const prev: AiState = {
          ...INITIAL_STATE,
          status: 'sending',
          streamingContent: '',
          streamingMessageId: 'msg_abc',
        };
        const state = reducer(prev, receiveChunk({ content: 'Hello', index: 0 }));

        expect(state.status).toBe('streaming');
        expect(state.streamingContent).toBe('Hello');
      });

      it('should accumulate multiple chunks', () => {
        let state: AiState = {
          ...INITIAL_STATE,
          status: 'sending',
          streamingContent: '',
          streamingMessageId: 'msg_abc',
        };

        state = reducer(state, receiveChunk({ content: 'The ', index: 0 }));
        state = reducer(state, receiveChunk({ content: 'answer ', index: 1 }));
        state = reducer(state, receiveChunk({ content: 'is 42.', index: 2 }));

        expect(state.streamingContent).toBe('The answer is 42.');
        expect(state.status).toBe('streaming');
      });
    });

    describe('streamingComplete', () => {
      it('should finalize the assistant message and reset streaming state', () => {
        const prev: AiState = {
          ...INITIAL_STATE,
          status: 'streaming',
          streamingContent: 'accumulated content',
          streamingMessageId: 'msg_stream_001',
          isConnected: true,
        };

        const state = reducer(
          prev,
          streamingComplete({ content: 'Final response text' }),
        );

        expect(state.status).toBe('connected');
        expect(state.streamingContent).toBe('');
        expect(state.streamingMessageId).toBeNull();
        expect(state.messages).toHaveLength(1);
        expect(state.messages[0]).toMatchObject({
          id: 'msg_stream_001',
          role: 'assistant',
          content: 'Final response text',
        });
        expect(state.messages[0].timestamp).toBeDefined();
      });

      it('should include toolCalls and toolResults when provided', () => {
        const prev: AiState = {
          ...INITIAL_STATE,
          status: 'streaming',
          streamingContent: 'stuff',
          streamingMessageId: 'msg_stream_002',
        };

        const toolCalls = [{ name: 'get_balance', arguments: { token: 'ETH' } }];
        const toolResults = [{ name: 'get_balance', result: { success: true, data: '1.5' } }];

        const state = reducer(
          prev,
          streamingComplete({ content: 'Your balance is 1.5 ETH', toolCalls, toolResults }),
        );

        expect(state.messages[0].toolCalls).toEqual(toolCalls);
        expect(state.messages[0].toolResults).toEqual(toolResults);
      });

      it('should not add a message when streamingMessageId is null', () => {
        const prev: AiState = {
          ...INITIAL_STATE,
          status: 'streaming',
          streamingContent: 'orphan',
          streamingMessageId: null,
        };

        const state = reducer(prev, streamingComplete({ content: 'nothing' }));

        expect(state.messages).toHaveLength(0);
        expect(state.status).toBe('connected');
        expect(state.streamingContent).toBe('');
      });
    });

    describe('full message round-trip', () => {
      it('sendMessage -> receiveChunk(s) -> streamingComplete', () => {
        let state: AiState = { ...INITIAL_STATE, status: 'connected', isConnected: true };

        // User sends a message
        state = reducer(state, sendMessage('What is the weather?'));
        expect(state.status).toBe('sending');
        expect(state.messages).toHaveLength(1);
        expect(state.messages[0].role).toBe('user');
        const streamingId = state.streamingMessageId;
        expect(streamingId).toBeTruthy();

        // Receive chunks
        state = reducer(state, receiveChunk({ content: 'It is ', index: 0 }));
        expect(state.status).toBe('streaming');
        state = reducer(state, receiveChunk({ content: 'sunny today.', index: 1 }));
        expect(state.streamingContent).toBe('It is sunny today.');

        // Stream completes
        state = reducer(state, streamingComplete({ content: 'It is sunny today.' }));
        expect(state.status).toBe('connected');
        expect(state.messages).toHaveLength(2);
        expect(state.messages[1].role).toBe('assistant');
        expect(state.messages[1].content).toBe('It is sunny today.');
        expect(state.messages[1].id).toBe(streamingId);
        expect(state.streamingContent).toBe('');
        expect(state.streamingMessageId).toBeNull();
      });
    });

    describe('addMessage', () => {
      it('should add a complete message to the array', () => {
        const msg = makeChatMessage({ id: 'msg_direct', content: 'Direct add' });
        const state = reducer(INITIAL_STATE, addMessage(msg));

        expect(state.messages).toHaveLength(1);
        expect(state.messages[0]).toEqual(msg);
      });

      it('should append to existing messages', () => {
        const prev: AiState = {
          ...INITIAL_STATE,
          messages: [makeChatMessage({ id: 'msg_1' })],
        };
        const state = reducer(prev, addMessage(makeChatMessage({ id: 'msg_2', content: 'Second' })));

        expect(state.messages).toHaveLength(2);
        expect(state.messages[1].id).toBe('msg_2');
      });
    });

    describe('clearMessages', () => {
      it('should clear all messages and streaming state', () => {
        const prev: AiState = {
          ...INITIAL_STATE,
          messages: [makeChatMessage(), makeChatMessage({ id: 'msg_2' })],
          streamingContent: 'partial',
          streamingMessageId: 'msg_stream',
        };

        const state = reducer(prev, clearMessages());

        expect(state.messages).toHaveLength(0);
        expect(state.streamingContent).toBe('');
        expect(state.streamingMessageId).toBeNull();
      });

      it('should not affect other state properties', () => {
        const prev: AiState = {
          ...INITIAL_STATE,
          status: 'connected',
          isConnected: true,
          messages: [makeChatMessage()],
          pendingTransaction: makeTransactionPreview(),
        };

        const state = reducer(prev, clearMessages());

        expect(state.status).toBe('connected');
        expect(state.isConnected).toBe(true);
        expect(state.pendingTransaction).toBeTruthy();
      });
    });
  });

  // ------------------------------------------
  // 4. Pending transaction
  // ------------------------------------------
  describe('pending transaction', () => {
    it('setPendingTransaction: should store a transaction preview', () => {
      const tx = makeTransactionPreview();
      const state = reducer(INITIAL_STATE, setPendingTransaction(tx));

      expect(state.pendingTransaction).toEqual(tx);
    });

    it('setPendingTransaction(null): should clear the transaction', () => {
      const prev: AiState = {
        ...INITIAL_STATE,
        pendingTransaction: makeTransactionPreview(),
      };
      const state = reducer(prev, setPendingTransaction(null));

      expect(state.pendingTransaction).toBeNull();
    });

    it('clearPendingTransaction: should set pendingTransaction to null', () => {
      const prev: AiState = {
        ...INITIAL_STATE,
        pendingTransaction: makeTransactionPreview(),
      };
      const state = reducer(prev, clearPendingTransaction());

      expect(state.pendingTransaction).toBeNull();
    });

    it('should replace an existing pending transaction', () => {
      const prev: AiState = {
        ...INITIAL_STATE,
        pendingTransaction: makeTransactionPreview({ id: 'tx_old' }),
      };
      const newTx = makeTransactionPreview({ id: 'tx_new', amount: '5.0' });
      const state = reducer(prev, setPendingTransaction(newTx));

      expect(state.pendingTransaction).toEqual(newTx);
      expect(state.pendingTransaction!.id).toBe('tx_new');
    });
  });

  // ------------------------------------------
  // 5. Pending BLIK
  // ------------------------------------------
  describe('pending BLIK', () => {
    it('setPendingBlik: should store a BLIK preview', () => {
      const blik = makeBlikPreview();
      const state = reducer(INITIAL_STATE, setPendingBlik(blik));

      expect(state.pendingBlik).toEqual(blik);
    });

    it('setPendingBlik(null): should clear the BLIK', () => {
      const prev: AiState = {
        ...INITIAL_STATE,
        pendingBlik: makeBlikPreview(),
      };
      const state = reducer(prev, setPendingBlik(null));

      expect(state.pendingBlik).toBeNull();
    });

    it('clearPendingBlik: should set pendingBlik to null', () => {
      const prev: AiState = {
        ...INITIAL_STATE,
        pendingBlik: makeBlikPreview(),
      };
      const state = reducer(prev, clearPendingBlik());

      expect(state.pendingBlik).toBeNull();
    });

    it('should support BlikPayPreview variant', () => {
      const blikPay = {
        type: 'pay' as const,
        id: 'blik_pay_001',
        code: '654321',
        receiverAddress: '0xCCC',
        receiverUsername: 'alice',
        amount: '25',
        token: 'USDC',
        amountUsd: '25.00',
        estimatedGas: '0.001',
        estimatedGasUsd: '2.00',
        network: 'polygon',
        status: 'pending_confirmation' as const,
      };
      const state = reducer(INITIAL_STATE, setPendingBlik(blikPay));

      expect(state.pendingBlik).toEqual(blikPay);
      expect(state.pendingBlik!.type).toBe('pay');
    });
  });

  // ------------------------------------------
  // 6. Pending swap
  // ------------------------------------------
  describe('pending swap', () => {
    it('setPendingSwap: should store a swap preview', () => {
      const swap = makeSwapPreview();
      const state = reducer(INITIAL_STATE, setPendingSwap(swap));

      expect(state.pendingSwap).toEqual(swap);
    });

    it('setPendingSwap(null): should clear the swap', () => {
      const prev: AiState = {
        ...INITIAL_STATE,
        pendingSwap: makeSwapPreview(),
      };
      const state = reducer(prev, setPendingSwap(null));

      expect(state.pendingSwap).toBeNull();
    });

    it('clearPendingSwap: should set pendingSwap to null', () => {
      const prev: AiState = {
        ...INITIAL_STATE,
        pendingSwap: makeSwapPreview(),
      };
      const state = reducer(prev, clearPendingSwap());

      expect(state.pendingSwap).toBeNull();
    });

    it('should replace an existing pending swap', () => {
      const prev: AiState = {
        ...INITIAL_STATE,
        pendingSwap: makeSwapPreview({ id: 'swap_old' }),
      };
      const newSwap = makeSwapPreview({ id: 'swap_new' });
      const state = reducer(prev, setPendingSwap(newSwap));

      expect(state.pendingSwap!.id).toBe('swap_new');
    });
  });

  // ------------------------------------------
  // 7. Suggestions
  // ------------------------------------------
  describe('suggestions', () => {
    describe('addSuggestion', () => {
      it('should add a suggestion to the front of the array', () => {
        const sug = makeSuggestion();
        const state = reducer(INITIAL_STATE, addSuggestion(sug));

        expect(state.suggestions).toHaveLength(1);
        expect(state.suggestions[0]).toEqual(sug);
      });

      it('should prepend (unshift) new suggestions', () => {
        const prev: AiState = {
          ...INITIAL_STATE,
          suggestions: [makeSuggestion({ id: 'sug_existing' })],
        };
        const newSug = makeSuggestion({ id: 'sug_new', title: 'New one' });
        const state = reducer(prev, addSuggestion(newSug));

        expect(state.suggestions).toHaveLength(2);
        expect(state.suggestions[0].id).toBe('sug_new');
        expect(state.suggestions[1].id).toBe('sug_existing');
      });

      it('should deduplicate by id', () => {
        const prev: AiState = {
          ...INITIAL_STATE,
          suggestions: [makeSuggestion({ id: 'sug_dup' })],
        };
        const duplicate = makeSuggestion({ id: 'sug_dup', title: 'Updated title' });
        const state = reducer(prev, addSuggestion(duplicate));

        expect(state.suggestions).toHaveLength(1);
        // The original remains unchanged because the duplicate is ignored
        expect(state.suggestions[0].title).toBe('Save more');
      });

      it('should cap suggestions at 10', () => {
        const suggestions = Array.from({ length: 10 }, (_, i) =>
          makeSuggestion({ id: `sug_${i}` }),
        );
        const prev: AiState = { ...INITIAL_STATE, suggestions };

        // Adding an 11th suggestion should keep the array at 10
        const eleventh = makeSuggestion({ id: 'sug_11', title: 'Eleventh' });
        const state = reducer(prev, addSuggestion(eleventh));

        expect(state.suggestions).toHaveLength(10);
        // The new one is at the front
        expect(state.suggestions[0].id).toBe('sug_11');
        // The oldest (last) one is removed
        expect(state.suggestions.map((s) => s.id)).not.toContain('sug_9');
      });

      it('should not exceed 10 even when adding rapidly', () => {
        let state: AiState = { ...INITIAL_STATE };

        for (let i = 0; i < 15; i++) {
          state = reducer(state, addSuggestion(makeSuggestion({ id: `sug_${i}` })));
        }

        expect(state.suggestions.length).toBeLessThanOrEqual(10);
      });
    });

    describe('dismissSuggestion', () => {
      it('should remove a suggestion by id', () => {
        const prev: AiState = {
          ...INITIAL_STATE,
          suggestions: [
            makeSuggestion({ id: 'sug_a' }),
            makeSuggestion({ id: 'sug_b' }),
            makeSuggestion({ id: 'sug_c' }),
          ],
        };
        const state = reducer(prev, dismissSuggestion('sug_b'));

        expect(state.suggestions).toHaveLength(2);
        expect(state.suggestions.map((s) => s.id)).toEqual(['sug_a', 'sug_c']);
      });

      it('should do nothing when id does not exist', () => {
        const prev: AiState = {
          ...INITIAL_STATE,
          suggestions: [makeSuggestion({ id: 'sug_a' })],
        };
        const state = reducer(prev, dismissSuggestion('nonexistent'));

        expect(state.suggestions).toHaveLength(1);
      });
    });

    describe('clearSuggestions', () => {
      it('should remove all suggestions', () => {
        const prev: AiState = {
          ...INITIAL_STATE,
          suggestions: [
            makeSuggestion({ id: 'sug_1' }),
            makeSuggestion({ id: 'sug_2' }),
          ],
        };
        const state = reducer(prev, clearSuggestions());

        expect(state.suggestions).toHaveLength(0);
      });
    });
  });

  // ------------------------------------------
  // 8. Error handling
  // ------------------------------------------
  describe('error handling', () => {
    describe('setError', () => {
      it('should set error status, message, and code', () => {
        const prev: AiState = { ...INITIAL_STATE, status: 'connected', isConnected: true };
        const state = reducer(
          prev,
          setError({ message: 'Something went wrong', code: 'AI_TIMEOUT' }),
        );

        expect(state.status).toBe('error');
        expect(state.error).toBe('Something went wrong');
        expect(state.errorCode).toBe('AI_TIMEOUT');
      });

      it('should default errorCode to null when code is not provided', () => {
        const state = reducer(
          INITIAL_STATE,
          setError({ message: 'Unknown error' }),
        );

        expect(state.error).toBe('Unknown error');
        expect(state.errorCode).toBeNull();
      });

      it('should store rate limit info when provided', () => {
        const rateLimit = { remaining: 0, resetIn: 60, limit: 50 };
        const state = reducer(
          INITIAL_STATE,
          setError({ message: 'Rate limited', code: 'RATE_LIMIT', rateLimit }),
        );

        expect(state.rateLimit).toEqual(rateLimit);
      });

      it('should not overwrite rateLimit when not provided in the payload', () => {
        const prev: AiState = {
          ...INITIAL_STATE,
          rateLimit: { remaining: 5, resetIn: 30, limit: 50 },
        };
        const state = reducer(
          prev,
          setError({ message: 'Another error' }),
        );

        // rateLimit is preserved because the action did not include a new one
        expect(state.rateLimit).toEqual({ remaining: 5, resetIn: 30, limit: 50 });
      });

      it('should clear streaming state on error', () => {
        const prev: AiState = {
          ...INITIAL_STATE,
          status: 'streaming',
          streamingContent: 'partial data...',
          streamingMessageId: 'msg_in_progress',
        };
        const state = reducer(
          prev,
          setError({ message: 'Stream interrupted' }),
        );

        expect(state.streamingContent).toBe('');
        expect(state.streamingMessageId).toBeNull();
        expect(state.status).toBe('error');
      });

      it('should clear streaming state even when coming from sending status', () => {
        const prev: AiState = {
          ...INITIAL_STATE,
          status: 'sending',
          streamingContent: '',
          streamingMessageId: 'msg_pending',
        };
        const state = reducer(
          prev,
          setError({ message: 'Send failed' }),
        );

        expect(state.streamingMessageId).toBeNull();
        expect(state.status).toBe('error');
      });
    });

    describe('clearError', () => {
      it('should clear error and errorCode', () => {
        const prev: AiState = {
          ...INITIAL_STATE,
          status: 'error',
          error: 'bad thing',
          errorCode: 'BAD_THING',
        };
        const state = reducer(prev, clearError());

        expect(state.error).toBeNull();
        expect(state.errorCode).toBeNull();
      });

      it('should restore status to "connected" when isConnected is true', () => {
        const prev: AiState = {
          ...INITIAL_STATE,
          status: 'error',
          isConnected: true,
          error: 'transient error',
          errorCode: 'TRANSIENT',
        };
        const state = reducer(prev, clearError());

        expect(state.status).toBe('connected');
      });

      it('should restore status to "idle" when isConnected is false', () => {
        const prev: AiState = {
          ...INITIAL_STATE,
          status: 'error',
          isConnected: false,
          error: 'connection error',
        };
        const state = reducer(prev, clearError());

        expect(state.status).toBe('idle');
      });

      it('should not change status if not currently in "error" state', () => {
        const prev: AiState = {
          ...INITIAL_STATE,
          status: 'connected',
          isConnected: true,
          error: 'stale error from somewhere',
          errorCode: 'STALE',
        };
        const state = reducer(prev, clearError());

        expect(state.error).toBeNull();
        expect(state.errorCode).toBeNull();
        expect(state.status).toBe('connected');
      });
    });

    describe('error -> recovery cycle', () => {
      it('should handle error during streaming and recover cleanly', () => {
        // Start connected
        let state: AiState = { ...INITIAL_STATE, status: 'connected', isConnected: true };

        // Send a message
        state = reducer(state, sendMessage('Tell me a story'));
        expect(state.status).toBe('sending');

        // Start receiving chunks
        state = reducer(state, receiveChunk({ content: 'Once upon', index: 0 }));
        expect(state.status).toBe('streaming');
        expect(state.streamingContent).toBe('Once upon');

        // Error occurs mid-stream
        state = reducer(state, setError({ message: 'Connection lost', code: 'DISCONNECT' }));
        expect(state.status).toBe('error');
        expect(state.streamingContent).toBe('');
        expect(state.streamingMessageId).toBeNull();

        // User clears the error
        state = reducer(state, clearError());
        expect(state.status).toBe('connected');
        expect(state.error).toBeNull();

        // Can send another message cleanly
        state = reducer(state, sendMessage('Try again'));
        expect(state.status).toBe('sending');
        expect(state.messages).toHaveLength(2); // First user msg + retry
      });
    });
  });

  // ------------------------------------------
  // 9. resetAi
  // ------------------------------------------
  describe('resetAi', () => {
    it('should return to initial state from a heavily modified state', () => {
      const dirty: AiState = {
        status: 'streaming',
        isConnected: true,
        messages: [
          makeChatMessage({ id: 'msg_1' }),
          makeChatMessage({ id: 'msg_2', role: 'assistant', content: 'Response' }),
        ],
        streamingContent: 'partial stream...',
        streamingMessageId: 'msg_stream_active',
        suggestions: [makeSuggestion({ id: 'sug_a' }), makeSuggestion({ id: 'sug_b' })],
        pendingTransaction: makeTransactionPreview(),
        pendingBlik: makeBlikPreview(),
        pendingSwap: makeSwapPreview(),
        pendingUsername: null,
        error: 'Something broke',
        errorCode: 'BROKEN',
        rateLimit: { remaining: 0, resetIn: 120, limit: 50 },
      };

      const state = reducer(dirty, resetAi());
      expect(state).toEqual(INITIAL_STATE);
    });

    it('should be idempotent on initial state', () => {
      const state = reducer(INITIAL_STATE, resetAi());
      expect(state).toEqual(INITIAL_STATE);
    });

    it('should produce a state that is independent from the previous state object', () => {
      const prev: AiState = {
        ...INITIAL_STATE,
        messages: [makeChatMessage()],
        suggestions: [makeSuggestion()],
      };

      const state = reducer(prev, resetAi());

      // Mutating the old state should not affect the reset state
      prev.messages.push(makeChatMessage({ id: 'msg_mutated' }));
      expect(state.messages).toHaveLength(0);
    });
  });

  // ------------------------------------------
  // Cross-cutting: immutability check
  // ------------------------------------------
  describe('immutability', () => {
    it('should not mutate the previous state object', () => {
      const prev: AiState = { ...INITIAL_STATE, status: 'connected', isConnected: true };
      const frozenPrev = { ...prev };

      reducer(prev, sendMessage('test'));

      // The original reference values should remain unchanged
      expect(prev.status).toBe(frozenPrev.status);
      expect(prev.messages).toEqual(frozenPrev.messages);
      expect(prev.streamingContent).toBe(frozenPrev.streamingContent);
    });
  });

  // ------------------------------------------
  // Edge cases
  // ------------------------------------------
  describe('edge cases', () => {
    it('should handle empty string in sendMessage', () => {
      const state = reducer(INITIAL_STATE, sendMessage(''));

      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].content).toBe('');
      expect(state.status).toBe('sending');
    });

    it('should handle empty chunk content', () => {
      const prev: AiState = {
        ...INITIAL_STATE,
        status: 'sending',
        streamingContent: 'existing',
        streamingMessageId: 'msg_x',
      };
      const state = reducer(prev, receiveChunk({ content: '', index: 0 }));

      expect(state.streamingContent).toBe('existing');
      expect(state.status).toBe('streaming');
    });

    it('should handle streamingComplete with empty content', () => {
      const prev: AiState = {
        ...INITIAL_STATE,
        status: 'streaming',
        streamingMessageId: 'msg_y',
      };
      const state = reducer(prev, streamingComplete({ content: '' }));

      expect(state.messages).toHaveLength(1);
      expect(state.messages[0].content).toBe('');
      expect(state.status).toBe('connected');
    });

    it('should handle unknown action types gracefully', () => {
      const state = reducer(INITIAL_STATE, { type: 'UNKNOWN_ACTION' });
      expect(state).toEqual(INITIAL_STATE);
    });
  });
});
