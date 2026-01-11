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

@WebSocketGateway({
  namespace: '/blik',
  cors: {
    origin: '*',
  },
})
export class BlikGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected to BLIK gateway: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected from BLIK gateway: ${client.id}`);
  }

  @SubscribeMessage('create-code')
  handleCreateCode(
    @MessageBody() data: { amount: string; token: string; senderAddress: string },
    @ConnectedSocket() client: Socket,
  ) {
    // TODO: Implement BLIK code generation logic
    // For now, return a placeholder response
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    client.emit('code-created', {
      code,
      expiresAt: expiresAt.toISOString(),
    });

    return { code, expiresAt: expiresAt.toISOString() };
  }

  @SubscribeMessage('redeem-code')
  handleRedeemCode(
    @MessageBody() data: { code: string; receiverAddress: string },
    @ConnectedSocket() client: Socket,
  ) {
    // TODO: Implement BLIK code matching logic
    // For now, return a placeholder response
    client.emit('code-matched', {
      code: data.code,
      matched: false,
      message: 'Code matching not yet implemented',
    });

    return { code: data.code, status: 'pending' };
  }
}
