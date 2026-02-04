/**
 * SplitParticipant interface
 * Represents a participant in a split bill
 */

export type ParticipantStatus = 'pending' | 'paid';

export interface SplitParticipant {
  id: string;
  splitId: string;
  address: string;
  username: string | null;
  name: string | null;
  amount: string;
  status: ParticipantStatus;
  paidTxHash: string | null;
  paidAt: Date | null;
}
