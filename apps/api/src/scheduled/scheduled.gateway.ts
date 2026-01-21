import { WebSocketGateway } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { BaseSubscriptionGateway } from '../common/base-subscription.gateway';
import { ScheduledPayment } from './entities';

@WebSocketGateway({
  namespace: '/scheduled',
  cors: {
    origin: '*',
  },
})
export class ScheduledGateway extends BaseSubscriptionGateway {
  protected readonly logger = new Logger(ScheduledGateway.name);

  /**
   * Notify user of scheduled payment event
   */
  notifyUser(address: string, event: string, data: unknown) {
    this.emitToAddress(address, event, data);
  }

  /**
   * Notify when a new scheduled payment is created
   */
  notifyPaymentCreated(payment: ScheduledPayment) {
    this.emitToAddress(payment.creatorAddress, 'scheduled:created', payment);
  }

  /**
   * Notify when a scheduled payment is updated
   */
  notifyPaymentUpdated(payment: ScheduledPayment) {
    this.emitToAddress(payment.creatorAddress, 'scheduled:updated', payment);
  }

  /**
   * Notify when a scheduled payment is due (reminder)
   */
  notifyPaymentReminder(payment: ScheduledPayment) {
    this.emitToAddress(payment.creatorAddress, 'scheduled:reminder', {
      payment,
      message: 'Payment is due soon. Please confirm to execute.',
    });
  }

  /**
   * Notify when a scheduled payment is executed
   */
  notifyPaymentExecuted(payment: ScheduledPayment) {
    this.emitToAddress(payment.creatorAddress, 'scheduled:executed', payment);
    // Also notify recipient
    this.emitToAddress(payment.recipient, 'scheduled:received', payment);
  }

  /**
   * Notify when a scheduled payment is cancelled
   */
  notifyPaymentCancelled(payment: ScheduledPayment) {
    this.emitToAddress(payment.creatorAddress, 'scheduled:cancelled', payment);
  }
}
