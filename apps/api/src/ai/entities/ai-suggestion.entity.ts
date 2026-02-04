/**
 * AI Suggestion interface
 * Stores proactive suggestions for users
 */

export type SuggestionType =
  | 'payment_reminder'
  | 'security_alert'
  | 'transaction_tip'
  | 'savings_tip'
  | 'contact_suggestion';

export type SuggestionPriority = 'low' | 'medium' | 'high';

export type SuggestionStatus = 'pending' | 'shown' | 'dismissed' | 'actioned';

export interface SuggestionAction {
  label: string;
  route?: string;
  type?: string;
  payload?: Record<string, unknown>;
}

export interface AiSuggestion {
  id: string;
  userAddress: string;
  type: SuggestionType;
  title: string;
  message: string;
  action: SuggestionAction | null;
  priority: SuggestionPriority;
  status: SuggestionStatus;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  shownAt: Date | null;
  dismissedAt: Date | null;
  actionedAt: Date | null;
  expiresAt: Date | null;
}
