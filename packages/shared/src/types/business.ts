/**
 * Business Wallet types
 * Tokenized equity shares (ERC-20), shared treasury with governance voting
 */

export type TransferPolicy = 'FREE' | 'APPROVAL_REQUIRED';

export type ProposalType = 'WITHDRAW_ETH' | 'WITHDRAW_TOKEN' | 'TRANSFER_SHARES' | 'CHANGE_SETTINGS' | 'CUSTOM';

export type ProposalStatus = 'active' | 'passed' | 'rejected' | 'executed' | 'canceled';

export interface BusinessWallet {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  tokenSymbol: string;
  tokenSupply: number;
  contractAddress: string;
  treasuryAddress: string;
  factoryTxHash: string;
  network: string;
  transferPolicy: TransferPolicy;
  quorumThreshold: number;
  votingPeriod: number;
  vestingEnabled: boolean;
  vestingConfig?: VestingConfig;
  dividendsEnabled: boolean;
  dividendsConfig?: DividendConfig;
  createdBy: string;
  createdAt: string;
}

export interface BusinessMember {
  id: string;
  businessId: string;
  address: string;
  username?: string;
  initialShares: number;
  currentShares?: number;
  role: 'founder' | 'member';
  joinedAt: string;
}

export interface Proposal {
  id: string;
  businessId: string;
  onChainId: number;
  type: ProposalType;
  title: string;
  description?: string;
  data?: Record<string, unknown>;
  deadline: string;
  status: ProposalStatus;
  forVotes: number;
  againstVotes: number;
  totalSupply: number;
  quorumThreshold: number;
  createdBy: string;
  createdAt: string;
}

export interface Vote {
  proposalId: string;
  voterAddress: string;
  support: boolean;
  weight: number;
  txHash?: string;
  votedAt: string;
}

export interface VestingConfig {
  cliffMonths: number;
  durationMonths: number;
  schedule: 'linear' | 'custom';
}

export interface DividendConfig {
  frequency: 'manual' | 'weekly' | 'monthly' | 'quarterly';
  percentage: number;
  token?: string;
}

export interface BusinessActivity {
  id: string;
  businessId: string;
  type: 'created' | 'proposal' | 'vote' | 'executed' | 'transfer' | 'deposit' | 'dividend';
  description: string;
  actorAddress?: string;
  txHash?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CreateBusinessParams {
  name: string;
  description?: string;
  icon?: string;
  tokenSymbol: string;
  tokenSupply: number;
  founders: { address: string; username?: string; shares: number }[];
  transferPolicy: TransferPolicy;
  quorumThreshold: number;
  votingPeriod: number;
  vestingEnabled: boolean;
  vestingConfig?: VestingConfig;
  dividendsEnabled: boolean;
  dividendsConfig?: DividendConfig;
}
