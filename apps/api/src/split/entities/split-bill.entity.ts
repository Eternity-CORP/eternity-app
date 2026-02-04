/**
 * SplitBill and SplitParticipant interfaces
 * Represents split bill records in the database
 */
import { SplitParticipant } from './split-participant.entity';

export type SplitBillStatus = 'active' | 'completed' | 'cancelled';

export interface SplitBill {
  id: string;
  creatorAddress: string;
  creatorUsername: string | null;
  totalAmount: string;
  tokenSymbol: string;
  description: string | null;
  status: SplitBillStatus;
  createdAt: Date;
  updatedAt: Date;
  participants: SplitParticipant[];
}
