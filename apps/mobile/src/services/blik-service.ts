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

// Use shared API URL configuration
const API_URL = API_BASE_URL;

export interface BlikCallbacks {
  // Receiver callbacks
  onCodeCreated?: (payload: CodeCreatedPayload) => void;
  onCodeLookup?: (payload: CodeLookupPayload) => void;
  onPaymentConfirmed?: (payload: PaymentConfirmedPayload) => void;
  onCodeExpired?: (payload: CodeExpiredPayload) => void;
  onCodeCancelled?: (payload: CodeCancelledPayload) => void;

  // Sender callbacks
  onCodeInfo?: (payload: CodeInfoPayload) => void;
  onCodeNotFound?: (payload: CodeNotFoundPayload) => void;
  onPaymentAccepted?: (payload: PaymentAcceptedPayload) => void;

  // Error callback
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
      // Update address if provided
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

    return new Promise((resolve, reject) => {
      this.socket = io(`${API_URL}/blik`, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('Connected to BLIK WebSocket');
        this.isConnecting = false;

        // Re-register on reconnect
        if (this.receiverAddress) {
          this.register(this.receiverAddress);
        }

        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.warn('BLIK WebSocket connection error:', error.message);
        this.isConnecting = false;
        // Don't reject - allow offline functionality
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from BLIK WebSocket:', reason);
      });

      // Set up event listeners
      this.setupEventListeners();

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.isConnecting) {
          this.isConnecting = false;
          resolve(); // Don't reject - allow offline functionality
        }
      }, 5000);
    });
  }

  /**
   * Set up Socket.IO event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Receiver events
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

    // Sender events
    this.socket.on(BLIK_EVENTS.CODE_INFO, (payload: CodeInfoPayload) => {
      this.callbacks.onCodeInfo?.(payload);
    });

    this.socket.on(BLIK_EVENTS.CODE_NOT_FOUND, (payload: CodeNotFoundPayload) => {
      this.callbacks.onCodeNotFound?.(payload);
    });

    this.socket.on(BLIK_EVENTS.PAYMENT_ACCEPTED, (payload: PaymentAcceptedPayload) => {
      this.callbacks.onPaymentAccepted?.(payload);
    });

    // Error event
    this.socket.on('error', (error: { message: string }) => {
      console.warn('BLIK WebSocket error:', error.message);
      this.callbacks.onError?.(error);
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.callbacks = {};
    this.receiverAddress = null;
  }

  /**
   * Set callbacks for BLIK events
   */
  setCallbacks(callbacks: BlikCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Clear all callbacks
   */
  clearCallbacks(): void {
    this.callbacks = {};
  }

  /**
   * Register receiver address (for reconnection)
   */
  register(receiverAddress: string): void {
    this.receiverAddress = receiverAddress;
    if (this.socket?.connected) {
      this.socket.emit('register', { receiverAddress });
    }
  }

  // ============================================
  // Receiver Actions
  // ============================================

  /**
   * Create a new BLIK code
   */
  createCode(payload: CreateCodePayload): void {
    if (!this.socket?.connected) {
      this.callbacks.onError?.({ message: 'Not connected to server' });
      return;
    }
    this.socket.emit(BLIK_EVENTS.CREATE_CODE, payload);
  }

  /**
   * Cancel an existing BLIK code
   */
  cancelCode(payload: CancelCodePayload): void {
    if (!this.socket?.connected) {
      this.callbacks.onError?.({ message: 'Not connected to server' });
      return;
    }
    this.socket.emit(BLIK_EVENTS.CANCEL_CODE, payload);
  }

  // ============================================
  // Sender Actions
  // ============================================

  /**
   * Look up a BLIK code
   */
  lookupCode(payload: LookupCodePayload): void {
    if (!this.socket?.connected) {
      this.callbacks.onError?.({ message: 'Not connected to server' });
      return;
    }
    this.socket.emit(BLIK_EVENTS.LOOKUP_CODE, payload);
  }

  /**
   * Confirm payment for a BLIK code
   */
  confirmPayment(payload: ConfirmPaymentPayload): void {
    if (!this.socket?.connected) {
      this.callbacks.onError?.({ message: 'Not connected to server' });
      return;
    }
    this.socket.emit(BLIK_EVENTS.CONFIRM_PAYMENT, payload);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const blikSocket = new BlikSocketService();
