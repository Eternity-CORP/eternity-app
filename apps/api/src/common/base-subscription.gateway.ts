/**
 * Base WebSocket Gateway with address subscription management
 * Provides common functionality for gateways that track user subscriptions.
 *
 * Includes signature-based authentication:
 * - Verifies auth on connection (handleConnection)
 * - Validates address ownership on subscribe
 * - Allows unauthenticated connections for backward compatibility (with warnings)
 */

import {
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  verifySocketAuth,
  verifyAddressOwnership,
} from './ws-auth.guard';

interface SubscribePayload {
  address: string;
}

/**
 * Abstract base class for WebSocket gateways that manage address-based subscriptions
 * Subclasses must provide the logger instance and can add domain-specific notify methods
 */
export abstract class BaseSubscriptionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  protected abstract readonly logger: Logger;

  // Map of address -> socket IDs subscribed to that address
  private subscriptions = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    // Verify auth credentials from handshake
    const authenticated = verifySocketAuth(client);
    this.logger.log(
      `Client connected: ${client.id} (authenticated=${authenticated})`,
    );
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove client from all subscriptions
    this.subscriptions.forEach((sockets, address) => {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.subscriptions.delete(address);
      }
    });
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribePayload,
  ) {
    const address = payload.address.toLowerCase();

    // Verify that the subscribed address matches the authenticated address
    if (!verifyAddressOwnership(client, address, 'subscribe')) {
      this.logger.warn(
        `Client ${client.id} rejected: tried to subscribe to ${address} but authenticated as different address`,
      );
      return {
        success: false,
        error: 'Address mismatch: you can only subscribe to your own address',
      };
    }

    if (!this.subscriptions.has(address)) {
      this.subscriptions.set(address, new Set());
    }

    this.subscriptions.get(address)!.add(client.id);
    client.join(`address:${address}`);

    this.logger.log(`Client ${client.id} subscribed to address ${address}`);

    return { success: true, address };
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SubscribePayload,
  ) {
    const address = payload.address.toLowerCase();

    const sockets = this.subscriptions.get(address);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.subscriptions.delete(address);
      }
    }

    client.leave(`address:${address}`);

    this.logger.log(`Client ${client.id} unsubscribed from address ${address}`);

    return { success: true, address };
  }

  /**
   * Emit event to all sockets subscribed to an address
   */
  protected emitToAddress(address: string, event: string, data: unknown): void {
    const normalizedAddress = address.toLowerCase();
    this.server.to(`address:${normalizedAddress}`).emit(event, data);
    this.logger.debug(`Emitted ${event} to ${normalizedAddress}`);
  }

  /**
   * Emit event to multiple addresses
   */
  protected emitToAddresses(
    addresses: string[],
    event: string,
    data: unknown,
  ): void {
    addresses.forEach((address) => {
      this.emitToAddress(address, event, data);
    });
  }
}
