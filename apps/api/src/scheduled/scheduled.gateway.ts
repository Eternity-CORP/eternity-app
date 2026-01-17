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
import { ScheduledPayment } from './entities';

interface SubscribePayload {
  address: string;
}

@WebSocketGateway({
  namespace: '/scheduled',
  cors: {
    origin: '*',
  },
})
export class ScheduledGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ScheduledGateway.name);

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
   * Notify user of scheduled payment event
   */
  notifyUser(address: string, event: string, data: any) {
    const normalizedAddress = address.toLowerCase();
    this.server.to(`address:${normalizedAddress}`).emit(event, data);
    this.logger.debug(`Emitted ${event} to ${normalizedAddress}`);
  }

  /**
   * Notify when a new scheduled payment is created
   */
  notifyPaymentCreated(payment: ScheduledPayment) {
    this.notifyUser(payment.creatorAddress, 'scheduled:created', payment);
  }

  /**
   * Notify when a scheduled payment is updated
   */
  notifyPaymentUpdated(payment: ScheduledPayment) {
    this.notifyUser(payment.creatorAddress, 'scheduled:updated', payment);
  }

  /**
   * Notify when a scheduled payment is due (reminder)
   */
  notifyPaymentReminder(payment: ScheduledPayment) {
    this.notifyUser(payment.creatorAddress, 'scheduled:reminder', {
      payment,
      message: 'Payment is due soon. Please confirm to execute.',
    });
  }

  /**
   * Notify when a scheduled payment is executed
   */
  notifyPaymentExecuted(payment: ScheduledPayment) {
    this.notifyUser(payment.creatorAddress, 'scheduled:executed', payment);
    // Also notify recipient
    this.notifyUser(payment.recipient, 'scheduled:received', payment);
  }

  /**
   * Notify when a scheduled payment is cancelled
   */
  notifyPaymentCancelled(payment: ScheduledPayment) {
    this.notifyUser(payment.creatorAddress, 'scheduled:cancelled', payment);
  }
}
