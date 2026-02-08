/**
 * Transaction Socket Factory
 * Creates a typed transaction monitoring service from any SocketLike instance.
 * Zero dependencies — socket creation is done by the app.
 */

import type { SocketLike } from './socket-types';

export interface TransactionStatusUpdate {
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed' | 'timeout';
  blockNumber?: number;
  gasUsed?: string;
  confirmations?: number;
  message?: string;
}

export type StatusUpdateCallback = (update: TransactionStatusUpdate) => void;

export interface TransactionSocketService {
  subscribe(txHash: string, userAddress: string, callback: StatusUpdateCallback): void;
  unsubscribe(txHash: string): void;
}

export function createTransactionSocketService(socket: SocketLike): TransactionSocketService {
  const callbacks = new Map<string, StatusUpdateCallback[]>();

  socket.on('status-update', (update: unknown) => {
    const statusUpdate = update as TransactionStatusUpdate;
    const cbs = callbacks.get(statusUpdate.txHash);
    if (cbs) {
      cbs.forEach((cb) => cb(statusUpdate));
    }

    // Auto-unsubscribe on final status
    if (
      statusUpdate.status === 'confirmed' ||
      statusUpdate.status === 'failed' ||
      statusUpdate.status === 'timeout'
    ) {
      callbacks.delete(statusUpdate.txHash);
    }
  });

  return {
    subscribe(txHash: string, userAddress: string, callback: StatusUpdateCallback): void {
      const existing = callbacks.get(txHash) || [];
      existing.push(callback);
      callbacks.set(txHash, existing);

      if (socket.connected) {
        socket.emit('subscribe', { txHash, userAddress });
      }
    },

    unsubscribe(txHash: string): void {
      callbacks.delete(txHash);
      if (socket.connected) {
        socket.emit('unsubscribe', { txHash });
      }
    },
  };
}
