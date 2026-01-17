import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

interface SubscribePayload {
  address: string;
}

@WebSocketGateway({
  namespace: '/splits',
  cors: {
    origin: '*',
  },
})
export class SplitGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SplitGateway.name);

  // Map of address -> socket IDs subscribed to that address
  private subscriptions = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
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
   * Notify all participants of a split bill update
   */
  notifySplitUpdate(
    participantAddresses: string[],
    event: string,
    data: any,
  ) {
    participantAddresses.forEach((address) => {
      const normalizedAddress = address.toLowerCase();
      this.server.to(`address:${normalizedAddress}`).emit(event, data);
      this.logger.debug(`Emitted ${event} to ${normalizedAddress}`);
    });
  }

  /**
   * Notify when a new split bill is created
   */
  notifySplitCreated(splitBill: any) {
    const addresses = splitBill.participants.map((p: any) => p.address);
    this.notifySplitUpdate(addresses, 'split:created', splitBill);
  }

  /**
   * Notify when a participant pays
   */
  notifyParticipantPaid(splitBill: any, paidAddress: string) {
    const addresses = [
      splitBill.creatorAddress,
      ...splitBill.participants.map((p: any) => p.address),
    ];
    this.notifySplitUpdate(addresses, 'split:paid', {
      splitId: splitBill.id,
      paidAddress,
      splitBill,
    });
  }

  /**
   * Notify when a split bill is completed
   */
  notifySplitCompleted(splitBill: any) {
    const addresses = [
      splitBill.creatorAddress,
      ...splitBill.participants.map((p: any) => p.address),
    ];
    this.notifySplitUpdate(addresses, 'split:completed', splitBill);
  }

  /**
   * Notify when a split bill is cancelled
   */
  notifySplitCancelled(splitBill: any) {
    const addresses = splitBill.participants.map((p: any) => p.address);
    this.notifySplitUpdate(addresses, 'split:cancelled', splitBill);
  }
}
