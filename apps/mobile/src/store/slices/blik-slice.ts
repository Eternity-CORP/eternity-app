/**
 * BLIK Redux Slice
 * Manages BLIK code state for both receiver and sender flows
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  CodeCreatedPayload,
  CodeInfoPayload,
  PaymentConfirmedPayload,
} from '@e-y/shared';

// ============================================
// Types
// ============================================

export type ReceiverStatus = 'idle' | 'creating' | 'waiting' | 'payment_received' | 'expired' | 'cancelled' | 'error';
export type SenderStatus = 'idle' | 'looking_up' | 'found' | 'not_found' | 'confirming' | 'confirmed' | 'error';

export interface BlikState {
  // Receiver state (create code flow)
  receiver: {
    status: ReceiverStatus;
    activeCode: CodeCreatedPayload | null;
    paymentInfo: PaymentConfirmedPayload | null;
    error: string | null;
  };

  // Sender state (enter code flow)
  sender: {
    status: SenderStatus;
    enteredCode: string;
    codeInfo: CodeInfoPayload | null;
    txHash: string | null;
    selectedNetwork: string;
    error: string | null;
  };
}

const initialState: BlikState = {
  receiver: {
    status: 'idle',
    activeCode: null,
    paymentInfo: null,
    error: null,
  },
  sender: {
    status: 'idle',
    enteredCode: '',
    codeInfo: null,
    txHash: null,
    selectedNetwork: 'sepolia',
    error: null,
  },
};

// ============================================
// Slice
// ============================================

const blikSlice = createSlice({
  name: 'blik',
  initialState,
  reducers: {
    // ========================================
    // Receiver Actions
    // ========================================

    /**
     * Start creating a code
     */
    receiverStartCreating: (state) => {
      state.receiver.status = 'creating';
      state.receiver.error = null;
    },

    /**
     * Code was created successfully
     */
    receiverCodeCreated: (state, action: PayloadAction<CodeCreatedPayload>) => {
      state.receiver.status = 'waiting';
      state.receiver.activeCode = action.payload;
      state.receiver.error = null;
    },

    /**
     * Payment was confirmed by sender
     */
    receiverPaymentConfirmed: (state, action: PayloadAction<PaymentConfirmedPayload>) => {
      state.receiver.status = 'payment_received';
      state.receiver.paymentInfo = action.payload;
    },

    /**
     * Code expired
     */
    receiverCodeExpired: (state) => {
      state.receiver.status = 'expired';
      state.receiver.activeCode = null;
    },

    /**
     * Code was cancelled
     */
    receiverCodeCancelled: (state) => {
      state.receiver.status = 'cancelled';
      state.receiver.activeCode = null;
    },

    /**
     * Error occurred
     */
    receiverError: (state, action: PayloadAction<string>) => {
      state.receiver.status = 'error';
      state.receiver.error = action.payload;
    },

    /**
     * Reset receiver state
     */
    receiverReset: (state) => {
      state.receiver = initialState.receiver;
    },

    // ========================================
    // Sender Actions
    // ========================================

    /**
     * Update entered code
     */
    senderSetCode: (state, action: PayloadAction<string>) => {
      state.sender.enteredCode = action.payload;
      // Clear previous lookup if code changes
      if (state.sender.codeInfo && state.sender.codeInfo.code !== action.payload) {
        state.sender.codeInfo = null;
        state.sender.status = 'idle';
      }
    },

    /**
     * Start looking up a code
     */
    senderStartLookup: (state) => {
      state.sender.status = 'looking_up';
      state.sender.error = null;
    },

    /**
     * Code was found
     */
    senderCodeFound: (state, action: PayloadAction<CodeInfoPayload>) => {
      state.sender.status = 'found';
      state.sender.codeInfo = action.payload;
      state.sender.error = null;
    },

    /**
     * Code was not found
     */
    senderCodeNotFound: (state, action: PayloadAction<string>) => {
      state.sender.status = 'not_found';
      state.sender.codeInfo = null;
      state.sender.error = action.payload;
    },

    /**
     * Set selected network
     */
    senderSetNetwork: (state, action: PayloadAction<string>) => {
      state.sender.selectedNetwork = action.payload;
    },

    /**
     * Start confirming payment
     */
    senderStartConfirming: (state) => {
      state.sender.status = 'confirming';
      state.sender.error = null;
    },

    /**
     * Payment was confirmed
     */
    senderPaymentConfirmed: (state, action: PayloadAction<string>) => {
      state.sender.status = 'confirmed';
      state.sender.txHash = action.payload;
    },

    /**
     * Error occurred
     */
    senderError: (state, action: PayloadAction<string>) => {
      state.sender.status = 'error';
      state.sender.error = action.payload;
    },

    /**
     * Reset sender state
     */
    senderReset: (state) => {
      state.sender = initialState.sender;
    },

    // ========================================
    // Global Actions
    // ========================================

    /**
     * Reset all BLIK state
     */
    resetBlik: () => initialState,
  },
});

export const {
  // Receiver actions
  receiverStartCreating,
  receiverCodeCreated,
  receiverPaymentConfirmed,
  receiverCodeExpired,
  receiverCodeCancelled,
  receiverError,
  receiverReset,

  // Sender actions
  senderSetCode,
  senderStartLookup,
  senderCodeFound,
  senderCodeNotFound,
  senderSetNetwork,
  senderStartConfirming,
  senderPaymentConfirmed,
  senderError,
  senderReset,

  // Global actions
  resetBlik,
} = blikSlice.actions;

export default blikSlice.reducer;
