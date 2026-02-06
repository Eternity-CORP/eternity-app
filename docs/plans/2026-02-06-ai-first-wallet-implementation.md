# AI-First Wallet Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform E-Y into an AI-native wallet with chat-first interface on web, powered by Claude LLM replacing Gemini/Groq on the backend.

**Architecture:** Replace Gemini/Groq providers with Claude (Haiku + Sonnet) on the NestJS backend. Add local intent parser for common commands. Build chat UI for web app with rich interactive cards. Add AI/Classic mode toggle.

**Tech Stack:** NestJS (backend), Next.js 16 (web), Anthropic SDK, Socket.IO, Tailwind CSS v4, React Context

**Design doc:** `docs/plans/2026-02-06-ai-first-wallet-design.md`

---

## Phase 1: Backend — Claude Provider

### Task 1: Install Anthropic SDK

**Files:**
- Modify: `apps/api/package.json`

**Step 1: Install dependency**

Run: `cd "/Users/daniillogachev/Ma project/E-Y" && pnpm add @anthropic-ai/sdk --filter @e-y/api`

**Step 2: Add env variable**

Add to `apps/api/.env` (or `.env.local`):
```
ANTHROPIC_API_KEY=your_key_here
```

**Step 3: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "feat(api): add Anthropic SDK dependency"
```

---

### Task 2: Create Claude Provider

**Files:**
- Create: `apps/api/src/ai/providers/claude.provider.ts`
- Reference: `apps/api/src/ai/providers/ai-provider.interface.ts` (the AIProvider interface)
- Reference: `apps/api/src/ai/providers/gemini.provider.ts` (pattern to follow)

**Step 1: Write the Claude provider**

```typescript
// apps/api/src/ai/providers/claude.provider.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  AIProvider,
  AIResponse,
  AITool,
  ChatMessage,
  ToolCall,
} from './ai-provider.interface';

@Injectable()
export class ClaudeProvider implements AIProvider {
  readonly name = 'claude';
  private client: Anthropic | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }],
      });
      return true;
    } catch {
      return false;
    }
  }

  async chat(params: {
    messages: ChatMessage[];
    tools?: AITool[];
    systemPrompt?: string;
  }): Promise<AIResponse> {
    if (!this.client) throw new Error('Claude provider not configured');

    const messages = this.convertMessages(params.messages);
    const tools = params.tools ? this.convertTools(params.tools) : undefined;

    // Route to Haiku for simple tool calls, Sonnet for complex
    const model = this.selectModel(params.messages);

    const response = await this.client.messages.create({
      model,
      max_tokens: 1024,
      system: params.systemPrompt || undefined,
      messages,
      tools: tools?.length ? tools : undefined,
    });

    return this.parseResponse(response);
  }

  async *stream(params: {
    messages: ChatMessage[];
    tools?: AITool[];
    systemPrompt?: string;
  }): AsyncIterable<string> {
    if (!this.client) throw new Error('Claude provider not configured');

    const messages = this.convertMessages(params.messages);
    const tools = params.tools ? this.convertTools(params.tools) : undefined;
    const model = this.selectModel(params.messages);

    // If tools are present, don't stream (tool calls come as complete response)
    if (tools?.length) {
      return;
    }

    const stream = this.client.messages.stream({
      model,
      max_tokens: 1024,
      system: params.systemPrompt || undefined,
      messages,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        yield event.delta.text;
      }
    }
  }

  private selectModel(messages: ChatMessage[]): string {
    // Last user message
    const lastMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastMessage) return 'claude-haiku-4-5-20251001';

    const content = lastMessage.content.toLowerCase();

    // Complex queries -> Sonnet
    const complexPatterns = [
      'explain', 'why', 'how', 'analyze', 'помоги', 'объясни',
      'почему', 'как работает', 'что такое', 'расскажи',
      'compare', 'recommend', 'suggest', 'advise',
    ];

    if (complexPatterns.some((p) => content.includes(p))) {
      return 'claude-sonnet-4-5-20250929';
    }

    // Simple -> Haiku
    return 'claude-haiku-4-5-20251001';
  }

  private convertMessages(
    messages: ChatMessage[],
  ): Anthropic.MessageParam[] {
    return messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
  }

  private convertTools(tools: AITool[]): Anthropic.Tool[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object' as const,
        properties: tool.parameters || {},
        required: tool.required || [],
      },
    }));
  }

  private parseResponse(response: Anthropic.Message): AIResponse {
    let content = '';
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        });
      }
    }

    let finishReason: AIResponse['finishReason'] = 'stop';
    if (response.stop_reason === 'tool_use') {
      finishReason = 'tool_calls';
    } else if (response.stop_reason === 'max_tokens') {
      finishReason = 'length';
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason,
    };
  }
}
```

**Step 2: Export from providers index**

In `apps/api/src/ai/providers/index.ts`, add:
```typescript
export { ClaudeProvider } from './claude.provider';
```

**Step 3: Verify it compiles**

Run: `cd "/Users/daniillogachev/Ma project/E-Y/apps/api" && npx tsc --noEmit`
Expected: No errors related to claude.provider.ts

**Step 4: Commit**

```bash
git add apps/api/src/ai/providers/claude.provider.ts apps/api/src/ai/providers/index.ts
git commit -m "feat(api): add Claude provider implementing AIProvider interface"
```

---

### Task 3: Update AI Service to use Claude

**Files:**
- Modify: `apps/api/src/ai/ai.service.ts`

**Step 1: Read current ai.service.ts constructor**

The constructor currently injects `GeminiProvider` and `GroqProvider`. Replace with `ClaudeProvider`.

**Step 2: Update constructor**

Replace the constructor's provider setup:

```typescript
// OLD:
constructor(
  private readonly configService: ConfigService,
  private readonly geminiProvider: GeminiProvider,
  private readonly groqProvider: GroqProvider,
  // ...tools...
) {
  if (geminiProvider.isConfigured) {
    this.providers.set('gemini', geminiProvider);
    this.providerHealth.set('gemini', { consecutiveErrors: 0, isHealthy: true });
  }
  if (groqProvider.isConfigured) {
    this.providers.set('groq', groqProvider);
    this.providerHealth.set('groq', { consecutiveErrors: 0, isHealthy: true });
  }
  this.currentProvider = geminiProvider.isConfigured ? 'gemini' : 'groq';
}

// NEW:
constructor(
  private readonly configService: ConfigService,
  private readonly claudeProvider: ClaudeProvider,
  // ...tools (unchanged)...
) {
  if (claudeProvider.isConfigured) {
    this.providers.set('claude', claudeProvider);
    this.providerHealth.set('claude', { consecutiveErrors: 0, isHealthy: true });
  }
  this.currentProvider = 'claude';
}
```

Also update imports: remove `GeminiProvider`, `GroqProvider`; add `ClaudeProvider`.

**Step 3: Commit**

```bash
git add apps/api/src/ai/ai.service.ts
git commit -m "feat(api): switch AI service from Gemini/Groq to Claude provider"
```

---

### Task 4: Update AI Module

**Files:**
- Modify: `apps/api/src/ai/ai.module.ts`

**Step 1: Replace provider registrations**

```typescript
// OLD providers array includes:
GeminiProvider, GroqProvider,

// NEW:
ClaudeProvider,
```

Update import accordingly.

**Step 2: Commit**

```bash
git add apps/api/src/ai/ai.module.ts
git commit -m "feat(api): register ClaudeProvider in AI module"
```

---

### Task 5: Remove Gemini/Groq provider files and cleanup tool interface

**Files:**
- Delete: `apps/api/src/ai/providers/gemini.provider.ts`
- Delete: `apps/api/src/ai/providers/groq.provider.ts`
- Modify: `apps/api/src/ai/tools/tool.interface.ts` (remove `SchemaType` import from `@google/generative-ai`)

**Step 1: Delete old providers**

```bash
rm "apps/api/src/ai/providers/gemini.provider.ts"
rm "apps/api/src/ai/providers/groq.provider.ts"
```

**Step 2: Update tool interface to remove Gemini dependency**

The `tool.interface.ts` imports `SchemaType` from `@google/generative-ai`. Replace with plain string types:

```typescript
// OLD:
import { SchemaType } from '@google/generative-ai';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: typeof SchemaType.OBJECT;
    properties: Record<string, ToolPropertyDefinition>;
    required: string[];
  };
}

export interface ToolPropertyDefinition {
  type: typeof SchemaType.STRING | typeof SchemaType.NUMBER | typeof SchemaType.BOOLEAN;
  description: string;
  enum?: string[];
}

// NEW:
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, ToolPropertyDefinition>;
    required: string[];
  };
}

export interface ToolPropertyDefinition {
  type: 'string' | 'number' | 'boolean';
  description: string;
  enum?: string[];
}
```

**Step 3: Update all tool files to use plain strings instead of SchemaType**

Each tool file (balance.tool.ts, send.tool.ts, history.tool.ts, contacts.tool.ts, scheduled.tool.ts, blik.tool.ts, swap.tool.ts) uses `SchemaType.OBJECT`, `SchemaType.STRING`, `SchemaType.NUMBER`. Replace all with plain string equivalents:

- `SchemaType.OBJECT` → `'object'`
- `SchemaType.STRING` → `'string'`
- `SchemaType.NUMBER` → `'number'`
- `SchemaType.BOOLEAN` → `'boolean'`

Remove the `import { SchemaType } from '@google/generative-ai'` from each file.

**Step 4: Remove Gemini/Groq SDK packages**

```bash
cd "/Users/daniillogachev/Ma project/E-Y" && pnpm remove @google/generative-ai groq-sdk --filter @e-y/api
```

**Step 5: Verify everything compiles**

Run: `cd "/Users/daniillogachev/Ma project/E-Y/apps/api" && npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add -A apps/api/src/ai/providers/ apps/api/src/ai/tools/ apps/api/package.json pnpm-lock.yaml
git commit -m "refactor(api): remove Gemini/Groq providers and SDK dependencies"
```

---

### Task 6: Create Intent Parser

**Files:**
- Create: `apps/api/src/ai/intent-parser.ts`
- Modify: `apps/api/src/ai/ai.gateway.ts` (integrate parser before LLM call)

**Step 1: Write intent parser**

```typescript
// apps/api/src/ai/intent-parser.ts
import { Injectable } from '@nestjs/common';

export interface ParsedIntent {
  tool: string;
  args: Record<string, unknown>;
  responseTemplate: string;
}

@Injectable()
export class IntentParser {
  parse(message: string): ParsedIntent | null {
    const text = message.trim().toLowerCase();

    // Balance
    if (this.matchesAny(text, [
      'баланс', 'balance', 'сколько', 'сколько у меня', 'мой баланс',
      'what is my balance', 'check balance', 'show balance',
    ])) {
      return { tool: 'get_balance', args: {}, responseTemplate: '' };
    }

    // History
    if (this.matchesAny(text, [
      'история', 'history', 'транзакции', 'transactions',
      'покажи историю', 'show history', 'recent transactions',
      'последние транзакции', 'мои транзакции',
    ])) {
      return { tool: 'get_history', args: {}, responseTemplate: '' };
    }

    // Receive / address
    if (this.matchesAny(text, [
      'получить', 'receive', 'мой адрес', 'my address',
      'покажи адрес', 'show address', 'qr', 'qr code',
      'адрес кошелька', 'wallet address',
    ])) {
      return { tool: 'receive_address', args: {}, responseTemplate: '' };
    }

    // BLIK generate
    if (this.matchesAny(text, [
      'blik', 'блик', 'код', 'создай код', 'create code',
      'generate blik', 'сгенерируй код', 'создай блик',
    ])) {
      // Try to extract amount
      const amountMatch = text.match(/(\d+\.?\d*)\s*(eth|эфир)?/);
      if (amountMatch) {
        return {
          tool: 'blik_generate',
          args: { amount: amountMatch[1], token: 'ETH' },
          responseTemplate: '',
        };
      }
      // No amount — let LLM ask for it
      return null;
    }

    // Send — "отправь 0.1 eth @user" or "send 0.1 eth to @user"
    const sendMatch = text.match(
      /(?:отправь|отправить|send|переведи)\s+(\d+\.?\d*)\s*(eth|эфир|ether)?\s*(?:на|to|к|@)?\s*(@?\w+)/
    );
    if (sendMatch) {
      const amount = sendMatch[1];
      const recipient = sendMatch[3].startsWith('@') ? sendMatch[3] : `@${sendMatch[3]}`;
      return {
        tool: 'prepare_send',
        args: { amount, token: 'ETH', recipient },
        responseTemplate: '',
      };
    }

    return null;
  }

  private matchesAny(text: string, patterns: string[]): boolean {
    return patterns.some((p) => text.includes(p) || text === p);
  }
}
```

**Step 2: Integrate into AI Gateway**

In `apps/api/src/ai/ai.gateway.ts`, in the `handleChat` method, add intent parsing BEFORE the LLM call:

```typescript
// After security check and message sanitization, before building messages for LLM:

// Try local intent parser first
const parsedIntent = this.intentParser.parse(sanitizedContent);
if (parsedIntent) {
  // Execute tool directly without LLM
  const toolResult = await this.aiService.executeTool(
    parsedIntent.tool,
    { ...parsedIntent.args, userAddress },
    userAddress,
  );

  // Emit tool call + result
  client.emit(AI_EVENTS.TOOL_CALL, { name: parsedIntent.tool, arguments: parsedIntent.args });
  client.emit(AI_EVENTS.TOOL_RESULT, { name: parsedIntent.tool, result: toolResult });

  // Build a brief follow-up via LLM for natural language response
  const followUpMessages = [
    ...messages,
    { role: 'user' as const, content: sanitizedContent },
    { role: 'user' as const, content: `[SYSTEM: Tool "${parsedIntent.tool}" returned: ${JSON.stringify(toolResult)}. Summarize this result briefly for the user.]` },
  ];

  const followUp = await this.aiService.chat({
    messages: followUpMessages,
    systemPrompt: SYSTEM_PROMPT,
  });

  // Extract pending actions from tool result
  const pendingTransaction = toolResult.data?.requiresConfirmation ? toolResult.data : undefined;
  const pendingBlik = toolResult.data?.pendingBlik || undefined;

  client.emit(AI_EVENTS.DONE, {
    content: followUp.content,
    toolCalls: [{ name: parsedIntent.tool, arguments: parsedIntent.args }],
    toolResults: [{ name: parsedIntent.tool, result: toolResult }],
    pendingTransaction: pendingTransaction as any,
    pendingBlik: pendingBlik as any,
  });
  return;
}

// ... existing LLM flow continues here
```

Inject `IntentParser` in the gateway constructor.

**Step 3: Register IntentParser in AI Module**

Add `IntentParser` to the `providers` array in `ai.module.ts`.

**Step 4: Verify it compiles**

Run: `cd "/Users/daniillogachev/Ma project/E-Y/apps/api" && npx tsc --noEmit`

**Step 5: Commit**

```bash
git add apps/api/src/ai/intent-parser.ts apps/api/src/ai/ai.gateway.ts apps/api/src/ai/ai.module.ts
git commit -m "feat(api): add local intent parser for common commands"
```

---

### Task 7: Update System Prompt for Claude

**Files:**
- Modify: `apps/api/src/ai/ai.gateway.ts` (update SYSTEM_PROMPT constant)
- Modify: `apps/api/src/ai/ai.controller.ts` (update SYSTEM_PROMPT constant)

**Step 1: Rewrite system prompt**

Replace the existing `SYSTEM_PROMPT` in `ai.gateway.ts` with a Claude-optimized version:

```typescript
const SYSTEM_PROMPT = `You are E (pronounced "EE"), the AI financial assistant inside the Eternity (E-Y) crypto wallet.

<personality>
- Friendly, concise, helpful
- 1-3 sentences per response unless user asks for details
- Detect user's language from their message and always respond in that language
- Supported: Russian, Ukrainian, English, and any other language
</personality>

<rules>
- NEVER ask for seed phrases, private keys, or passwords
- NEVER simulate transactions — always use tools
- ALWAYS show amounts in both crypto and USD equivalent
- For financial operations, provide clear previews before execution
- If unsure about user intent, ask for clarification
</rules>

<tools>
You have access to these tools:
- get_balance: Check wallet balance (ETH and tokens)
- prepare_send: Prepare a send transaction (supports @username and addresses)
- get_history: Get transaction history
- blik_generate: Generate a BLIK code for receiving crypto
- blik_lookup: Look up a BLIK code to pay it
- get_contacts: List saved contacts
- get_scheduled: Show scheduled payments
- prepare_swap: Prepare a token swap
</tools>

<blik_explanation>
BLIK is a 6-digit code system for instant crypto transfers:
- Receiver generates a code (valid 2 minutes)
- Sender enters the code to pay
- No addresses needed
</blik_explanation>`;
```

Update the same in `ai.controller.ts`.

**Step 2: Commit**

```bash
git add apps/api/src/ai/ai.gateway.ts apps/api/src/ai/ai.controller.ts
git commit -m "feat(api): update system prompt for Claude format"
```

---

### Task 8: Test backend with mobile app

**Step 1: Start the API**

Run: `cd "/Users/daniillogachev/Ma project/E-Y/apps/api" && pnpm dev`

Check logs for: "Claude provider configured" (or no errors about missing provider).

**Step 2: Start mobile app and test basic chat**

Open the mobile app, go to AI tab. Send:
- "Какой у меня баланс?" — should trigger get_balance tool
- "Покажи историю" — should trigger get_history tool

Verify responses come through and cards render correctly.

**Step 3: Commit any fixes if needed**

---

## Phase 2: Web — Socket Service & Hook

### Task 9: Install Socket.IO client for web

**Files:**
- Modify: `apps/web/package.json`

**Step 1: Install**

```bash
cd "/Users/daniillogachev/Ma project/E-Y" && pnpm add socket.io-client --filter @e-y/web
```

**Step 2: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): add socket.io-client dependency"
```

---

### Task 10: Create AI Socket Service for web

**Files:**
- Create: `apps/web/src/services/ai-service.ts`
- Reference: `apps/mobile/src/services/ai-service.ts` (reuse logic)

**Step 1: Write the service**

This is a near-1:1 port of the mobile service. Key differences: no React Native imports, uses `process.env.NEXT_PUBLIC_API_URL` for the base URL.

```typescript
// apps/web/src/services/ai-service.ts
import { io, Socket } from 'socket.io-client';
import type {
  AI_EVENTS as AI_EVENTS_TYPE,
  ChunkPayload,
  DonePayload,
  ToolCall,
  ToolResult,
  AiSuggestion,
  AiErrorPayload,
} from '@e-y/shared';

const AI_EVENTS = {
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

export interface AiErrorPayloadExtended extends AiErrorPayload {
  rateLimit?: { remaining: number; resetIn: number; limit: number };
}

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class AiSocketService {
  private socket: Socket | null = null;
  private callbacks: AiCallbacks = {};
  private isConnecting = false;
  private userAddress: string | null = null;
  private messageHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  setCallbacks(callbacks: AiCallbacks) {
    this.callbacks = callbacks;
  }

  clearCallbacks() {
    this.callbacks = {};
  }

  async connect(address: string): Promise<void> {
    if (this.socket?.connected && this.userAddress === address) return;

    if (this.isConnecting) {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (!this.isConnecting) {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });
    }

    this.isConnecting = true;

    if (this.socket) {
      this.socket.disconnect();
    }

    return new Promise((resolve) => {
      this.socket = io(`${API_BASE_URL}/ai`, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on('connect', () => {
        this.isConnecting = false;
        this.subscribe(address);
        this.callbacks.onConnect?.();
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        this.callbacks.onDisconnect?.(reason);
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

  disconnect() {
    if (this.socket) {
      this.socket.emit(AI_EVENTS.UNSUBSCRIBE);
      this.socket.disconnect();
      this.socket = null;
    }
    this.callbacks = {};
    this.userAddress = null;
    this.messageHistory = [];
    this.isConnecting = false;
  }

  sendMessage(content: string) {
    if (!this.socket?.connected) {
      if (this.userAddress) {
        this.connect(this.userAddress).then(() => this.sendMessageInternal(content));
      } else {
        this.callbacks.onError?.({ code: 'CONNECTION_FAILED', message: 'Not connected' });
      }
      return;
    }
    this.sendMessageInternal(content);
  }

  addAssistantMessage(content: string) {
    this.messageHistory.push({ role: 'assistant', content });
  }

  clearHistory() {
    this.messageHistory = [];
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  private subscribe(address: string) {
    this.userAddress = address.toLowerCase();
    this.socket?.emit(AI_EVENTS.SUBSCRIBE, { address: this.userAddress });
  }

  private sendMessageInternal(content: string) {
    if (!this.userAddress) return;
    this.messageHistory.push({ role: 'user', content });
    const history = this.messageHistory.slice(-10);
    this.socket?.emit(AI_EVENTS.CHAT, { content, history });
  }

  private setupEventListeners() {
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
      if (!payload.id) payload.id = crypto.randomUUID();
      if (!payload.createdAt) payload.createdAt = new Date().toISOString();
      this.callbacks.onSuggestion?.(payload);
    });

    this.socket.on(AI_EVENTS.ERROR, (payload: AiErrorPayloadExtended) => {
      this.callbacks.onError?.(payload);
    });
  }
}

export const aiSocket = new AiSocketService();
```

**Step 2: Commit**

```bash
git add apps/web/src/services/ai-service.ts
git commit -m "feat(web): add AI socket service (port from mobile)"
```

---

### Task 11: Create useAiChat hook for web

**Files:**
- Create: `apps/web/src/hooks/useAiChat.ts`
- Reference: `apps/mobile/src/hooks/useAiChat.ts`

**Step 1: Write the hook**

Uses React state instead of Redux (web app has no Redux):

```typescript
// apps/web/src/hooks/useAiChat.ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from '@/contexts/account-context';
import { aiSocket } from '@/services/ai-service';
import type {
  ChatMessage,
  TransactionPreview,
  BlikPreview,
  AiSuggestion,
} from '@e-y/shared';

type AiStatus = 'idle' | 'connecting' | 'connected' | 'sending' | 'streaming' | 'error';

export interface UseAiChatReturn {
  messages: ChatMessage[];
  suggestions: AiSuggestion[];
  status: AiStatus;
  isConnected: boolean;
  isStreaming: boolean;
  streamingContent: string;
  pendingTransaction: TransactionPreview | null;
  pendingBlik: BlikPreview | null;
  error: string | null;
  rateLimit: { remaining: number; resetIn: number; limit: number } | null;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (content: string) => void;
  dismissSuggestion: (id: string) => void;
  clearChat: () => void;
  clearPendingTransaction: () => void;
  clearPendingBlik: () => void;
}

export function useAiChat(autoConnect = true): UseAiChatReturn {
  const { address, isLoggedIn } = useAccount();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [status, setStatus] = useState<AiStatus>('idle');
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [pendingTransaction, setPendingTransaction] = useState<TransactionPreview | null>(null);
  const [pendingBlik, setPendingBlik] = useState<BlikPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<{ remaining: number; resetIn: number; limit: number } | null>(null);

  const statusRef = useRef(status);
  statusRef.current = status;

  // Setup socket callbacks
  useEffect(() => {
    aiSocket.setCallbacks({
      onConnect: () => {
        setStatus('connected');
        setError(null);
      },
      onDisconnect: () => {
        setStatus('idle');
      },
      onChunk: (payload) => {
        setStatus('streaming');
        setStreamingContent((prev) => prev + payload.content);
      },
      onDone: (payload) => {
        if (payload.content) {
          const assistantMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: payload.content,
            timestamp: new Date().toISOString(),
            toolCalls: payload.toolCalls,
            toolResults: payload.toolResults,
          };
          setMessages((prev) => [...prev, assistantMessage]);
          aiSocket.addAssistantMessage(payload.content);
        }
        setStreamingContent('');
        setStreamingMessageId(null);
        setStatus('connected');

        if (payload.pendingTransaction) {
          setPendingTransaction(payload.pendingTransaction);
        }
        if (payload.pendingBlik) {
          setPendingBlik(payload.pendingBlik);
        }
      },
      onSuggestion: (suggestion) => {
        setSuggestions((prev) => {
          const filtered = prev.filter((s) => s.id !== suggestion.id);
          return [suggestion, ...filtered].slice(0, 10);
        });
      },
      onError: (payload) => {
        setError(payload.message);
        setStreamingContent('');
        setStatus('error');
        if (payload.rateLimit) {
          setRateLimit(payload.rateLimit);
        }
      },
    });

    return () => {
      aiSocket.clearCallbacks();
    };
  }, []);

  // Auto-connect
  useEffect(() => {
    if (autoConnect && address && isLoggedIn && statusRef.current === 'idle') {
      setStatus('connecting');
      aiSocket.connect(address);
    }
  }, [autoConnect, address, isLoggedIn]);

  const connect = useCallback(() => {
    if (!address) return;
    setStatus('connecting');
    aiSocket.connect(address);
  }, [address]);

  const disconnect = useCallback(() => {
    aiSocket.disconnect();
    setStatus('idle');
  }, []);

  const sendMessage = useCallback((content: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setStatus('sending');
    setStreamingContent('');
    setStreamingMessageId(crypto.randomUUID());
    setError(null);
    aiSocket.sendMessage(content);
  }, []);

  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setStreamingContent('');
    aiSocket.clearHistory();
  }, []);

  const clearPendingTransaction = useCallback(() => setPendingTransaction(null), []);
  const clearPendingBlik = useCallback(() => setPendingBlik(null), []);

  return {
    messages,
    suggestions,
    status,
    isConnected: status === 'connected' || status === 'sending' || status === 'streaming',
    isStreaming: status === 'streaming' || status === 'sending',
    streamingContent,
    pendingTransaction,
    pendingBlik,
    error,
    rateLimit,
    connect,
    disconnect,
    sendMessage,
    dismissSuggestion,
    clearChat,
    clearPendingTransaction,
    clearPendingBlik,
  };
}
```

**Step 2: Commit**

```bash
git add apps/web/src/hooks/useAiChat.ts
git commit -m "feat(web): add useAiChat hook (React state, adapted from mobile)"
```

---

### Task 12: Add uiMode to AccountContext

**Files:**
- Modify: `apps/web/src/contexts/account-context.tsx`

**Step 1: Add uiMode state**

Add to the `AccountContextValue` interface:
```typescript
uiMode: 'ai' | 'classic';
setUiMode: (mode: 'ai' | 'classic') => void;
```

Add to the default context value:
```typescript
uiMode: 'ai',
setUiMode: () => {},
```

Add state in `AccountProvider`:
```typescript
const [uiMode, setUiModeState] = useState<'ai' | 'classic'>('ai');

useEffect(() => {
  const saved = localStorage.getItem('ey_ui_mode') as 'ai' | 'classic' | null;
  if (saved) {
    setUiModeState(saved);
  }
}, []);

const setUiMode = useCallback((mode: 'ai' | 'classic') => {
  setUiModeState(mode);
  localStorage.setItem('ey_ui_mode', mode);
}, []);
```

Add `uiMode` and `setUiMode` to the Provider value.

**Step 2: Commit**

```bash
git add apps/web/src/contexts/account-context.tsx
git commit -m "feat(web): add AI/Classic UI mode to account context"
```

---

## Phase 3: Web — Chat UI Components

### Task 13: Add chat CSS styles

**Files:**
- Modify: `apps/web/src/app/globals.css`

**Step 1: Add chat-specific styles at the end of globals.css**

```css
/* Chat styles */
.chat-bubble-user {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
}

.chat-bubble-assistant {
  background: rgba(19, 19, 19, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.chat-input-container {
  background: rgba(19, 19, 19, 0.6);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: border-color 0.2s ease;
}

.chat-input-container:focus-within {
  border-color: rgba(51, 136, 255, 0.3);
}

.suggestion-chip {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s ease;
}

.suggestion-chip:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(51, 136, 255, 0.3);
}

.editable-field {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 12px;
  transition: border-color 0.2s ease;
}

.editable-field:focus-within {
  border-color: rgba(51, 136, 255, 0.4);
  background: rgba(255, 255, 255, 0.05);
}

.mode-toggle {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 2px;
}

.mode-toggle-option {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s ease;
  color: rgba(255, 255, 255, 0.4);
}

.mode-toggle-option.active {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "feat(web): add chat UI CSS styles"
```

---

### Task 14: Create MessageBubble component

**Files:**
- Create: `apps/web/src/components/chat/MessageBubble.tsx`

**Step 1: Write component**

```tsx
// apps/web/src/components/chat/MessageBubble.tsx
'use client'

import type { ChatMessage } from '@e-y/shared'

interface MessageBubbleProps {
  message: ChatMessage
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
          isUser
            ? 'chat-bubble-user rounded-br-md'
            : 'chat-bubble-assistant rounded-bl-md'
        }`}
      >
        <p className="text-sm text-white whitespace-pre-wrap">{message.content}</p>

        {/* Tool call badges */}
        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-white/5">
            {message.toolCalls.map((tc, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#3388FF]/15 text-[#3388FF]"
              >
                {tc.name}
              </span>
            ))}
          </div>
        )}

        <p className={`text-[10px] mt-1 ${isUser ? 'text-white/30' : 'text-white/20'}`}>
          {time}
        </p>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/chat/MessageBubble.tsx
git commit -m "feat(web): add MessageBubble chat component"
```

---

### Task 15: Create InputBar component

**Files:**
- Create: `apps/web/src/components/chat/InputBar.tsx`

**Step 1: Write component**

```tsx
// apps/web/src/components/chat/InputBar.tsx
'use client'

import { useState, useRef, type KeyboardEvent } from 'react'

interface InputBarProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export default function InputBar({ onSend, disabled, placeholder }: InputBarProps) {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = text.trim().length > 0 && !disabled

  return (
    <div className="chat-input-container rounded-xl flex items-end gap-2 p-2">
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Напишите сообщение...'}
        maxLength={1000}
        rows={1}
        disabled={disabled}
        className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none resize-none max-h-24 py-2 px-2 disabled:opacity-40"
        style={{ minHeight: '36px' }}
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
          canSend
            ? 'bg-[#3388FF] text-white hover:bg-[#2266DD]'
            : 'bg-white/5 text-white/20'
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      </button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/chat/InputBar.tsx
git commit -m "feat(web): add InputBar chat component"
```

---

### Task 16: Create SuggestionChips component

**Files:**
- Create: `apps/web/src/components/chat/SuggestionChips.tsx`

**Step 1: Write component**

```tsx
// apps/web/src/components/chat/SuggestionChips.tsx
'use client'

interface SuggestionChipsProps {
  onSelect: (text: string) => void
  hasMessages: boolean
}

const NEW_USER_CHIPS = [
  'Что ты умеешь?',
  'Покажи баланс',
  'Как отправить крипто?',
]

const RETURNING_USER_CHIPS = [
  'Баланс',
  'Отправить',
  'BLIK',
  'История',
]

export default function SuggestionChips({ onSelect, hasMessages }: SuggestionChipsProps) {
  const chips = hasMessages ? RETURNING_USER_CHIPS : NEW_USER_CHIPS

  return (
    <div className="flex flex-wrap gap-2 px-1">
      {chips.map((chip) => (
        <button
          key={chip}
          onClick={() => onSelect(chip)}
          className="suggestion-chip px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white"
        >
          {chip}
        </button>
      ))}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/chat/SuggestionChips.tsx
git commit -m "feat(web): add SuggestionChips component"
```

---

### Task 17: Create TypingIndicator component

**Files:**
- Create: `apps/web/src/components/chat/TypingIndicator.tsx`

**Step 1: Write component**

```tsx
// apps/web/src/components/chat/TypingIndicator.tsx
'use client'

interface TypingIndicatorProps {
  streamingContent?: string
}

export default function TypingIndicator({ streamingContent }: TypingIndicatorProps) {
  if (streamingContent) {
    return (
      <div className="flex justify-start mb-3">
        <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-md chat-bubble-assistant">
          <p className="text-sm text-white whitespace-pre-wrap">{streamingContent}</p>
          <p className="text-[10px] text-white/20 mt-1">Печатает...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-3">
      <div className="px-4 py-3 rounded-2xl rounded-bl-md chat-bubble-assistant">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/chat/TypingIndicator.tsx
git commit -m "feat(web): add TypingIndicator component"
```

---

## Phase 4: Web — Rich Cards

### Task 18: Create SendPreviewCard with editable fields

**Files:**
- Create: `apps/web/src/components/chat/cards/SendPreviewCard.tsx`

**Step 1: Write component**

```tsx
// apps/web/src/components/chat/cards/SendPreviewCard.tsx
'use client'

import { useState } from 'react'
import type { TransactionPreview } from '@e-y/shared'

interface SendPreviewCardProps {
  transaction: TransactionPreview
  onConfirm: (updated: TransactionPreview) => void
  onCancel: () => void
}

export default function SendPreviewCard({ transaction, onConfirm, onCancel }: SendPreviewCardProps) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [recipient, setRecipient] = useState(transaction.toUsername || transaction.to)
  const [amount, setAmount] = useState(transaction.amount)

  const formatAddress = (addr: string) =>
    addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr

  const handleConfirm = () => {
    onConfirm({
      ...transaction,
      to: transaction.to,
      toUsername: recipient.startsWith('@') ? recipient : transaction.toUsername,
      amount,
    })
  }

  return (
    <div className="flex justify-start mb-3">
      <div className="w-full max-w-[320px] glass-card rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60">
              <line x1="12" y1="19" x2="12" y2="5" />
              <polyline points="5 12 12 5 19 12" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">Send</span>
        </div>

        {/* To */}
        <div className="mb-3">
          <label className="text-[10px] text-white/30 uppercase tracking-wide mb-1 block">To</label>
          {editingField === 'recipient' ? (
            <div className="editable-field">
              <input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                onBlur={() => setEditingField(null)}
                autoFocus
                className="w-full bg-transparent text-sm text-white focus:outline-none"
              />
            </div>
          ) : (
            <button
              onClick={() => setEditingField('recipient')}
              className="editable-field w-full flex items-center justify-between cursor-pointer hover:border-white/15"
            >
              <span className="text-sm text-white font-mono">
                {recipient.startsWith('@') ? recipient : formatAddress(recipient)}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
        </div>

        {/* Amount */}
        <div className="mb-3">
          <label className="text-[10px] text-white/30 uppercase tracking-wide mb-1 block">Amount</label>
          {editingField === 'amount' ? (
            <div className="editable-field">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={() => setEditingField(null)}
                  autoFocus
                  step="0.0001"
                  className="flex-1 bg-transparent text-sm text-white focus:outline-none"
                />
                <span className="text-xs text-white/30">{transaction.token}</span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditingField('amount')}
              className="editable-field w-full flex items-center justify-between cursor-pointer hover:border-white/15"
            >
              <span className="text-sm text-white">{amount} {transaction.token}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
        </div>

        {/* Gas & Network (read-only) */}
        <div className="space-y-2 mb-4 pt-3 border-t border-white/5">
          <div className="flex justify-between text-xs">
            <span className="text-white/30">Network</span>
            <span className="text-white/60">{transaction.network}</span>
          </div>
          {transaction.estimatedGas && (
            <div className="flex justify-between text-xs">
              <span className="text-white/30">Gas</span>
              <span className="text-white/60">~{transaction.estimatedGas} ({transaction.estimatedGasUsd})</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl glass-card text-xs font-semibold text-white/60 hover:text-white hover:border-white/15 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl bg-white text-black text-xs font-semibold shimmer hover:bg-white/90 transition-all"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/chat/cards/SendPreviewCard.tsx
git commit -m "feat(web): add SendPreviewCard with editable fields"
```

---

### Task 19: Create ReceiveCard

**Files:**
- Create: `apps/web/src/components/chat/cards/ReceiveCard.tsx`

**Step 1: Write component**

```tsx
// apps/web/src/components/chat/cards/ReceiveCard.tsx
'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

interface ReceiveCardProps {
  address: string
}

export default function ReceiveCard({ address }: ReceiveCardProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex justify-start mb-3">
      <div className="w-full max-w-[280px] glass-card rounded-2xl p-4 text-center">
        <p className="text-xs text-white/30 uppercase tracking-wide mb-3">Your address</p>

        <div className="flex justify-center mb-3">
          <div className="p-3 bg-white rounded-xl">
            <QRCodeSVG value={address} size={140} level="H" />
          </div>
        </div>

        <p className="font-mono text-[11px] text-white/40 break-all leading-relaxed mb-3 px-2">
          {address}
        </p>

        <button
          onClick={handleCopy}
          className="w-full py-2 rounded-xl bg-white/5 border border-white/8 text-xs font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-all"
        >
          {copied ? 'Copied!' : 'Copy Address'}
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/chat/cards/ReceiveCard.tsx
git commit -m "feat(web): add ReceiveCard component"
```

---

### Task 20: Create BlikCard

**Files:**
- Create: `apps/web/src/components/chat/cards/BlikCard.tsx`

**Step 1: Write component**

```tsx
// apps/web/src/components/chat/cards/BlikCard.tsx
'use client'

import { useState, useEffect } from 'react'
import type { BlikPreview } from '@e-y/shared'

interface BlikCardProps {
  blik: BlikPreview
  onConfirmPay?: (blik: BlikPreview) => void
  onCancel: () => void
}

export default function BlikCard({ blik, onConfirmPay, onCancel }: BlikCardProps) {
  const [timeLeft, setTimeLeft] = useState(120)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (blik.type !== 'generate') return

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((blik.expiresAt - Date.now()) / 1000))
      setTimeLeft(remaining)
    }
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [blik])

  const formatCode = (code: string) => `${code.slice(0, 3)} ${code.slice(3)}`
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  const handleCopyCode = async () => {
    if (blik.type === 'generate') {
      await navigator.clipboard.writeText(blik.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Generate mode
  if (blik.type === 'generate') {
    const isExpired = timeLeft === 0
    const isPaid = blik.status === 'paid'

    return (
      <div className="flex justify-start mb-3">
        <div className="w-full max-w-[280px] glass-card rounded-2xl p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center mx-auto mb-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M7 15h0M2 9.5h20" />
            </svg>
          </div>

          {isPaid ? (
            <div className="px-3 py-1.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 inline-flex items-center gap-1.5 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
              <span className="text-xs font-medium text-[#22C55E]">Payment received!</span>
            </div>
          ) : isExpired ? (
            <p className="text-xs text-[#EF4444] mb-3">Code expired</p>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#22C55E]/8 border border-[#22C55E]/20 rounded-full mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              <span className="text-xs text-[#22C55E]">{formatTime(timeLeft)}</span>
            </div>
          )}

          <button onClick={handleCopyCode} className="block mx-auto mb-2 hover:opacity-80 transition-opacity">
            <p className="text-4xl font-mono font-bold tracking-[0.15em] text-white">
              {formatCode(blik.code)}
            </p>
          </button>
          <p className="text-xs text-white/30 mb-3">{copied ? 'Copied!' : 'Click to copy'}</p>

          <p className="text-sm text-white/60 mb-4">{blik.amount} {blik.token} ≈ ${blik.amountUsd}</p>

          <button
            onClick={onCancel}
            className="w-full py-2 rounded-xl glass-card text-xs font-semibold text-white/60 hover:text-white transition-all"
          >
            Done
          </button>
        </div>
      </div>
    )
  }

  // Pay mode
  return (
    <div className="flex justify-start mb-3">
      <div className="w-full max-w-[320px] glass-card rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M7 15h0M2 9.5h20" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">BLIK Payment</span>
        </div>

        <div className="text-center mb-4">
          <p className="text-2xl font-bold text-white">{blik.amount} {blik.token}</p>
          <p className="text-xs text-white/30">≈ ${blik.amountUsd}</p>
        </div>

        <div className="space-y-2 mb-4 pt-3 border-t border-white/5">
          <div className="flex justify-between text-xs">
            <span className="text-white/30">Code</span>
            <span className="text-white/60 font-mono">{formatCode(blik.code)}</span>
          </div>
          {blik.type === 'pay' && blik.receiverUsername && (
            <div className="flex justify-between text-xs">
              <span className="text-white/30">To</span>
              <span className="text-white/60">{blik.receiverUsername}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl glass-card text-xs font-semibold text-white/60 hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirmPay?.(blik)}
            className="flex-1 py-2.5 rounded-xl bg-[#8B5CF6] text-white text-xs font-semibold hover:bg-[#7C3AED] transition-all"
          >
            Pay
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/chat/cards/BlikCard.tsx
git commit -m "feat(web): add BlikCard component (generate + pay modes)"
```

---

### Task 21: Create HistoryCard

**Files:**
- Create: `apps/web/src/components/chat/cards/HistoryCard.tsx`

**Step 1: Write component**

```tsx
// apps/web/src/components/chat/cards/HistoryCard.tsx
'use client'

interface Transaction {
  hash: string
  from: string
  to: string
  amount: string
  token: string
  direction: 'sent' | 'received'
  date: string
}

interface HistoryCardProps {
  transactions: Transaction[]
  userAddress: string
}

export default function HistoryCard({ transactions, userAddress }: HistoryCardProps) {
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  if (transactions.length === 0) {
    return (
      <div className="flex justify-start mb-3">
        <div className="w-full max-w-[320px] glass-card rounded-2xl p-4 text-center">
          <p className="text-sm text-white/40">No transactions yet</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-3">
      <div className="w-full max-w-[360px] glass-card rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <span className="text-xs font-semibold text-white/40 uppercase tracking-wide">Recent Transactions</span>
        </div>
        <div className="divide-y divide-white/5">
          {transactions.slice(0, 5).map((tx) => {
            const isSent = tx.direction === 'sent'
            const other = isSent ? tx.to : tx.from
            return (
              <div key={tx.hash} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isSent ? 'bg-white/5' : 'bg-[#22C55E]/8'
                  }`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      className={isSent ? 'text-white/40' : 'text-[#22C55E]'}>
                      {isSent ? (
                        <>
                          <line x1="12" y1="19" x2="12" y2="5" />
                          <polyline points="5 12 12 5 19 12" />
                        </>
                      ) : (
                        <>
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <polyline points="19 12 12 19 5 12" />
                        </>
                      )}
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white">{isSent ? 'Sent' : 'Received'}</p>
                    <p className="text-[10px] text-white/30">{formatAddress(other)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-medium ${isSent ? 'text-white/50' : 'text-[#22C55E]'}`}>
                    {isSent ? '-' : '+'}{tx.amount} {tx.token}
                  </p>
                  <p className="text-[10px] text-white/20">{formatDate(tx.date)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/chat/cards/HistoryCard.tsx
git commit -m "feat(web): add HistoryCard component"
```

---

### Task 22: Create ConfirmModal

**Files:**
- Create: `apps/web/src/components/chat/cards/ConfirmModal.tsx`

**Step 1: Write component**

```tsx
// apps/web/src/components/chat/cards/ConfirmModal.tsx
'use client'

import { useState, useEffect } from 'react'

interface ConfirmModalProps {
  title: string
  summary: string
  details: Array<{ label: string; value: string }>
  onConfirm: (password: string) => Promise<void>
  onCancel: () => void
}

export default function ConfirmModal({ title, summary, details, onConfirm, onCancel }: ConfirmModalProps) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)

  // Auto-cancel after 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onCancel()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [onCancel])

  const handleConfirm = async () => {
    if (!password) return
    setLoading(true)
    setError('')
    try {
      await onConfirm(password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative w-full max-w-[380px] glass-card gradient-border rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white text-center mb-2">{title}</h2>
        <p className="text-xl font-bold text-white text-center mb-4">{summary}</p>

        <div className="space-y-2 mb-4">
          {details.map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-white/30">{label}</span>
              <span className="text-white/60 font-mono text-xs">{value}</span>
            </div>
          ))}
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="text-xs text-white/30 uppercase tracking-wide mb-2 block">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            placeholder="Enter wallet password"
            autoFocus
            className="w-full px-4 py-3 bg-white/3 border border-white/8 rounded-xl text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#3388FF]/30"
          />
        </div>

        {error && (
          <div className="px-4 py-2 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl mb-4">
            <p className="text-[#f87171] text-xs">{error}</p>
          </div>
        )}

        {/* Timer */}
        <p className="text-[10px] text-white/20 text-center mb-3">Auto-cancel in {timeLeft}s</p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl glass-card text-sm font-semibold text-white/60 hover:text-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!password || loading}
            className="flex-1 py-3 rounded-xl bg-white text-black text-sm font-semibold shimmer hover:bg-white/90 transition-all disabled:opacity-40"
          >
            {loading ? 'Confirming...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/chat/cards/ConfirmModal.tsx
git commit -m "feat(web): add ConfirmModal component"
```

---

## Phase 5: Web — Integration

### Task 23: Create ChatContainer (main chat component)

**Files:**
- Create: `apps/web/src/components/chat/ChatContainer.tsx`

**Step 1: Write component**

This is the main component that composes everything together for the AI mode:

```tsx
// apps/web/src/components/chat/ChatContainer.tsx
'use client'

import { useRef, useEffect, useState } from 'react'
import { useAccount } from '@/contexts/account-context'
import { useAiChat } from '@/hooks/useAiChat'
import { ethers } from 'ethers'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { loadAndDecrypt } from '@e-y/storage'
import MessageBubble from './MessageBubble'
import InputBar from './InputBar'
import SuggestionChips from './SuggestionChips'
import TypingIndicator from './TypingIndicator'
import SendPreviewCard from './cards/SendPreviewCard'
import ReceiveCard from './cards/ReceiveCard'
import BlikCard from './cards/BlikCard'
import ConfirmModal from './cards/ConfirmModal'
import type { TransactionPreview, BlikPreview } from '@e-y/shared'

export default function ChatContainer() {
  const { address, network, wallet, currentAccount } = useAccount()
  const {
    messages,
    status,
    isConnected,
    isStreaming,
    streamingContent,
    pendingTransaction,
    pendingBlik,
    error,
    sendMessage,
    clearPendingTransaction,
    clearPendingBlik,
  } = useAiChat()

  const [balance, setBalance] = useState('0')
  const [balanceUsd, setBalanceUsd] = useState('0.00')
  const [balanceLoading, setBalanceLoading] = useState(true)
  const [confirmModal, setConfirmModal] = useState<{
    title: string
    summary: string
    details: Array<{ label: string; value: string }>
    onConfirm: (password: string) => Promise<void>
  } | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)

  // Fetch balance
  useEffect(() => {
    if (!address) return
    const fetchBalance = async () => {
      try {
        const provider = new ethers.JsonRpcProvider(network.rpcUrl)
        const bal = await provider.getBalance(address)
        const ethBal = ethers.formatEther(bal)
        setBalance(ethBal)
        setBalanceUsd((parseFloat(ethBal) * 2500).toFixed(2))
      } catch {
        // silent
      } finally {
        setBalanceLoading(false)
      }
    }
    fetchBalance()
  }, [address, network.rpcUrl])

  // Auto-scroll
  useEffect(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [messages.length, streamingContent, pendingTransaction, pendingBlik])

  // Handle send confirmation (step 2 — modal with password)
  const handleSendConfirm = (tx: TransactionPreview) => {
    setConfirmModal({
      title: 'Confirm Transaction',
      summary: `${tx.amount} ${tx.token} → ${tx.toUsername || tx.to.slice(0, 8) + '...'}`,
      details: [
        { label: 'To', value: tx.toUsername || `${tx.to.slice(0, 10)}...${tx.to.slice(-6)}` },
        { label: 'Network', value: tx.network || network.name },
        { label: 'Gas', value: tx.estimatedGas ? `~${tx.estimatedGas}` : 'estimating...' },
      ],
      onConfirm: async (password: string) => {
        // Decrypt mnemonic with password
        const mnemonic = await loadAndDecrypt(password)
        if (!mnemonic) throw new Error('Invalid password')

        const accountIndex = currentAccount?.accountIndex || 0
        const hdWallet = deriveWalletFromMnemonic(mnemonic, accountIndex)
        const provider = new ethers.JsonRpcProvider(network.rpcUrl)
        const connected = hdWallet.connect(provider)

        const txResponse = await connected.sendTransaction({
          to: tx.to,
          value: ethers.parseEther(tx.amount),
        })
        await txResponse.wait()

        clearPendingTransaction()
        setConfirmModal(null)
      },
    })
  }

  const handleBlikConfirmPay = (blik: BlikPreview) => {
    if (blik.type !== 'pay') return
    setConfirmModal({
      title: 'Confirm BLIK Payment',
      summary: `${blik.amount} ${blik.token}`,
      details: [
        { label: 'Code', value: blik.code },
        { label: 'To', value: blik.receiverUsername || blik.receiverAddress?.slice(0, 10) + '...' || '' },
      ],
      onConfirm: async (password: string) => {
        const mnemonic = await loadAndDecrypt(password)
        if (!mnemonic) throw new Error('Invalid password')

        const accountIndex = currentAccount?.accountIndex || 0
        const hdWallet = deriveWalletFromMnemonic(mnemonic, accountIndex)
        const provider = new ethers.JsonRpcProvider(network.rpcUrl)
        const connected = hdWallet.connect(provider)

        const txResponse = await connected.sendTransaction({
          to: blik.receiverAddress,
          value: ethers.parseEther(blik.amount),
        })
        await txResponse.wait()

        clearPendingBlik()
        setConfirmModal(null)
      },
    })
  }

  const networkColor = currentAccount?.type === 'real' ? '#22c55e' : '#F59E0B'

  const getPlaceholder = () => {
    if (!isConnected) return 'Connecting...'
    if (isStreaming) return 'AI is responding...'
    return 'Ask anything...'
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Balance Panel */}
      <div className="flex-shrink-0 px-4 py-4">
        <div className="glass-card rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            {balanceLoading ? (
              <div className="h-7 w-28 bg-white/5 rounded-lg animate-pulse" />
            ) : (
              <>
                <span className="text-2xl font-bold text-gradient">{parseFloat(balance).toFixed(4)}</span>
                <span className="text-sm text-white/30 ml-2">{network.symbol}</span>
              </>
            )}
            <p className="text-xs text-white/30">${balanceUsd} USD</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: networkColor }} />
            <span className="text-[10px] text-white/30">{network.name}</span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm text-white/30 mb-1">Chat with E</p>
            <p className="text-xs text-white/20">Your AI financial assistant</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isStreaming && <TypingIndicator streamingContent={streamingContent} />}

        {pendingTransaction && (
          <SendPreviewCard
            transaction={pendingTransaction}
            onConfirm={handleSendConfirm}
            onCancel={clearPendingTransaction}
          />
        )}

        {pendingBlik && (
          <BlikCard
            blik={pendingBlik}
            onConfirmPay={handleBlikConfirmPay}
            onCancel={clearPendingBlik}
          />
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex-shrink-0 mx-4 mb-2 px-4 py-2 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl">
          <p className="text-[#f87171] text-xs">{error}</p>
        </div>
      )}

      {/* Connection Warning */}
      {status === 'idle' && messages.length === 0 && (
        <div className="flex-shrink-0 mx-4 mb-2 px-4 py-2 bg-[#F59E0B]/5 border border-[#F59E0B]/15 rounded-xl flex items-center justify-between">
          <p className="text-[#F59E0B] text-xs">Agent unavailable</p>
        </div>
      )}

      {/* Suggestion Chips */}
      <div className="flex-shrink-0 px-4 py-2">
        <SuggestionChips
          onSelect={sendMessage}
          hasMessages={messages.length > 0}
        />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-4 pb-4">
        <InputBar
          onSend={sendMessage}
          disabled={!isConnected || isStreaming}
          placeholder={getPlaceholder()}
        />
      </div>

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          summary={confirmModal.summary}
          details={confirmModal.details}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/chat/ChatContainer.tsx
git commit -m "feat(web): add ChatContainer - main AI chat interface"
```

---

### Task 24: Update Navigation with AI/Classic toggle

**Files:**
- Modify: `apps/web/src/components/Navigation.tsx`

**Step 1: Add mode toggle**

Add inside the right-side div, before `AccountSelector`, when logged in:

```tsx
{/* Mode Toggle */}
<div className="mode-toggle flex">
  <button
    onClick={() => setUiMode('ai')}
    className={`mode-toggle-option ${uiMode === 'ai' ? 'active' : ''}`}
  >
    AI
  </button>
  <button
    onClick={() => setUiMode('classic')}
    className={`mode-toggle-option ${uiMode === 'classic' ? 'active' : ''}`}
  >
    Classic
  </button>
</div>
```

Import `useAccount` to get `uiMode` and `setUiMode`:
```tsx
const { logout, uiMode, setUiMode } = useAccount()
```

Remove the `isLoggedIn` prop — use `isLoggedIn` from context instead.

**Step 2: Commit**

```bash
git add apps/web/src/components/Navigation.tsx
git commit -m "feat(web): add AI/Classic mode toggle to navigation"
```

---

### Task 25: Update wallet page with conditional rendering

**Files:**
- Modify: `apps/web/src/app/wallet/page.tsx`

**Step 1: Add conditional rendering**

Import `ChatContainer` and get `uiMode` from context. Render based on mode:

```tsx
import ChatContainer from '@/components/chat/ChatContainer'

// Inside component:
const { isLoggedIn, address, network, currentAccount, uiMode } = useAccount()

// In the return:
if (uiMode === 'ai') {
  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />
      <ChatContainer />
    </div>
  )
}

// ... existing classic dashboard code below
```

Also update `Navigation` usage throughout the wallet pages to not pass `isLoggedIn` prop (since it now reads from context).

**Step 2: Commit**

```bash
git add apps/web/src/app/wallet/page.tsx
git commit -m "feat(web): add AI/Classic conditional rendering on wallet page"
```

---

### Task 26: Add NEXT_PUBLIC_API_URL environment variable

**Files:**
- Modify or create: `apps/web/.env.local`

**Step 1: Add env variable**

```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**Step 2: Commit** (do NOT commit .env.local — it should be in .gitignore)

Instead, add to `apps/web/.env.example`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

```bash
git add apps/web/.env.example
git commit -m "feat(web): add API URL env variable example"
```

---

### Task 27: End-to-end testing

**Step 1: Start API**

```bash
cd "/Users/daniillogachev/Ma project/E-Y/apps/api" && pnpm dev
```

Verify Claude provider is loaded (no startup errors).

**Step 2: Start web app**

```bash
cd "/Users/daniillogachev/Ma project/E-Y/apps/web" && pnpm dev
```

**Step 3: Test AI mode**

1. Open http://localhost:3001/wallet
2. Verify toggle shows "AI" / "Classic" — should default to "AI"
3. See balance panel at top
4. See chat area with empty state
5. See suggestion chips
6. Type "баланс" — verify response and card
7. Type "история" — verify history card
8. Type "отправь 0.01 eth @testuser" — verify editable send preview card
9. Click edit on amount field, change it, verify no LLM re-call
10. Click "Send" — verify confirm modal appears with password input
11. Switch to "Classic" mode — verify standard dashboard appears
12. Switch back to "AI" — verify chat state is preserved

**Step 4: Test mobile still works**

Open mobile app, go to AI tab, send a message. Verify Claude responds instead of Gemini.

**Step 5: Fix any issues found**

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: AI-first wallet interface — complete implementation"
```

---

## Summary

| Phase | Tasks | Estimated effort |
|-------|-------|-----------------|
| Phase 1: Backend Claude Provider | Tasks 1-8 | Core backend changes |
| Phase 2: Web Socket + Hook | Tasks 9-12 | Service layer |
| Phase 3: Chat UI Components | Tasks 13-17 | UI components |
| Phase 4: Rich Cards | Tasks 18-22 | Interactive cards |
| Phase 5: Integration | Tasks 23-27 | Wire everything together |

**Total: 27 tasks across 5 phases.**

**Key dependencies:**
- Phase 2 depends on Phase 1 (backend must work first)
- Phase 3 and 4 can be done in parallel
- Phase 5 depends on all previous phases
