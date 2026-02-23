/**
 * Business Treasury Service
 * Pure functions wrapping BusinessTreasury smart contract calls.
 * Uses dependency injection — accepts an ethers-like contract factory.
 * ZERO runtime dependencies.
 */

import type { ProposalType, ProposalStatus } from '../types/business';
import { BUSINESS_TREASURY_ABI } from '../constants/business';
import { proposalTypeToIndex } from '../utils/business';
import type { ContractFactory, EthersLikeProvider } from './business-factory.service';

// ============================================
// Return types
// ============================================

export interface CreateProposalResult {
  proposalId: number;
  txHash: string;
}

export interface TxResult {
  txHash: string;
}

export interface OnChainProposal {
  id: number;
  proposalType: number;
  creator: string;
  data: string;
  deadline: number;
  forVotes: number;
  againstVotes: number;
  snapshotSupply: number;
  status: number;
}

export interface TreasuryBalance {
  eth: string;
}

// ============================================
// Internal helpers
// ============================================

const PROPOSAL_STATUS_MAP: Record<number, ProposalStatus> = {
  0: 'active',
  1: 'passed',
  2: 'rejected',
  3: 'executed',
  4: 'canceled',
};

const PROPOSAL_TYPE_MAP: Record<number, ProposalType> = {
  0: 'WITHDRAW_ETH',
  1: 'WITHDRAW_TOKEN',
  2: 'TRANSFER_SHARES',
  3: 'CHANGE_SETTINGS',
  4: 'CUSTOM',
  5: 'DISTRIBUTE_DIVIDENDS',
};

export function indexToProposalStatus(index: number): ProposalStatus {
  return PROPOSAL_STATUS_MAP[index] ?? 'active';
}

export function indexToProposalType(index: number): ProposalType {
  return PROPOSAL_TYPE_MAP[index] ?? 'CUSTOM';
}

// ============================================
// Service functions
// ============================================

/**
 * Create a new proposal in the treasury.
 * `data` is the ABI-encoded payload for the proposal action.
 */
export async function createProposal(
  contractFactory: ContractFactory,
  treasuryAddress: string,
  signer: unknown,
  type: ProposalType,
  data: Uint8Array,
): Promise<CreateProposalResult> {
  const contract = contractFactory(treasuryAddress, BUSINESS_TREASURY_ABI, signer);

  const typeIndex = proposalTypeToIndex(type);
  const tx = (await contract['createProposal'](typeIndex, data)) as {
    hash: string;
    wait(): Promise<{ logs: unknown[] }>;
  };

  const receipt = await tx.wait();

  // Parse ProposalCreated event to get proposal ID
  let proposalId = 0;
  const logs = receipt.logs as Array<{
    args?: { id?: bigint };
    fragment?: { name?: string };
  }>;

  for (const log of logs) {
    if (log.fragment?.name === 'ProposalCreated' && log.args) {
      proposalId = Number(log.args.id ?? 0);
      break;
    }
  }

  return {
    proposalId,
    txHash: tx.hash,
  };
}

/**
 * Cast a vote on a proposal.
 * @param support - true for "for", false for "against"
 */
export async function vote(
  contractFactory: ContractFactory,
  treasuryAddress: string,
  signer: unknown,
  proposalId: number,
  support: boolean,
): Promise<TxResult> {
  const contract = contractFactory(treasuryAddress, BUSINESS_TREASURY_ABI, signer);

  const tx = (await contract['vote'](proposalId, support)) as {
    hash: string;
    wait(): Promise<unknown>;
  };

  await tx.wait();

  return { txHash: tx.hash };
}

/**
 * Execute a proposal that has passed and met quorum.
 */
export async function executeProposal(
  contractFactory: ContractFactory,
  treasuryAddress: string,
  signer: unknown,
  proposalId: number,
): Promise<TxResult> {
  const contract = contractFactory(treasuryAddress, BUSINESS_TREASURY_ABI, signer);

  const tx = (await contract['executeProposal'](proposalId)) as {
    hash: string;
    wait(): Promise<unknown>;
  };

  await tx.wait();

  return { txHash: tx.hash };
}

/**
 * Cancel a proposal (only the creator can cancel).
 */
export async function cancelProposal(
  contractFactory: ContractFactory,
  treasuryAddress: string,
  signer: unknown,
  proposalId: number,
): Promise<TxResult> {
  const contract = contractFactory(treasuryAddress, BUSINESS_TREASURY_ABI, signer);

  const tx = (await contract['cancelProposal'](proposalId)) as {
    hash: string;
    wait(): Promise<unknown>;
  };

  await tx.wait();

  return { txHash: tx.hash };
}

/**
 * Get on-chain proposal data by ID.
 */
export async function getProposal(
  contractFactory: ContractFactory,
  treasuryAddress: string,
  provider: unknown,
  proposalId: number,
): Promise<OnChainProposal> {
  const contract = contractFactory(treasuryAddress, BUSINESS_TREASURY_ABI, provider);

  const result = (await contract['getProposal'](proposalId)) as {
    id: bigint;
    proposalType: number;
    creator: string;
    data: string;
    deadline: bigint;
    forVotes: bigint;
    againstVotes: bigint;
    snapshotSupply: bigint;
    status: number;
  };

  return {
    id: Number(result.id),
    proposalType: Number(result.proposalType),
    creator: result.creator,
    data: result.data,
    deadline: Number(result.deadline),
    forVotes: Number(result.forVotes),
    againstVotes: Number(result.againstVotes),
    snapshotSupply: Number(result.snapshotSupply),
    status: Number(result.status),
  };
}

/**
 * Check if an address has voted on a proposal.
 */
export async function hasVoted(
  contractFactory: ContractFactory,
  treasuryAddress: string,
  provider: unknown,
  proposalId: number,
  voterAddress: string,
): Promise<boolean> {
  const contract = contractFactory(treasuryAddress, BUSINESS_TREASURY_ABI, provider);
  return (await contract['hasVoted'](proposalId, voterAddress)) as boolean;
}

/**
 * Get the total number of proposals in the treasury.
 */
export async function getProposalCount(
  contractFactory: ContractFactory,
  treasuryAddress: string,
  provider: unknown,
): Promise<number> {
  const contract = contractFactory(treasuryAddress, BUSINESS_TREASURY_ABI, provider);
  const count = (await contract['proposalCount']()) as bigint;
  return Number(count);
}

/**
 * Get the ETH balance of the treasury.
 * Uses the provider's getBalance for accurate on-chain balance.
 */
export async function getTreasuryBalance(
  ethersProvider: EthersLikeProvider,
  treasuryAddress: string,
): Promise<TreasuryBalance> {
  const balance = await ethersProvider.getBalance(treasuryAddress);

  // Convert wei to ETH string (18 decimals)
  const wei = balance;
  const wholePart = wei / BigInt(10 ** 18);
  const fractionalPart = wei % BigInt(10 ** 18);
  const fractionalStr = fractionalPart.toString().padStart(18, '0').slice(0, 6);

  return {
    eth: `${wholePart}.${fractionalStr}`,
  };
}

/**
 * Get quorum basis points configured for the treasury.
 */
export async function getQuorumBps(
  contractFactory: ContractFactory,
  treasuryAddress: string,
  provider: unknown,
): Promise<number> {
  const contract = contractFactory(treasuryAddress, BUSINESS_TREASURY_ABI, provider);
  const bps = (await contract['quorumBps']()) as bigint;
  return Number(bps);
}

/**
 * Get voting period in seconds configured for the treasury.
 */
export async function getVotingPeriod(
  contractFactory: ContractFactory,
  treasuryAddress: string,
  provider: unknown,
): Promise<number> {
  const contract = contractFactory(treasuryAddress, BUSINESS_TREASURY_ABI, provider);
  const period = (await contract['votingPeriod']()) as bigint;
  return Number(period);
}

// ============================================
// Dividend helpers
// ============================================

/**
 * ABI types for encoding DISTRIBUTE_DIVIDENDS proposal data.
 * Usage with ethers: coder.encode(DIVIDEND_PROPOSAL_ABI_TYPES, [totalAmountWei, holdersArray])
 */
export const DIVIDEND_PROPOSAL_ABI_TYPES = ['uint256', 'address[]'] as const;

/**
 * Decoded dividend proposal data from on-chain bytes.
 */
export interface DecodedDividendData {
  totalAmount: string; // wei string — caller formats with ethers.formatEther
  holders: string[];
}
