/**
 * Business wallet utility functions
 */

import type { ProposalType } from '../types/business';

export function calculateOwnershipPercent(balance: number, totalSupply: number): number {
  if (totalSupply === 0) return 0;
  return Math.round((balance / totalSupply) * 10000) / 100;
}

export function calculateDividendShare(
  holderTokens: number,
  totalSupply: number,
  distributionAmount: bigint,
): bigint {
  if (totalSupply === 0) return 0n;
  return (distributionAmount * BigInt(holderTokens)) / BigInt(totalSupply);
}

export function isQuorumReached(forVotes: number, totalSupply: number, thresholdBps: number): boolean {
  return forVotes * 10000 >= totalSupply * thresholdBps;
}

export function formatShareAmount(amount: number, totalSupply: number): string {
  const percent = calculateOwnershipPercent(amount, totalSupply);
  return `${amount} (${percent}%)`;
}

export function validateBusinessParams(params: {
  name: string;
  tokenSymbol: string;
  tokenSupply: number;
  founders: { shares: number }[];
}): { valid: boolean; error?: string } {
  if (params.name.length < 3 || params.name.length > 50)
    return { valid: false, error: 'Name must be 3-50 characters' };
  if (!/^[A-Z]{2,6}$/.test(params.tokenSymbol))
    return { valid: false, error: 'Symbol must be 2-6 uppercase letters' };
  if (params.tokenSupply < 2 || params.tokenSupply > 1000000)
    return { valid: false, error: 'Supply must be 2-1,000,000' };
  const totalShares = params.founders.reduce((sum, f) => sum + f.shares, 0);
  if (totalShares !== params.tokenSupply)
    return { valid: false, error: 'Shares must equal total supply' };
  if (params.founders.length < 1 || params.founders.length > 50)
    return { valid: false, error: 'Must have 1-50 founders' };
  return { valid: true };
}

export function proposalTypeToIndex(type: ProposalType): number {
  const map: Record<ProposalType, number> = {
    WITHDRAW_ETH: 0,
    WITHDRAW_TOKEN: 1,
    TRANSFER_SHARES: 2,
    CHANGE_SETTINGS: 3,
    CUSTOM: 4,
    DISTRIBUTE_DIVIDENDS: 5,
  };
  return map[type] ?? 4;
}
