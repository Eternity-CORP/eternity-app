export type MessageRole = 'user' | 'assistant' | 'system';
export type MessageContentType = 'text' | 'balance' | 'transaction' | 'error' | 'typing';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  contentType: MessageContentType;
  content: string | BalanceContent | TransactionContent;
  timestamp: Date;
}

export interface BalanceContent {
  total: string;
  totalUsd: string;
  tokens: TokenBalance[];
}

export interface TokenBalance {
  symbol: string;
  balance: string;
  usdValue: string;
  network: string;
}

export interface TransactionContent {
  recipient: string;
  recipientAddress: string;
  amount: string;
  tokenSymbol: string;
  fiatAmount: string;
  fee: string;
  network: string;
  riskLevel: 'safe' | 'caution' | 'warning';
  riskReasons?: string[];
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  command: string;
}

export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  { id: 'balance', label: 'Balance', icon: 'wallet-outline', command: "What's my balance?" },
  { id: 'send', label: 'Send', icon: 'paper-plane-outline', command: 'send' },
  { id: 'swap', label: 'Swap', icon: 'swap-horizontal-outline', command: 'swap' },
  { id: 'history', label: 'History', icon: 'time-outline', command: 'Show my recent transactions' },
];
