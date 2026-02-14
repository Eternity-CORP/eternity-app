/**
 * Business entity interfaces
 * Represents business records in the database
 */

export interface Business {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  tokenSymbol: string;
  tokenSupply: number;
  contractAddress: string;
  treasuryAddress: string;
  factoryTxHash: string;
  network: string;
  transferPolicy: string;
  quorumThreshold: number;
  votingPeriod: number;
  vestingEnabled: boolean;
  vestingConfig: Record<string, unknown> | null;
  dividendsEnabled: boolean;
  dividendsConfig: Record<string, unknown> | null;
  createdBy: string;
  createdAt: Date;
  members: BusinessMemberEntity[];
}

export interface BusinessMemberEntity {
  id: string;
  businessId: string;
  address: string;
  username: string | null;
  initialShares: number;
  role: string;
  joinedAt: Date;
}

export interface BusinessProposalEntity {
  id: string;
  businessId: string;
  onChainId: number;
  type: string;
  title: string;
  description: string | null;
  dataJson: Record<string, unknown> | null;
  deadline: Date;
  status: string;
  createdBy: string;
  createdAt: Date;
}

export interface BusinessActivityEntity {
  id: string;
  businessId: string;
  type: string;
  description: string;
  actorAddress: string | null;
  txHash: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}
