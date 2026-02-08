/**
 * BLIK Socket Factory
 * Creates a typed BLIK service from any SocketLike instance.
 * Zero dependencies — socket creation is done by the app.
 */

import type { SocketLike } from './socket-types';
import {
  BLIK_EVENTS,
  type CreateCodePayload,
  type CancelCodePayload,
  type LookupCodePayload,
  type ConfirmPaymentPayload,
  type CodeCreatedPayload,
  type CodeInfoPayload,
  type CodeNotFoundPayload,
  type PaymentConfirmedPayload,
  type PaymentAcceptedPayload,
  type CodeExpiredPayload,
  type CodeLookupPayload,
  type CodeCancelledPayload,
} from '../types/blik';

export interface BlikSocketCallbacks {
  onCodeCreated?: (payload: CodeCreatedPayload) => void;
  onCodeLookup?: (payload: CodeLookupPayload) => void;
  onPaymentConfirmed?: (payload: PaymentConfirmedPayload) => void;
  onCodeExpired?: (payload: CodeExpiredPayload) => void;
  onCodeCancelled?: (payload: CodeCancelledPayload) => void;
  onCodeInfo?: (payload: CodeInfoPayload) => void;
  onCodeNotFound?: (payload: CodeNotFoundPayload) => void;
  onPaymentAccepted?: (payload: PaymentAcceptedPayload) => void;
  onError?: (error: { message: string }) => void;
}

export interface BlikSocketService {
  register(receiverAddress: string): void;
  createCode(payload: CreateCodePayload): void;
  cancelCode(payload: CancelCodePayload): void;
  lookupCode(payload: LookupCodePayload): void;
  confirmPayment(payload: ConfirmPaymentPayload): void;
  setCallbacks(callbacks: BlikSocketCallbacks): void;
  clearCallbacks(): void;
}

export function createBlikSocketService(socket: SocketLike): BlikSocketService {
  let callbacks: BlikSocketCallbacks = {};

  // Set up event listeners
  socket.on(BLIK_EVENTS.CODE_CREATED, (payload: unknown) => {
    callbacks.onCodeCreated?.(payload as CodeCreatedPayload);
  });

  socket.on(BLIK_EVENTS.CODE_LOOKUP, (payload: unknown) => {
    callbacks.onCodeLookup?.(payload as CodeLookupPayload);
  });

  socket.on(BLIK_EVENTS.PAYMENT_CONFIRMED, (payload: unknown) => {
    callbacks.onPaymentConfirmed?.(payload as PaymentConfirmedPayload);
  });

  socket.on(BLIK_EVENTS.CODE_EXPIRED, (payload: unknown) => {
    callbacks.onCodeExpired?.(payload as CodeExpiredPayload);
  });

  socket.on(BLIK_EVENTS.CODE_CANCELLED, (payload: unknown) => {
    callbacks.onCodeCancelled?.(payload as CodeCancelledPayload);
  });

  socket.on(BLIK_EVENTS.CODE_INFO, (payload: unknown) => {
    callbacks.onCodeInfo?.(payload as CodeInfoPayload);
  });

  socket.on(BLIK_EVENTS.CODE_NOT_FOUND, (payload: unknown) => {
    callbacks.onCodeNotFound?.(payload as CodeNotFoundPayload);
  });

  socket.on(BLIK_EVENTS.PAYMENT_ACCEPTED, (payload: unknown) => {
    callbacks.onPaymentAccepted?.(payload as PaymentAcceptedPayload);
  });

  socket.on('error', (error: unknown) => {
    callbacks.onError?.(error as { message: string });
  });

  return {
    register(receiverAddress: string): void {
      if (socket.connected) {
        socket.emit('register', { receiverAddress });
      }
    },

    createCode(payload: CreateCodePayload): void {
      if (!socket.connected) {
        callbacks.onError?.({ message: 'Not connected to server' });
        return;
      }
      socket.emit(BLIK_EVENTS.CREATE_CODE, payload);
    },

    cancelCode(payload: CancelCodePayload): void {
      if (!socket.connected) {
        callbacks.onError?.({ message: 'Not connected to server' });
        return;
      }
      socket.emit(BLIK_EVENTS.CANCEL_CODE, payload);
    },

    lookupCode(payload: LookupCodePayload): void {
      if (!socket.connected) {
        callbacks.onError?.({ message: 'Not connected to server' });
        return;
      }
      socket.emit(BLIK_EVENTS.LOOKUP_CODE, payload);
    },

    confirmPayment(payload: ConfirmPaymentPayload): void {
      if (!socket.connected) {
        callbacks.onError?.({ message: 'Not connected to server' });
        return;
      }
      socket.emit(BLIK_EVENTS.CONFIRM_PAYMENT, payload);
    },

    setCallbacks(newCallbacks: BlikSocketCallbacks): void {
      callbacks = { ...callbacks, ...newCallbacks };
    },

    clearCallbacks(): void {
      callbacks = {};
    },
  };
}
