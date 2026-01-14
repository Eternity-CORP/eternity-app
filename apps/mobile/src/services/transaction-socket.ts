/**
 * Transaction WebSocket Service
 * Handles real-time transaction status updates via Socket.IO
 */

import { io, Socket } from 'socket.io-client';

// API URL - use environment variable or default to localhost
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export interface TransactionStatusUpdate {
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed' | 'timeout';
  blockNumber?: number;
  gasUsed?: string;
  confirmations?: number;
  message?: string;
}

type StatusUpdateCallback = (update: TransactionStatusUpdate) => void;

class TransactionSocketService {
  private socket: Socket | null = null;
  private callbacks: Map<string, StatusUpdateCallback[]> = new Map();
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

    return new Promise((resolve, reject) => {
      this.socket = io(`${API_URL}/transactions`, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('Connected to transaction WebSocket');
        this.isConnecting = false;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.warn('Transaction WebSocket connection error:', error.message);
        this.isConnecting = false;
        // Don't reject - allow offline functionality
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from transaction WebSocket:', reason);
      });

      this.socket.on('status-update', (update: TransactionStatusUpdate) => {
        this.handleStatusUpdate(update);
      });

      this.socket.on('error', (error: { message: string }) => {
        console.warn('Transaction WebSocket error:', error.message);
      });

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
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.callbacks.clear();
  }

  /**
   * Subscribe to updates for a specific transaction
   */
  subscribe(txHash: string, userAddress: string, callback: StatusUpdateCallback): void {
    // Store callback
    const existing = this.callbacks.get(txHash) || [];
    existing.push(callback);
    this.callbacks.set(txHash, existing);

    // Connect if not connected
    this.connect().then(() => {
      if (this.socket?.connected) {
        this.socket.emit('subscribe', { txHash, userAddress });
      }
    });
  }

  /**
   * Unsubscribe from a specific transaction
   */
  unsubscribe(txHash: string): void {
    this.callbacks.delete(txHash);

    if (this.socket?.connected) {
      this.socket.emit('unsubscribe', { txHash });
    }
  }

  /**
   * Handle incoming status updates
   */
  private handleStatusUpdate(update: TransactionStatusUpdate): void {
    const callbacks = this.callbacks.get(update.txHash);
    if (callbacks) {
      callbacks.forEach((callback) => callback(update));
    }

    // Auto-unsubscribe on final status
    if (update.status === 'confirmed' || update.status === 'failed' || update.status === 'timeout') {
      this.callbacks.delete(update.txHash);
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const transactionSocket = new TransactionSocketService();
