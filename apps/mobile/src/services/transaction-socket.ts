/**
 * Transaction WebSocket Service
 * Handles real-time transaction status updates via Socket.IO
 *
 * Uses shared socket factory for event wiring.
 * Keeps: socket creation, auto-connect, lifecycle (platform-specific).
 */

import { io, Socket } from 'socket.io-client';
import {
  createTransactionSocketService,
  type TransactionSocketService,
  type TransactionStatusUpdate,
  type StatusUpdateCallback,
} from '@e-y/shared';
import { API_BASE_URL } from '@/src/config/api';
import { createLogger } from '@/src/utils/logger';

const log = createLogger('TransactionSocket');

export type { TransactionStatusUpdate };

class TransactionSocketServiceWrapper {
  private socket: Socket | null = null;
  private sharedService: TransactionSocketService | null = null;
  private isConnecting = false;

  /**
   * Connect to the transaction WebSocket server
   */
  connect(): Promise<void> {
    if (this.socket?.connected) {
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

    return new Promise((resolve) => {
      this.socket = io(`${API_BASE_URL}/transactions`, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      // Create shared service that wires up event listeners
      this.sharedService = createTransactionSocketService(this.socket);

      this.socket.on('connect', () => {
        log.info('Connected to transaction WebSocket');
        this.isConnecting = false;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        log.warn('Connection error', { message: error.message });
        this.isConnecting = false;
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        log.info('Disconnected', { reason });
      });

      this.socket.on('error', (error: { message: string }) => {
        log.warn('Socket error', { message: error.message });
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.isConnecting) {
          this.isConnecting = false;
          resolve();
        }
      }, 5000);
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.sharedService) {
      this.sharedService = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Subscribe to updates for a specific transaction
   */
  subscribe(txHash: string, userAddress: string, callback: StatusUpdateCallback, chainId?: number): void {
    // Connect if not connected, then subscribe via shared service
    this.connect().then(() => {
      this.sharedService?.subscribe(txHash, userAddress, callback, chainId);
    });
  }

  /**
   * Unsubscribe from a specific transaction
   */
  unsubscribe(txHash: string): void {
    this.sharedService?.unsubscribe(txHash);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const transactionSocket = new TransactionSocketServiceWrapper();
