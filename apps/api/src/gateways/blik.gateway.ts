import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import {
  BlikRegisterPayload,
  BlikRedeemPayload,
  BlikConfirmPayload,
  BlikEvents,
  ErrorCodes,
  Limits,
} from '@e-y/shared';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/blik',
})
export class BlikGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private logger = new Logger('BlikGateway');

  // Map of code -> socket id (recipient waiting for payment)
  private pendingCodes = new Map<string, string>();

  afterInit() {
    this.logger.log('BLIK WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    // Clean up any pending codes for this client
    for (const [code, socketId] of this.pendingCodes.entries()) {
      if (socketId === client.id) {
        this.pendingCodes.delete(code);
        this.logger.log(`Removed pending code ${code} for disconnected client`);
      }
    }
  }

  @SubscribeMessage(BlikEvents.REGISTER_CODE)
  handleRegisterCode(
    @MessageBody() data: BlikRegisterPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { code, recipientAddress } = data;

    // Store the code with the client's socket id
    this.pendingCodes.set(code, client.id);

    this.logger.log(`Code ${code} registered for recipient ${recipientAddress}`);

    // Set expiration using constant
    setTimeout(() => {
      if (this.pendingCodes.get(code) === client.id) {
        this.pendingCodes.delete(code);
        client.emit(BlikEvents.CODE_EXPIRED, { code });
        this.logger.log(`Code ${code} expired`);
      }
    }, Limits.BLIK_CODE_EXPIRATION_MS);

    return { success: true, message: 'Code registered' };
  }

  @SubscribeMessage(BlikEvents.REDEEM_CODE)
  handleRedeemCode(
    @MessageBody() data: BlikRedeemPayload,
    @ConnectedSocket() client: Socket,
  ) {
    const { code, senderAddress, amount, token } = data;

    const recipientSocketId = this.pendingCodes.get(code);

    if (!recipientSocketId) {
      return { success: false, error: ErrorCodes.BLIK_CODE_INVALID };
    }

    // Notify recipient that someone wants to pay
    this.server.to(recipientSocketId).emit(BlikEvents.CODE_MATCHED, {
      code,
      senderAddress,
      amount,
      token,
    });

    this.logger.log(`Code ${code} matched by sender ${senderAddress}`);

    // Remove the code (single use)
    this.pendingCodes.delete(code);

    return { success: true, message: 'Code matched, recipient notified' };
  }

  @SubscribeMessage(BlikEvents.CONFIRM_TRANSACTION)
  handleConfirmTransaction(
    @MessageBody() data: BlikConfirmPayload,
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast transaction confirmation to all clients in the room
    this.server.emit(BlikEvents.TRANSACTION_CONFIRMED, {
      code: data.code,
      txHash: data.txHash,
    });

    this.logger.log(`Transaction confirmed for code ${data.code}: ${data.txHash}`);

    return { success: true };
  }
}
