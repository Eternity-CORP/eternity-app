/**
 * AI-related shared types
 * Used by both mobile client and API server
 */

// ============================================
// Event Constants
// ============================================

export const AI_EVENTS = {
  // Client -> Server
  CHAT: 'chat',
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',

  // Server -> Client
  CHUNK: 'chunk',
  DONE: 'done',
  TOOL_CALL: 'tool_call',
  TOOL_RESULT: 'tool_result',
  SUGGESTION: 'suggestion',
  ERROR: 'error',
} as const;

export type AiEventType = (typeof AI_EVENTS)[keyof typeof AI_EVENTS];

// ============================================
// Chat Types
// ============================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO string for Redux serialization
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

// ============================================
// Preview Types (AI Tool Results)
// ============================================

export interface BlikGeneratePreview {
  type: 'generate';
  id: string;
  code: string;
  amount: string;
  token: string;
  amountUsd: string;
  expiresAt: number;
  status: 'pending' | 'paid' | 'expired';
}

export interface BlikPayPreview {
  type: 'pay';
  id: string;
  code: string;
  receiverAddress: string;
  receiverUsername?: string;
  amount: string;
  token: string;
  amountUsd: string;
  estimatedGas: string;
  estimatedGasUsd: string;
  network: string;
  status: 'pending_confirmation';
}

export type BlikPreview = BlikGeneratePreview | BlikPayPreview;

export interface SwapPreview {
  id: string;
  fromToken: {
    symbol: string;
    amount: string;
    amountUsd: string;
  };
  toToken: {
    symbol: string;
    amount: string;
    amountUsd: string;
  };
  rate: string;
  priceImpact: string;
  estimatedGas: string;
  estimatedGasUsd: string;
  slippage: string;
  network: string;
  requiresApproval: boolean;
  status: 'pending_confirmation';
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
  status?: 'pending_confirmation';
}

// ============================================
// Scheduled Payment Preview
// ============================================

export interface ScheduledPaymentPreview {
  recipient: string;
  recipientUsername?: string;
  amount: string;
  token: string;
  scheduledAt: string;
  recurring: 'once' | 'daily' | 'weekly' | 'monthly';
  description?: string;
  status: 'pending_confirmation';
}

// ============================================
// Split Bill Preview
// ============================================

export interface SplitPreview {
  totalAmount: string;
  token: string;
  description?: string;
  perPerson: string;
  splitType?: 'split_with_me' | 'collect';
  participants: Array<{
    address: string;
    username?: string;
    name?: string;
    amount: string;
  }>;
  creatorUsername?: string;
  status: 'pending_confirmation';
}

// ============================================
// Response Payloads
// ============================================

export interface DonePayload {
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  pendingTransaction?: TransactionPreview;
  pendingBlik?: BlikPreview;
  pendingSwap?: SwapPreview;
  pendingUsername?: UsernamePreview;
  pendingScheduled?: ScheduledPaymentPreview;
  pendingSplit?: SplitPreview;
}

export interface AiErrorPayload {
  code: string;
  message: string;
}

// ============================================
// Suggestions
// ============================================

export type SuggestionType =
  | 'payment_reminder'
  | 'security_alert'
  | 'transaction_tip'
  | 'savings_tip'
  | 'contact_suggestion';

export type SuggestionPriority = 'low' | 'medium' | 'high';

export interface AiSuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  message: string;
  priority: SuggestionPriority;
  createdAt: Date | string;
  action?: {
    label: string;
    route?: string;
    type?: string;
    payload?: unknown;
  };
}

// ============================================
// Chat Request/Response
// ============================================

export interface ChatRequest {
  content: string;
  userAddress: string;
  language?: string;
  conversationId?: string;
}

export interface ToolExecutionRequest {
  tool: string;
  args: Record<string, unknown>;
  userAddress: string;
}

// ============================================
// AI Contact (for recipient resolution)
// ============================================

/** Simplified contact sent via WebSocket for AI context */
export interface AiContact {
  name: string;
  address: string;
  username?: string;
}

/** Payload for AI subscribe event (extends base with contacts) */
export interface AiSubscribePayload {
  address: string;
  contacts?: AiContact[];
}

// ============================================
// Username Registration Preview
// ============================================

export interface UsernamePreview {
  username: string;
  address: string;
  status: 'pending_confirmation';
  messageToSign?: string;
  timestamp?: number;
}
