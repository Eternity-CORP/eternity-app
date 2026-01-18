/**
 * BLIK WebSocket Service
 * Handles real-time BLIK code operations via Socket.IO
 */

import { io, Socket } from 'socket.io-client';
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
} from '@e-y/shared';
import { API_BASE_URL } from '@/src/config/api';
import { createLogger } from '@/src/utils/logger';

const log = createLogger('BlikService');

export interface BlikCallbacks {
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

class BlikSocketService {
  private socket: Socket | null = null;
  private callbacks: BlikCallbacks = {};
  private isConnecting = false;
  private receiverAddress: string | null = null;

  /**
   * Connect to the BLIK WebSocket server
   */
  connect(address?: string): Promise<void> {
    if (this.socket?.connected) {
      if (address) {
        this.receiverAddress = address;
        this.register(address);
      }
      return Promise.resolve();
    }

    if (this.isConnecting) {
      return new Promise((resolve) => {
        const checkConnection = setInterval(() => {
          if (this.socket?.connected) {
            clearInterval(checkConnection);
            resolve();
          }
        }, 100);
      });
    }

    this.isConnecting = true;
    if (address) {
      this.receiverAddress = address;
    }

    return new Promise((resolve) => {
      this.socket = io(`${API_BASE_URL}/blik`, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        log.info('Connected to BLIK WebSocket');
        this.isConnecting = false;

        if (this.receiverAddress) {
          this.register(this.receiverAddress);
        }

        resolve();
      });

      this.socket.on('connect_error', (error) => {
        log.warn('BLIK WebSocket connection error', { message: error.message });
        this.isConnecting = false;
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        log.debug('Disconnected from BLIK WebSocket', { reason });
      });

      this.setupEventListeners();

      setTimeout(() => {
        if (this.isConnecting) {
          this.isConnecting = false;
          resolve();
        }
      }, 5000);
    });
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on(BLIK_EVENTS.CODE_CREATED, (payload: CodeCreatedPayload) => {
      this.callbacks.onCodeCreated?.(payload);
    });

    this.socket.on(BLIK_EVENTS.CODE_LOOKUP, (payload: CodeLookupPayload) => {
      this.callbacks.onCodeLookup?.(payload);
    });

    this.socket.on(BLIK_EVENTS.PAYMENT_CONFIRMED, (payload: PaymentConfirmedPayload) => {
      this.callbacks.onPaymentConfirmed?.(payload);
    });

    this.socket.on(BLIK_EVENTS.CODE_EXPIRED, (payload: CodeExpiredPayload) => {
      this.callbacks.onCodeExpired?.(payload);
    });

    this.socket.on(BLIK_EVENTS.CODE_CANCELLED, (payload: CodeCancelledPayload) => {
      this.callbacks.onCodeCancelled?.(payload);
    });

    this.socket.on(BLIK_EVENTS.CODE_INFO, (payload: CodeInfoPayload) => {
      this.callbacks.onCodeInfo?.(payload);
    });

    this.socket.on(BLIK_EVENTS.CODE_NOT_FOUND, (payload: CodeNotFoundPayload) => {
      this.callbacks.onCodeNotFound?.(payload);
    });

    this.socket.on(BLIK_EVENTS.PAYMENT_ACCEPTED, (payload: PaymentAcceptedPayload) => {
      this.callbacks.onPaymentAccepted?.(payload);
    });

    this.socket.on('error', (error: { message: string }) => {
      log.warn('BLIK WebSocket error', error);
      this.callbacks.onError?.(error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.callbacks = {};
    this.receiverAddress = null;
  }

  setCallbacks(callbacks: BlikCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  clearCallbacks(): void {
    this.callbacks = {};
  }

  register(receiverAddress: string): void {
    this.receiverAddress = receiverAddress;
    if (this.socket?.connected) {
      this.socket.emit('register', { receiverAddress });
    }
  }

  createCode(payload: CreateCodePayload): void {
    if (!this.socket?.connected) {
      this.callbacks.onError?.({ message: 'Not connected to server' });
      return;
    }
    this.socket.emit(BLIK_EVENTS.CREATE_CODE, payload);
  }

  cancelCode(payload: CancelCodePayload): void {
    if (!this.socket?.connected) {
      this.callbacks.onError?.({ message: 'Not connected to server' });
      return;
    }
    this.socket.emit(BLIK_EVENTS.CANCEL_CODE, payload);
  }

  lookupCode(payload: LookupCodePayload): void {
    if (!this.socket?.connected) {
      this.callbacks.onError?.({ message: 'Not connected to server' });
      return;
    }
    this.socket.emit(BLIK_EVENTS.LOOKUP_CODE, payload);
  }

  confirmPayment(payload: ConfirmPaymentPayload): void {
    if (!this.socket?.connected) {
      this.callbacks.onError?.({ message: 'Not connected to server' });
      return;
    }
    this.socket.emit(BLIK_EVENTS.CONFIRM_PAYMENT, payload);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const blikSocket = new BlikSocketService();
