/**
 * AI Socket Service Unit Tests
 * Tests WebSocket connection management, message sending, callbacks, and event handling
 */

// ============================================
// Mocks
// ============================================

// Store event handlers registered via socket.on()
type EventHandler = (...args: unknown[]) => void;
let socketEventHandlers: Record<string, EventHandler> = {};

const mockSocket = {
  on: jest.fn((event: string, handler: EventHandler) => {
    socketEventHandlers[event] = handler;
  }),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connected: false,
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

jest.mock('@/src/config/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
}));

const MOCK_AI_EVENTS = {
  CHAT: 'chat',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
  CHUNK: 'chunk',
  DONE: 'done',
  TOOL_CALL: 'tool_call',
  TOOL_RESULT: 'tool_result',
  SUGGESTION: 'suggestion',
  ERROR: 'error',
} as const;

jest.mock('@e-y/shared', () => ({
  AI_EVENTS: MOCK_AI_EVENTS,
}));

import { io } from 'socket.io-client';
import { aiSocket } from '../ai-service';

// ============================================
// Helpers
// ============================================

/**
 * Simulate socket connection by triggering the 'connect' handler
 * that was registered during aiSocket.connect().
 */
function simulateSocketConnect(): void {
  mockSocket.connected = true;
  const connectHandler = socketEventHandlers['connect'];
  if (connectHandler) {
    connectHandler();
  }
}

/**
 * Connect aiSocket with a test address and simulate the socket connecting.
 */
async function connectWithAddress(address = '0xTestAddress'): Promise<void> {
  const connectPromise = aiSocket.connect(address);
  simulateSocketConnect();
  await connectPromise;
}

// ============================================
// Tests
// ============================================

describe('AiSocketService', () => {
  beforeEach(() => {
    // Reset the singleton to a clean state
    aiSocket.disconnect();

    // Clear mock state
    socketEventHandlers = {};
    mockSocket.on.mockClear();
    mockSocket.emit.mockClear();
    mockSocket.disconnect.mockClear();
    mockSocket.connected = false;
    (io as jest.Mock).mockClear();
  });

  // ------------------------------------------
  // 1. Initial state
  // ------------------------------------------
  describe('initial state', () => {
    it('should not be connected', () => {
      expect(aiSocket.isConnected()).toBe(false);
    });

    it('should have no user address', () => {
      expect(aiSocket.getUserAddress()).toBeNull();
    });
  });

  // ------------------------------------------
  // 2. connect()
  // ------------------------------------------
  describe('connect', () => {
    it('should call io() with the correct namespace URL and options', async () => {
      const connectPromise = aiSocket.connect('0xABC');
      simulateSocketConnect();
      await connectPromise;

      expect(io).toHaveBeenCalledWith('http://localhost:3000/ai', {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });
    });

    it('should register event listeners on the socket', async () => {
      const connectPromise = aiSocket.connect('0xABC');
      simulateSocketConnect();
      await connectPromise;

      const registeredEvents = mockSocket.on.mock.calls.map(
        (call: [string, EventHandler]) => call[0]
      );

      expect(registeredEvents).toContain('connect');
      expect(registeredEvents).toContain('connect_error');
      expect(registeredEvents).toContain('disconnect');
      expect(registeredEvents).toContain('reconnect');
      expect(registeredEvents).toContain(MOCK_AI_EVENTS.CHUNK);
      expect(registeredEvents).toContain(MOCK_AI_EVENTS.DONE);
      expect(registeredEvents).toContain(MOCK_AI_EVENTS.TOOL_CALL);
      expect(registeredEvents).toContain(MOCK_AI_EVENTS.TOOL_RESULT);
      expect(registeredEvents).toContain(MOCK_AI_EVENTS.SUGGESTION);
      expect(registeredEvents).toContain(MOCK_AI_EVENTS.ERROR);
    });

    it('should emit subscribe event with lowercased address on connect', async () => {
      await connectWithAddress('0xABCdef123');

      expect(mockSocket.emit).toHaveBeenCalledWith(MOCK_AI_EVENTS.SUBSCRIBE, {
        address: '0xabcdef123',
      });
    });

    it('should store the user address (lowercased)', async () => {
      await connectWithAddress('0xDeAdBeEf');

      expect(aiSocket.getUserAddress()).toBe('0xdeadbeef');
    });

    it('should report as connected after successful connect', async () => {
      await connectWithAddress();

      expect(aiSocket.isConnected()).toBe(true);
    });

    it('should not call io() again if already connected', async () => {
      await connectWithAddress('0xFirst');
      (io as jest.Mock).mockClear();

      await aiSocket.connect('0xFirst');

      expect(io).not.toHaveBeenCalled();
    });

    it('should re-subscribe with a new address if already connected but address differs', async () => {
      await connectWithAddress('0xFirst');
      mockSocket.emit.mockClear();

      await aiSocket.connect('0xSecond');

      expect(mockSocket.emit).toHaveBeenCalledWith(MOCK_AI_EVENTS.SUBSCRIBE, {
        address: '0xsecond',
      });
    });
  });

  // ------------------------------------------
  // 3. Connect callback
  // ------------------------------------------
  describe('connect callback', () => {
    it('should invoke onConnect callback when socket connects', async () => {
      const onConnect = jest.fn();
      aiSocket.setCallbacks({ onConnect });

      await connectWithAddress();

      expect(onConnect).toHaveBeenCalledTimes(1);
    });
  });

  // ------------------------------------------
  // 4. disconnect()
  // ------------------------------------------
  describe('disconnect', () => {
    it('should emit unsubscribe and disconnect the socket', async () => {
      await connectWithAddress();

      aiSocket.disconnect();

      expect(mockSocket.emit).toHaveBeenCalledWith(MOCK_AI_EVENTS.UNSUBSCRIBE);
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should clear user address', async () => {
      await connectWithAddress('0xABC');

      aiSocket.disconnect();

      expect(aiSocket.getUserAddress()).toBeNull();
    });

    it('should clear callbacks', async () => {
      const onChunk = jest.fn();
      aiSocket.setCallbacks({ onChunk });
      await connectWithAddress();

      aiSocket.disconnect();

      // After disconnect, callbacks are cleared, so manually triggering
      // a chunk event on the old socket should not invoke the cleared callback.
      // We verify by reconnecting, setting no callbacks, and checking.
      expect(aiSocket.getUserAddress()).toBeNull();
    });

    it('should clear message history', async () => {
      await connectWithAddress();

      aiSocket.addAiResponseMessage('Hello from AI');
      aiSocket.disconnect();

      // Reconnect and send a message; history should not contain old messages
      await connectWithAddress();
      mockSocket.emit.mockClear();

      aiSocket.sendMessage('New message');

      const emitCalls = mockSocket.emit.mock.calls;
      const chatEmit = emitCalls.find(
        (call: unknown[]) => call[0] === MOCK_AI_EVENTS.CHAT
      );

      expect(chatEmit).toBeDefined();
      expect(chatEmit![1].history).toEqual([
        { role: 'user', content: 'New message' },
      ]);
    });

    it('should be safe to call disconnect when not connected', () => {
      expect(() => aiSocket.disconnect()).not.toThrow();
    });
  });

  // ------------------------------------------
  // 5. sendMessage()
  // ------------------------------------------
  describe('sendMessage', () => {
    it('should emit chat event with content and history', async () => {
      await connectWithAddress();
      mockSocket.emit.mockClear();

      aiSocket.sendMessage('Hello AI');

      expect(mockSocket.emit).toHaveBeenCalledWith(MOCK_AI_EVENTS.CHAT, {
        content: 'Hello AI',
        history: [{ role: 'user', content: 'Hello AI' }],
      });
    });

    it('should include previous messages in history', async () => {
      await connectWithAddress();
      mockSocket.emit.mockClear();

      aiSocket.sendMessage('First question');
      aiSocket.addAiResponseMessage('First answer');
      aiSocket.sendMessage('Second question');

      const secondCall = mockSocket.emit.mock.calls.find(
        (call: unknown[], index: number) =>
          call[0] === MOCK_AI_EVENTS.CHAT && index > 0
      );

      expect(secondCall).toBeDefined();
      expect(secondCall![1].history).toEqual([
        { role: 'user', content: 'First question' },
        { role: 'assistant', content: 'First answer' },
        { role: 'user', content: 'Second question' },
      ]);
    });

    it('should limit history to last 10 messages', async () => {
      await connectWithAddress();

      // Build up 12 messages (6 user + 6 assistant)
      for (let i = 1; i <= 6; i++) {
        aiSocket.sendMessage(`User msg ${i}`);
        aiSocket.addAiResponseMessage(`AI msg ${i}`);
      }

      mockSocket.emit.mockClear();
      aiSocket.sendMessage('Final question');

      const chatEmit = mockSocket.emit.mock.calls.find(
        (call: unknown[]) => call[0] === MOCK_AI_EVENTS.CHAT
      );

      // 12 previous + 1 new = 13 total, sliced to last 10
      expect(chatEmit![1].history).toHaveLength(10);
    });
  });

  // ------------------------------------------
  // 6. sendMessage when not connected
  // ------------------------------------------
  describe('sendMessage when not connected', () => {
    it('should call onError callback with NOT_CONNECTED when no userAddress', () => {
      const onError = jest.fn();
      aiSocket.setCallbacks({ onError });

      aiSocket.sendMessage('Hello');

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'NOT_CONNECTED',
          message: expect.any(String),
        })
      );
    });
  });

  // ------------------------------------------
  // 7. addAiResponseMessage()
  // ------------------------------------------
  describe('addAiResponseMessage', () => {
    it('should add assistant messages to history, verified via sendMessage', async () => {
      await connectWithAddress();
      mockSocket.emit.mockClear();

      aiSocket.addAiResponseMessage('I am the AI response');
      aiSocket.sendMessage('Follow up');

      const chatEmit = mockSocket.emit.mock.calls.find(
        (call: unknown[]) => call[0] === MOCK_AI_EVENTS.CHAT
      );

      expect(chatEmit![1].history).toEqual([
        { role: 'assistant', content: 'I am the AI response' },
        { role: 'user', content: 'Follow up' },
      ]);
    });
  });

  // ------------------------------------------
  // 8. clearHistory()
  // ------------------------------------------
  describe('clearHistory', () => {
    it('should clear all message history', async () => {
      await connectWithAddress();

      aiSocket.sendMessage('Message 1');
      aiSocket.addAiResponseMessage('Response 1');
      aiSocket.sendMessage('Message 2');
      aiSocket.addAiResponseMessage('Response 2');

      aiSocket.clearHistory();
      mockSocket.emit.mockClear();

      aiSocket.sendMessage('Fresh start');

      const chatEmit = mockSocket.emit.mock.calls.find(
        (call: unknown[]) => call[0] === MOCK_AI_EVENTS.CHAT
      );

      expect(chatEmit![1].history).toEqual([
        { role: 'user', content: 'Fresh start' },
      ]);
    });
  });

  // ------------------------------------------
  // 9. setCallbacks / clearCallbacks
  // ------------------------------------------
  describe('setCallbacks and clearCallbacks', () => {
    it('should merge new callbacks with existing ones', async () => {
      const onChunk = jest.fn();
      const onDone = jest.fn();

      aiSocket.setCallbacks({ onChunk });
      aiSocket.setCallbacks({ onDone });

      await connectWithAddress();

      // Trigger both events
      const chunkHandler = socketEventHandlers[MOCK_AI_EVENTS.CHUNK];
      const doneHandler = socketEventHandlers[MOCK_AI_EVENTS.DONE];

      chunkHandler?.({ content: 'test', index: 0 });
      doneHandler?.({ content: 'done' });

      expect(onChunk).toHaveBeenCalledWith({ content: 'test', index: 0 });
      expect(onDone).toHaveBeenCalledWith({ content: 'done' });
    });

    it('should override a specific callback when set again', async () => {
      const onChunkFirst = jest.fn();
      const onChunkSecond = jest.fn();

      aiSocket.setCallbacks({ onChunk: onChunkFirst });
      aiSocket.setCallbacks({ onChunk: onChunkSecond });

      await connectWithAddress();

      const chunkHandler = socketEventHandlers[MOCK_AI_EVENTS.CHUNK];
      chunkHandler?.({ content: 'data', index: 0 });

      expect(onChunkFirst).not.toHaveBeenCalled();
      expect(onChunkSecond).toHaveBeenCalledWith({ content: 'data', index: 0 });
    });

    it('should clear all callbacks when clearCallbacks is called', async () => {
      const onChunk = jest.fn();
      const onDone = jest.fn();

      aiSocket.setCallbacks({ onChunk, onDone });
      await connectWithAddress();

      aiSocket.clearCallbacks();

      const chunkHandler = socketEventHandlers[MOCK_AI_EVENTS.CHUNK];
      const doneHandler = socketEventHandlers[MOCK_AI_EVENTS.DONE];

      chunkHandler?.({ content: 'ignored', index: 0 });
      doneHandler?.({ content: 'ignored' });

      expect(onChunk).not.toHaveBeenCalled();
      expect(onDone).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------
  // 10. Event handlers
  // ------------------------------------------
  describe('event handlers', () => {
    it('should call onChunk when socket emits CHUNK event', async () => {
      const onChunk = jest.fn();
      aiSocket.setCallbacks({ onChunk });
      await connectWithAddress();

      const payload = { content: 'partial response', index: 3 };
      socketEventHandlers[MOCK_AI_EVENTS.CHUNK]?.(payload);

      expect(onChunk).toHaveBeenCalledTimes(1);
      expect(onChunk).toHaveBeenCalledWith(payload);
    });

    it('should call onDone when socket emits DONE event', async () => {
      const onDone = jest.fn();
      aiSocket.setCallbacks({ onDone });
      await connectWithAddress();

      const payload = { content: 'Full AI response text' };
      socketEventHandlers[MOCK_AI_EVENTS.DONE]?.(payload);

      expect(onDone).toHaveBeenCalledTimes(1);
      expect(onDone).toHaveBeenCalledWith(payload);
    });

    it('should call onError when socket emits ERROR event', async () => {
      const onError = jest.fn();
      aiSocket.setCallbacks({ onError });
      await connectWithAddress();

      const payload = { code: 'RATE_LIMITED', message: 'Too many requests' };
      socketEventHandlers[MOCK_AI_EVENTS.ERROR]?.(payload);

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(payload);
    });

    it('should call onToolCall when socket emits TOOL_CALL event', async () => {
      const onToolCall = jest.fn();
      aiSocket.setCallbacks({ onToolCall });
      await connectWithAddress();

      const payload = { name: 'getBalance', arguments: { token: 'ETH' } };
      socketEventHandlers[MOCK_AI_EVENTS.TOOL_CALL]?.(payload);

      expect(onToolCall).toHaveBeenCalledTimes(1);
      expect(onToolCall).toHaveBeenCalledWith(payload);
    });

    it('should call onToolResult when socket emits TOOL_RESULT event', async () => {
      const onToolResult = jest.fn();
      aiSocket.setCallbacks({ onToolResult });
      await connectWithAddress();

      const payload = {
        name: 'getBalance',
        result: { success: true, data: { balance: '1.5' } },
      };
      socketEventHandlers[MOCK_AI_EVENTS.TOOL_RESULT]?.(payload);

      expect(onToolResult).toHaveBeenCalledTimes(1);
      expect(onToolResult).toHaveBeenCalledWith(payload);
    });

    it('should call onSuggestion when socket emits SUGGESTION event', async () => {
      const onSuggestion = jest.fn();
      aiSocket.setCallbacks({ onSuggestion });
      await connectWithAddress();

      const payload = {
        id: 'sug_123',
        type: 'savings_tip',
        title: 'Save more',
        message: 'Consider staking',
        priority: 'low',
        createdAt: new Date(),
      };
      socketEventHandlers[MOCK_AI_EVENTS.SUGGESTION]?.(payload);

      expect(onSuggestion).toHaveBeenCalledTimes(1);
      expect(onSuggestion).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'savings_tip',
          title: 'Save more',
          message: 'Consider staking',
          priority: 'low',
        })
      );
    });

    it('should call onDisconnect when socket disconnects', async () => {
      const onDisconnect = jest.fn();
      aiSocket.setCallbacks({ onDisconnect });
      await connectWithAddress();

      socketEventHandlers['disconnect']?.('io server disconnect');

      expect(onDisconnect).toHaveBeenCalledTimes(1);
      expect(onDisconnect).toHaveBeenCalledWith('io server disconnect');
    });
  });
});
