/**
 * BLIK WebSocket Service
 * Handles real-time BLIK code operations via Socket.IO
 *
 * Uses shared socket factory for event wiring.
 * Keeps: socket creation, reconnection lifecycle (platform-specific).
 */

import { io, Socket } from 'socket.io-client';
import {
  createBlikSocketService,
  type BlikSocketService,
  type BlikSocketCallbacks,
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

class BlikSocketServiceWrapper {
  private socket: Socket | null = null;
  private sharedService: BlikSocketService | null = null;
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
        this.sharedService?.register(address);
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

      // Create shared service that wires up all event listeners
      this.sharedService = createBlikSocketService(this.socket);
      this.syncCallbacksToShared();

      this.socket.on('connect', () => {
        log.info('Connected to BLIK WebSocket');
        this.isConnecting = false;

        if (this.receiverAddress) {
          this.sharedService?.register(this.receiverAddress);
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

      setTimeout(() => {
        if (this.isConnecting) {
          this.isConnecting = false;
          resolve();
        }
      }, 5000);
    });
  }

  /**
   * Sync local callbacks to shared service
   */
  private syncCallbacksToShared(): void {
    if (!this.sharedService) return;

    this.sharedService.setCallbacks({
      onCodeCreated: (payload) => this.callbacks.onCodeCreated?.(payload),
      onCodeLookup: (payload) => this.callbacks.onCodeLookup?.(payload),
      onPaymentConfirmed: (payload) => this.callbacks.onPaymentConfirmed?.(payload),
      onCodeExpired: (payload) => this.callbacks.onCodeExpired?.(payload),
      onCodeCancelled: (payload) => this.callbacks.onCodeCancelled?.(payload),
      onCodeInfo: (payload) => this.callbacks.onCodeInfo?.(payload),
      onCodeNotFound: (payload) => this.callbacks.onCodeNotFound?.(payload),
      onPaymentAccepted: (payload) => this.callbacks.onPaymentAccepted?.(payload),
      onError: (error) => this.callbacks.onError?.(error),
    });
  }

  disconnect(): void {
    if (this.sharedService) {
      this.sharedService.clearCallbacks();
      this.sharedService = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.callbacks = {};
    this.receiverAddress = null;
  }

  setCallbacks(callbacks: BlikCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
    this.syncCallbacksToShared();
  }

  clearCallbacks(): void {
    this.callbacks = {};
    this.sharedService?.clearCallbacks();
  }

  register(receiverAddress: string): void {
    this.receiverAddress = receiverAddress;
    this.sharedService?.register(receiverAddress);
  }

  createCode(payload: CreateCodePayload): void {
    if (!this.sharedService) {
      this.callbacks.onError?.({ message: 'Not connected to server' });
      return;
    }
    this.sharedService.createCode(payload);
  }

  cancelCode(payload: CancelCodePayload): void {
    if (!this.sharedService) {
      this.callbacks.onError?.({ message: 'Not connected to server' });
      return;
    }
    this.sharedService.cancelCode(payload);
  }

  lookupCode(payload: LookupCodePayload): void {
    if (!this.sharedService) {
      this.callbacks.onError?.({ message: 'Not connected to server' });
      return;
    }
    this.sharedService.lookupCode(payload);
  }

  confirmPayment(payload: ConfirmPaymentPayload): void {
    if (!this.sharedService) {
      this.callbacks.onError?.({ message: 'Not connected to server' });
      return;
    }
    this.sharedService.confirmPayment(payload);
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const blikSocket = new BlikSocketServiceWrapper();
