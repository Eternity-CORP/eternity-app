/**
 * BLIK WebSocket Gateway
 * Handles real-time BLIK code creation, lookup, and payment confirmation.
 *
 * Auth enforcement:
 * - CREATE_CODE: receiverAddress must match authenticated address
 * - CANCEL_CODE: receiverAddress must match authenticated address
 * - CONFIRM_PAYMENT: senderAddress must match authenticated address
 * - LOOKUP_CODE: no auth required (anyone can look up by 6-digit code)
 * - register: receiverAddress must match authenticated address
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
import { BlikService } from './blik.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  verifySocketAuth,
  verifyAddressOwnership,
} from '../common/ws-auth.guard';
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
  type CodeLookupPayload,
} from '@e-y/shared';

@WebSocketGateway({
  namespace: '/blik',
  cors: {
    origin: [process.env.WEB_APP_URL || 'https://e-y-app.vercel.app', 'http://localhost:3001'],
  },
})
export class BlikGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(BlikGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly blikService: BlikService,
    private readonly notificationsService: NotificationsService,
  ) {}

  handleConnection(client: Socket) {
    const authenticated = verifySocketAuth(client);
    this.logger.log(
      `Client connected to BLIK gateway: ${client.id} (authenticated=${authenticated})`,
    );
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from BLIK gateway: ${client.id}`);
  }

  /**
   * Create a new BLIK code (Receiver)
   */
  @SubscribeMessage(BLIK_EVENTS.CREATE_CODE)
  async handleCreateCode(
    @MessageBody() data: CreateCodePayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { amount, tokenSymbol, chainId, receiverAddress, receiverUsername } = data;

      if (!amount || !tokenSymbol || !receiverAddress) {
        client.emit('error', { message: 'Missing required fields: amount, tokenSymbol, receiverAddress' });
        return;
      }

      // Verify that the receiverAddress matches the authenticated address
      if (!verifyAddressOwnership(client, receiverAddress, 'CREATE_CODE')) {
        client.emit('error', {
          message: 'Address mismatch: receiverAddress must match your authenticated wallet',
        });
        return;
      }

      const resolvedChainId = chainId ?? 11155111;

      const blikCode = await this.blikService.createCode(
        receiverAddress,
        receiverUsername,
        amount,
        tokenSymbol,
        resolvedChainId,
        client.id,
      );

      const response: CodeCreatedPayload = {
        code: blikCode.code,
        expiresAt: blikCode.expiresAt,
        amount: blikCode.amount,
        tokenSymbol: blikCode.tokenSymbol,
        chainId: blikCode.chainId,
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
  async handleCancelCode(
    @MessageBody() data: CancelCodePayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { code, receiverAddress } = data;

      if (!code || !receiverAddress) {
        client.emit('error', { message: 'Missing required fields: code, receiverAddress' });
        return;
      }

      // Verify that the receiverAddress matches the authenticated address
      if (!verifyAddressOwnership(client, receiverAddress, 'CANCEL_CODE')) {
        client.emit('error', {
          message: 'Address mismatch: receiverAddress must match your authenticated wallet',
        });
        return;
      }

      const success = await this.blikService.cancelCode(code, receiverAddress);

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
   * No auth required — anyone can look up a code by its 6-digit number
   */
  @SubscribeMessage(BLIK_EVENTS.LOOKUP_CODE)
  async handleLookupCode(
    @MessageBody() data: LookupCodePayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { code, senderAddress } = data;

      if (!code) {
        client.emit('error', { message: 'Missing required field: code' });
        return;
      }

      const blikCode = await this.blikService.lookupCode(code);

      if (!blikCode) {
        const notFoundPayload: CodeNotFoundPayload = {
          code,
          reason: 'not_found',
        };
        client.emit(BLIK_EVENTS.CODE_NOT_FOUND, notFoundPayload);
        return;
      }

      // Notify receiver that someone is looking at their code
      if (senderAddress && blikCode.receiverSocketId) {
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
        chainId: blikCode.chainId,
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
  async handleConfirmPayment(
    @MessageBody() data: ConfirmPaymentPayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { code, txHash, senderAddress, network, chainId } = data;

      if (!code || !txHash || !senderAddress || !network) {
        client.emit('error', { message: 'Missing required fields: code, txHash, senderAddress, network' });
        return;
      }

      // Verify that the senderAddress matches the authenticated address
      if (!verifyAddressOwnership(client, senderAddress, 'CONFIRM_PAYMENT')) {
        client.emit('error', {
          message: 'Address mismatch: senderAddress must match your authenticated wallet',
        });
        return;
      }

      const result = await this.blikService.confirmPayment(code, txHash, senderAddress, network);

      if (!result) {
        const notFoundPayload: CodeNotFoundPayload = {
          code,
          reason: 'expired',
        };
        client.emit(BLIK_EVENTS.CODE_NOT_FOUND, notFoundPayload);
        return;
      }

      // Notify receiver about successful payment
      if (result.blikCode.receiverSocketId) {
        const confirmedPayload: PaymentConfirmedPayload = {
          txHash: result.txHash,
          senderAddress: result.senderAddress,
          network: result.network,
          chainId: chainId ?? result.blikCode.chainId,
        };
        this.server.to(result.blikCode.receiverSocketId).emit(BLIK_EVENTS.PAYMENT_CONFIRMED, confirmedPayload);
      }

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
  async handleRegister(
    @MessageBody() data: { receiverAddress: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { receiverAddress } = data;

    if (receiverAddress) {
      // Verify that the receiverAddress matches the authenticated address
      if (!verifyAddressOwnership(client, receiverAddress, 'register')) {
        client.emit('error', {
          message: 'Address mismatch: receiverAddress must match your authenticated wallet',
        });
        return;
      }

      // Update socket ID for any active codes belonging to this address
      await this.blikService.updateReceiverSocket(receiverAddress, client.id);

      // Check if there's an active code and notify receiver
      const activeCode = await this.blikService.getActiveCodeForReceiver(receiverAddress);
      if (activeCode) {
        const response: CodeCreatedPayload = {
          code: activeCode.code,
          expiresAt: activeCode.expiresAt,
          amount: activeCode.amount,
          tokenSymbol: activeCode.tokenSymbol,
          chainId: activeCode.chainId,
        };
        client.emit(BLIK_EVENTS.CODE_CREATED, response);
      }

      this.logger.log(`Receiver registered: ${receiverAddress} -> ${client.id}`);
    }
  }
}
