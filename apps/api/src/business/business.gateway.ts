import { WebSocketGateway } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { BaseSubscriptionGateway } from '../common/base-subscription.gateway';
import { BusinessProposalEntity } from './entities';

@WebSocketGateway({
  namespace: '/business',
  cors: {
    origin: [process.env.WEB_APP_URL || 'https://e-y-app.vercel.app', 'http://localhost:3001'],
  },
})
export class BusinessGateway extends BaseSubscriptionGateway {
  protected readonly logger = new Logger(BusinessGateway.name);

  /**
   * Notify when a new proposal is created
   */
  notifyProposalCreated(businessId: string, proposal: BusinessProposalEntity) {
    this.server.emit('proposal-created', { businessId, proposal });
  }

}
