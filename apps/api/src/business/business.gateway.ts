import { WebSocketGateway } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { BaseSubscriptionGateway } from '../common/base-subscription.gateway';
import { BusinessProposalEntity } from './entities';

@WebSocketGateway({
  namespace: '/business',
  cors: {
    origin: '*',
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

  /**
   * Notify when a vote is cast
   */
  notifyVoteCast(businessId: string, data: {
    proposalId: string;
    voterAddress: string;
    support: boolean;
    weight: number;
  }) {
    this.server.emit('vote-cast', { businessId, ...data });
  }

  /**
   * Notify when a proposal is executed
   */
  notifyProposalExecuted(businessId: string, proposalId: string, txHash: string) {
    this.server.emit('proposal-executed', { businessId, proposalId, txHash });
  }

  /**
   * Notify when a new member joins
   */
  notifyMemberJoined(businessId: string, data: {
    address: string;
    username?: string;
    shares: number;
  }) {
    this.server.emit('member-joined', { businessId, ...data });
  }
}
