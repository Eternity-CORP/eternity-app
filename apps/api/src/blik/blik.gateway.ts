/**
 * BLIK WebSocket Gateway
 * Handles real-time BLIK code creation, lookup, and payment confirmation
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
import { Logger, OnModuleInit } from '@nestjs/common';
import { BlikService } from './blik.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  BLIK_EVENTS,
  type CreateCodePayload,
  type CancelCodePayload,
  type LookupCodePayload,
  type ConfirmPaymentPayload,
  type CodeCreatedPayload,
  type CodeInfoPayload,
  type CodeNotFoundPayload,
  type PaymentConfirmedPayload,
  type PaymentAcceptedPayload,
  type CodeExpiredPayload,
  type CodeLookupPayload,
} from '@e-y/shared';

@WebSocketGateway({
  namespace: '/blik',
  cors: {
    origin: '*',
  },
})
export class BlikGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  private readonly logger = new Logger(BlikGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly blikService: BlikService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit() {
    // Set up periodic expiration check that notifies receivers
    setInterval(() => {
      const expiredCodes = this.blikService.cleanup();
      for (const code of expiredCodes) {
        // Notify receiver about expiration
        const expiredPayload: CodeExpiredPayload = { code: code.code };
        this.server.to(code.receiverSocketId).emit(BLIK_EVENTS.CODE_EXPIRED, expiredPayload);
      }
    }, 30000);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to BLIK gateway: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from BLIK gateway: ${client.id}`);
  }

  /**
   * Create a new BLIK code (Receiver)
   */
  @SubscribeMessage(BLIK_EVENTS.CREATE_CODE)
  handleCreateCode(
    @MessageBody() data: CreateCodePayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { amount, tokenSymbol, receiverAddress, receiverUsername } = data;

      if (!amount || !tokenSymbol || !receiverAddress) {
        client.emit('error', { message: 'Missing required fields: amount, tokenSymbol, receiverAddress' });
        return;
      }

      const blikCode = this.blikService.createCode(
        receiverAddress,
        receiverUsername,
        amount,
        tokenSymbol,
        client.id,
      );

      const response: CodeCreatedPayload = {
        code: blikCode.code,
        expiresAt: blikCode.expiresAt,
        amount: blikCode.amount,
        tokenSymbol: blikCode.tokenSymbol,
      };

      client.emit(BLIK_EVENTS.CODE_CREATED, response);
      this.logger.log(`Code created: ${blikCode.code} for ${receiverAddress}`);
    } catch (error) {
      this.logger.error(`Error creating code: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Cancel a BLIK code (Receiver)
   */
  @SubscribeMessage(BLIK_EVENTS.CANCEL_CODE)
  handleCancelCode(
    @MessageBody() data: CancelCodePayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { code, receiverAddress } = data;

      if (!code || !receiverAddress) {
        client.emit('error', { message: 'Missing required fields: code, receiverAddress' });
        return;
      }

      const success = this.blikService.cancelCode(code, receiverAddress);

      if (success) {
        client.emit(BLIK_EVENTS.CODE_CANCELLED, { code });
        this.logger.log(`Code cancelled: ${code}`);
      } else {
        client.emit('error', { message: 'Failed to cancel code. Code may not exist or you are not the owner.' });
      }
    } catch (error) {
      this.logger.error(`Error cancelling code: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Look up a BLIK code (Sender)
   */
  @SubscribeMessage(BLIK_EVENTS.LOOKUP_CODE)
  handleLookupCode(
    @MessageBody() data: LookupCodePayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { code, senderAddress } = data;

      if (!code) {
        client.emit('error', { message: 'Missing required field: code' });
        return;
      }

      const blikCode = this.blikService.lookupCode(code);

      if (!blikCode) {
        const notFoundPayload: CodeNotFoundPayload = {
          code,
          reason: 'not_found',
        };
        client.emit(BLIK_EVENTS.CODE_NOT_FOUND, notFoundPayload);
        return;
      }

      // Notify receiver that someone is looking at their code
      if (senderAddress) {
        const lookupPayload: CodeLookupPayload = { senderAddress };
        this.server.to(blikCode.receiverSocketId).emit(BLIK_EVENTS.CODE_LOOKUP, lookupPayload);

        // Send push notification to receiver (for when app is in background)
        this.notificationsService.sendBlikMatchedNotification(
          blikCode.receiverAddress,
          blikCode.code,
          senderAddress,
          blikCode.amount,
          blikCode.tokenSymbol,
        ).catch((error) => {
          this.logger.warn(`Failed to send push notification: ${error.message}`);
        });
      }

      // Send code info to sender
      const infoPayload: CodeInfoPayload = {
        code: blikCode.code,
        amount: blikCode.amount,
        tokenSymbol: blikCode.tokenSymbol,
        receiverAddress: blikCode.receiverAddress,
        receiverUsername: blikCode.receiverUsername,
        expiresAt: blikCode.expiresAt,
      };

      client.emit(BLIK_EVENTS.CODE_INFO, infoPayload);
      this.logger.log(`Code looked up: ${code} by ${senderAddress || 'unknown'}`);
    } catch (error) {
      this.logger.error(`Error looking up code: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Confirm payment for a BLIK code (Sender)
   */
  @SubscribeMessage(BLIK_EVENTS.CONFIRM_PAYMENT)
  handleConfirmPayment(
    @MessageBody() data: ConfirmPaymentPayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { code, txHash, senderAddress, network } = data;

      if (!code || !txHash || !senderAddress || !network) {
        client.emit('error', { message: 'Missing required fields: code, txHash, senderAddress, network' });
        return;
      }

      const result = this.blikService.confirmPayment(code, txHash, senderAddress, network);

      if (!result) {
        const notFoundPayload: CodeNotFoundPayload = {
          code,
          reason: 'expired',
        };
        client.emit(BLIK_EVENTS.CODE_NOT_FOUND, notFoundPayload);
        return;
      }

      // Notify receiver about successful payment
      const confirmedPayload: PaymentConfirmedPayload = {
        txHash: result.txHash,
        senderAddress: result.senderAddress,
        network: result.network,
      };
      this.server.to(result.blikCode.receiverSocketId).emit(BLIK_EVENTS.PAYMENT_CONFIRMED, confirmedPayload);

      // Send push notification to receiver (for when app is in background)
      this.notificationsService.sendBlikConfirmedNotification(
        result.blikCode.receiverAddress,
        result.blikCode.amount,
        result.blikCode.tokenSymbol,
        result.senderAddress,
        result.txHash,
      ).catch((error) => {
        this.logger.warn(`Failed to send push notification: ${error.message}`);
      });

      // Notify sender that payment was accepted
      const acceptedPayload: PaymentAcceptedPayload = {
        code,
        txHash,
      };
      client.emit(BLIK_EVENTS.PAYMENT_ACCEPTED, acceptedPayload);

      this.logger.log(`Payment confirmed: code ${code}, txHash ${txHash}`);
    } catch (error) {
      this.logger.error(`Error confirming payment: ${error.message}`);
      client.emit('error', { message: error.message });
    }
  }

  /**
   * Register receiver address for reconnection (Receiver)
   */
  @SubscribeMessage('register')
  handleRegister(
    @MessageBody() data: { receiverAddress: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { receiverAddress } = data;

    if (receiverAddress) {
      // Update socket ID for any active codes belonging to this address
      this.blikService.updateReceiverSocket(receiverAddress, client.id);

      // Check if there's an active code and notify receiver
      const activeCode = this.blikService.getActiveCodeForReceiver(receiverAddress);
      if (activeCode) {
        const response: CodeCreatedPayload = {
          code: activeCode.code,
          expiresAt: activeCode.expiresAt,
          amount: activeCode.amount,
          tokenSymbol: activeCode.tokenSymbol,
        };
        client.emit(BLIK_EVENTS.CODE_CREATED, response);
      }

      this.logger.log(`Receiver registered: ${receiverAddress} -> ${client.id}`);
    }
  }
}
