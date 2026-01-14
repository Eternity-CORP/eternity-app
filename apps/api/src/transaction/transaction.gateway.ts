/**
 * Transaction WebSocket Gateway
 * Provides real-time transaction status updates
 */

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

interface PendingTransaction {
  txHash: string;
  clientId: string;
  userAddress: string;
  startTime: number;
}

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
const NETWORK = process.env.NETWORK || 'sepolia';

const getAlchemyUrl = (): string | null => {
  if (!ALCHEMY_API_KEY) return null;
  return `https://eth-${NETWORK}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
};

@WebSocketGateway({
  namespace: '/transactions',
  cors: {
    origin: '*',
  },
})
export class TransactionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private pendingTransactions: Map<string, PendingTransaction> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;

  handleConnection(client: Socket) {
    console.log(`Client connected to Transaction gateway: ${client.id}`);
    this.startPollingIfNeeded();
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected from Transaction gateway: ${client.id}`);
    // Remove all pending transactions for this client
    for (const [txHash, tx] of this.pendingTransactions.entries()) {
      if (tx.clientId === client.id) {
        this.pendingTransactions.delete(txHash);
      }
    }
    this.stopPollingIfNotNeeded();
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: { txHash: string; userAddress: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { txHash, userAddress } = data;

    if (!txHash || !userAddress) {
      client.emit('error', { message: 'txHash and userAddress are required' });
      return;
    }

    // Add to pending transactions
    this.pendingTransactions.set(txHash, {
      txHash,
      clientId: client.id,
      userAddress,
      startTime: Date.now(),
    });

    // Join room for this transaction
    client.join(`tx:${txHash}`);

    console.log(`Client ${client.id} subscribed to transaction ${txHash}`);

    // Immediately check status
    this.checkTransactionStatus(txHash);

    return { subscribed: true, txHash };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() data: { txHash: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { txHash } = data;

    this.pendingTransactions.delete(txHash);
    client.leave(`tx:${txHash}`);

    console.log(`Client ${client.id} unsubscribed from transaction ${txHash}`);

    return { unsubscribed: true, txHash };
  }

  private startPollingIfNeeded() {
    if (this.pollingInterval || this.pendingTransactions.size === 0) {
      return;
    }

    // Poll every 3 seconds
    this.pollingInterval = setInterval(() => {
      this.pollPendingTransactions();
    }, 3000);

    console.log('Started transaction polling');
  }

  private stopPollingIfNotNeeded() {
    if (this.pendingTransactions.size === 0 && this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('Stopped transaction polling');
    }
  }

  private async pollPendingTransactions() {
    for (const [txHash] of this.pendingTransactions.entries()) {
      await this.checkTransactionStatus(txHash);
    }
  }

  private async checkTransactionStatus(txHash: string) {
    const pendingTx = this.pendingTransactions.get(txHash);
    if (!pendingTx) return;

    const alchemyUrl = getAlchemyUrl();
    if (!alchemyUrl) {
      console.warn('ALCHEMY_API_KEY not set, cannot check transaction status');
      return;
    }

    try {
      const response = await fetch(alchemyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getTransactionReceipt',
          params: [txHash],
        }),
      });

      const data = await response.json();
      const receipt = data.result;

      if (receipt) {
        // Transaction is confirmed or failed
        const status = receipt.status === '0x1' ? 'confirmed' : 'failed';
        const gasUsed = parseInt(receipt.gasUsed, 16).toString();

        this.server.to(`tx:${txHash}`).emit('status-update', {
          txHash,
          status,
          blockNumber: parseInt(receipt.blockNumber, 16),
          gasUsed,
          confirmations: 1,
        });

        // Remove from pending
        this.pendingTransactions.delete(txHash);
        this.stopPollingIfNotNeeded();

        console.log(`Transaction ${txHash} ${status}`);
      } else {
        // Still pending - emit pending status
        this.server.to(`tx:${txHash}`).emit('status-update', {
          txHash,
          status: 'pending',
          confirmations: 0,
        });
      }

      // Check for timeout (10 minutes)
      if (Date.now() - pendingTx.startTime > 10 * 60 * 1000) {
        this.server.to(`tx:${txHash}`).emit('status-update', {
          txHash,
          status: 'timeout',
          message: 'Transaction monitoring timed out',
        });
        this.pendingTransactions.delete(txHash);
        this.stopPollingIfNotNeeded();
      }
    } catch (error) {
      console.error(`Error checking transaction ${txHash}:`, error);
    }
  }
}
