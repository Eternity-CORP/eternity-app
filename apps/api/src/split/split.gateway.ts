import { WebSocketGateway } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { BaseSubscriptionGateway } from '../common/base-subscription.gateway';
import { SplitBill } from './entities';

@WebSocketGateway({
  namespace: '/splits',
  cors: {
    origin: [process.env.WEB_APP_URL || 'https://e-y-app.vercel.app', 'http://localhost:3001'],
  },
})
export class SplitGateway extends BaseSubscriptionGateway {
  protected readonly logger = new Logger(SplitGateway.name);

  /**
   * Notify when a new split bill is created
   */
  notifySplitCreated(splitBill: SplitBill) {
    const addresses = splitBill.participants.map((p) => p.address);
    this.emitToAddresses(addresses, 'split:created', splitBill);
  }

  /**
   * Notify when a participant pays
   */
  notifyParticipantPaid(splitBill: SplitBill, paidAddress: string) {
    const addresses = [
      splitBill.creatorAddress,
      ...splitBill.participants.map((p) => p.address),
    ];
    this.emitToAddresses(addresses, 'split:paid', {
      splitId: splitBill.id,
      paidAddress,
      splitBill,
    });
  }

  /**
   * Notify when a split bill is completed
   */
  notifySplitCompleted(splitBill: SplitBill) {
    const addresses = [
      splitBill.creatorAddress,
      ...splitBill.participants.map((p) => p.address),
    ];
    this.emitToAddresses(addresses, 'split:completed', splitBill);
  }

  /**
   * Notify when a split bill is cancelled
   */
  notifySplitCancelled(splitBill: SplitBill) {
    const addresses = splitBill.participants.map((p) => p.address);
    this.emitToAddresses(addresses, 'split:cancelled', splitBill);
  }
}
