/**
 * BLIK code-related types
 * Used for P2P crypto transfers via 6-digit codes
 */

export type BlikCodeStatus = 'active' | 'pending' | 'completed' | 'expired';

export interface BlikCode {
  code: string;
  amount: string;
  tokenSymbol: string;
  receiverAddress: string;
  receiverUsername?: string;
  status: BlikCodeStatus;
  expiresAt: string;
  createdAt: string;
}

// ============================================
// WebSocket Event Payloads - Receiver -> Server
// ============================================

export interface CreateCodePayload {
  amount: string;
  tokenSymbol: string;
  receiverAddress: string;
  receiverUsername?: string;
}

export interface CancelCodePayload {
  code: string;
  receiverAddress: string;
}

// ============================================
// WebSocket Event Payloads - Server -> Receiver
// ============================================

export interface CodeCreatedPayload {
  code: string;
  expiresAt: string;
  amount: string;
  tokenSymbol: string;
}

export interface CodeLookupPayload {
  senderAddress: string;
}

export interface PaymentConfirmedPayload {
  txHash: string;
  senderAddress: string;
  network: string;
}

export interface CodeExpiredPayload {
  code: string;
}

export interface CodeCancelledPayload {
  code: string;
}

// ============================================
// WebSocket Event Payloads - Sender -> Server
// ============================================

export interface LookupCodePayload {
  code: string;
  senderAddress: string;
}

export interface ConfirmPaymentPayload {
  code: string;
  txHash: string;
  senderAddress: string;
  network: string;
}

// ============================================
// WebSocket Event Payloads - Server -> Sender
// ============================================

export interface CodeInfoPayload {
  code: string;
  amount: string;
  tokenSymbol: string;
  receiverAddress: string;
  receiverUsername?: string;
  expiresAt: string;
}

export interface CodeNotFoundPayload {
  code: string;
  reason: 'not_found' | 'expired' | 'completed' | 'cancelled';
}

export interface PaymentAcceptedPayload {
  code: string;
  txHash: string;
}

// ============================================
// WebSocket Event Names
// ============================================

export const BLIK_EVENTS = {
  // Receiver -> Server
  CREATE_CODE: 'create-code',
  CANCEL_CODE: 'cancel-code',

  // Sender -> Server
  LOOKUP_CODE: 'lookup-code',
  CONFIRM_PAYMENT: 'confirm-payment',

  // Server -> Receiver
  CODE_CREATED: 'code-created',
  CODE_LOOKUP: 'code-lookup',
  PAYMENT_CONFIRMED: 'payment-confirmed',
  CODE_EXPIRED: 'code-expired',
  CODE_CANCELLED: 'code-cancelled',

  // Server -> Sender
  CODE_INFO: 'code-info',
  CODE_NOT_FOUND: 'code-not-found',
  PAYMENT_ACCEPTED: 'payment-accepted',
} as const;
