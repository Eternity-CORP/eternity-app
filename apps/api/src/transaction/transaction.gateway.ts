/**
 * Transaction WebSocket Gateway
 * Provides real-time transaction status updates across multiple chains.
 *
 * Clients send { txHash, userAddress, chainId? } on 'subscribe'.
 * If chainId is omitted, defaults to Sepolia (11155111) for backward compatibility.
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
import { Logger } from '@nestjs/common';
import {
  CHAIN_RPC_URLS,
  buildChainRpcUrl,
  SEPOLIA_CHAIN_ID,
} from '@e-y/shared';
import {
  verifySocketAuth,
  verifyAddressOwnership,
} from '../common/ws-auth.guard';
import { NotificationsService } from '../notifications/notifications.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PendingTransaction {
  txHash: string;
  clientId: string;
  userAddress: string;
  chainId: number;
  startTime: number;
}

interface RpcResponse {
  jsonrpc: string;
  id: number;
  result: {
    status: string;
    blockNumber: string;
    gasUsed: string;
  } | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || '';
const TX_MONITOR_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const POLL_INTERVAL_MS = 3000; // 3 seconds

// ---------------------------------------------------------------------------
// Gateway
// ---------------------------------------------------------------------------

@WebSocketGateway({
  namespace: '/transactions',
  cors: {
    origin: [process.env.WEB_APP_URL || 'https://e-y-app.vercel.app', 'http://localhost:3001'],
  },
})
export class TransactionGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(TransactionGateway.name);

  @WebSocketServer()
  server: Server;

  private pendingTransactions: Map<string, PendingTransaction> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * RPC URL cache keyed by chainId.
   * Built lazily so we only resolve URLs for chains that are actually used.
   */
  private readonly rpcUrlCache: Map<number, string> = new Map();

  // -----------------------------------------------------------------------
  // Connection lifecycle
  // -----------------------------------------------------------------------

  handleConnection(client: Socket) {
    const authenticated = verifySocketAuth(client);
    this.logger.log(
      `Client connected to Transaction gateway: ${client.id} (authenticated=${authenticated})`,
    );
    this.startPollingIfNeeded();
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from Transaction gateway: ${client.id}`);
    // Remove all pending transactions for this client
    for (const [txHash, tx] of this.pendingTransactions.entries()) {
      if (tx.clientId === client.id) {
        this.pendingTransactions.delete(txHash);
      }
    }
    this.stopPollingIfNotNeeded();
  }

  // -----------------------------------------------------------------------
  // Subscribe / Unsubscribe
  // -----------------------------------------------------------------------

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() data: { txHash: string; userAddress: string; chainId?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const { txHash, userAddress, chainId } = data;

    if (!txHash || !userAddress) {
      client.emit('error', { message: 'txHash and userAddress are required' });
      return;
    }

    // Verify that the userAddress matches the authenticated address
    if (!verifyAddressOwnership(client, userAddress, 'tx subscribe')) {
      client.emit('error', {
        message: 'Address mismatch: you can only subscribe to your own transactions',
      });
      return;
    }

    // Default to Sepolia for backward compatibility (test accounts)
    const resolvedChainId = chainId ?? SEPOLIA_CHAIN_ID;

    // Validate that the chain is supported
    if (!CHAIN_RPC_URLS[resolvedChainId]) {
      client.emit('error', { message: `Unsupported chain ID: ${resolvedChainId}` });
      return;
    }

    // Add to pending transactions
    this.pendingTransactions.set(txHash, {
      txHash,
      clientId: client.id,
      userAddress,
      chainId: resolvedChainId,
      startTime: Date.now(),
    });

    // Join room for this transaction
    client.join(`tx:${txHash}`);

    this.logger.log(
      `Client ${client.id} subscribed to tx ${txHash} on chain ${resolvedChainId}`,
    );

    // Immediately check status
    this.checkTransactionStatus(txHash);

    return { subscribed: true, txHash, chainId: resolvedChainId };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() data: { txHash: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { txHash } = data;

    this.pendingTransactions.delete(txHash);
    client.leave(`tx:${txHash}`);

    this.logger.log(`Client ${client.id} unsubscribed from transaction ${txHash}`);

    return { unsubscribed: true, txHash };
  }

  // -----------------------------------------------------------------------
  // Polling
  // -----------------------------------------------------------------------

  private startPollingIfNeeded() {
    if (this.pollingInterval || this.pendingTransactions.size === 0) {
      return;
    }

    this.pollingInterval = setInterval(() => {
      this.pollPendingTransactions();
    }, POLL_INTERVAL_MS);

    this.logger.debug('Started transaction polling');
  }

  private stopPollingIfNotNeeded() {
    if (this.pendingTransactions.size === 0 && this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.logger.debug('Stopped transaction polling');
    }
  }

  private async pollPendingTransactions() {
    for (const [txHash] of this.pendingTransactions.entries()) {
      await this.checkTransactionStatus(txHash);
    }
  }

  // -----------------------------------------------------------------------
  // RPC helpers
  // -----------------------------------------------------------------------

  /**
   * Resolve RPC URL for a chain, caching the result.
   * Returns null if the chain is unsupported or key is missing for Alchemy chains.
   */
  private getRpcUrl(chainId: number): string | null {
    if (this.rpcUrlCache.has(chainId)) {
      return this.rpcUrlCache.get(chainId)!;
    }

    const url = buildChainRpcUrl(chainId, ALCHEMY_API_KEY);
    if (!url) {
      this.logger.warn(`No RPC URL for chain ${chainId}`);
      return null;
    }

    // Warn if an Alchemy URL is constructed without an API key
    if (url.endsWith('/v2/')) {
      this.logger.warn(
        `ALCHEMY_API_KEY is empty — RPC calls for chain ${chainId} will fail`,
      );
    }

    this.rpcUrlCache.set(chainId, url);
    return url;
  }

  // -----------------------------------------------------------------------
  // Transaction status check
  // -----------------------------------------------------------------------

  private async checkTransactionStatus(txHash: string) {
    const pendingTx = this.pendingTransactions.get(txHash);
    if (!pendingTx) return;

    const rpcUrl = this.getRpcUrl(pendingTx.chainId);
    if (!rpcUrl) {
      this.logger.warn(
        `Cannot check tx ${txHash} — no RPC URL for chain ${pendingTx.chainId}`,
      );
      return;
    }

    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getTransactionReceipt',
          params: [txHash],
        }),
      });

      const data: RpcResponse = await response.json();
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
          chainId: pendingTx.chainId,
        });

        // Remove from pending
        this.pendingTransactions.delete(txHash);
        this.stopPollingIfNotNeeded();

        this.logger.log(
          `Transaction ${txHash} ${status} on chain ${pendingTx.chainId}`,
        );

        // Send push notification for confirmed transactions (non-blocking)
        if (status === 'confirmed') {
          this.notificationsService.sendPaymentReceivedNotification(
            pendingTx.userAddress,
            '', // Amount is not available from receipt alone
            '', // Token is not available from receipt alone
            '', // From address is not available from receipt alone
            undefined,
            txHash,
          ).catch((err) => {
            this.logger.warn(`Failed to send tx confirmed push notification: ${err.message}`);
          });
        }
      } else {
        // Still pending - emit pending status
        this.server.to(`tx:${txHash}`).emit('status-update', {
          txHash,
          status: 'pending',
          confirmations: 0,
          chainId: pendingTx.chainId,
        });
      }

      // Check for timeout
      if (Date.now() - pendingTx.startTime > TX_MONITOR_TIMEOUT_MS) {
        this.server.to(`tx:${txHash}`).emit('status-update', {
          txHash,
          status: 'timeout',
          message: 'Transaction monitoring timed out',
          chainId: pendingTx.chainId,
        });
        this.pendingTransactions.delete(txHash);
        this.stopPollingIfNotNeeded();
      }
    } catch (error) {
      this.logger.error(
        `Error checking transaction ${txHash} on chain ${pendingTx.chainId}:`,
        error,
      );
    }
  }
}
