/**
 * Split Bill Service
 * Manages split bill requests via backend API
 */

import { API_BASE_URL } from '@/src/config/api';

export type SplitBillStatus = 'active' | 'completed' | 'cancelled';
export type ParticipantStatus = 'pending' | 'paid';

export interface SplitParticipant {
  address: string;
  username?: string;
  name?: string;
  amount: string;
  status: ParticipantStatus;
  paidTxHash?: string;
  paidAt?: number;
}

export interface SplitBill {
  id: string;
  creatorAddress: string;
  creatorUsername?: string;
  recipientAddress: string;
  totalAmount: string;
  tokenSymbol: string;
  description?: string;
  participants: SplitParticipant[];
  createdAt: number;
  updatedAt: number;
  status: SplitBillStatus;
}

export interface CreateSplitBillRequest {
  creatorAddress: string;
  creatorUsername?: string;
  recipientAddress: string;
  totalAmount: string;
  tokenSymbol: string;
  description?: string;
  participants: Array<{
    address: string;
    username?: string;
    name?: string;
    amount: string;
  }>;
}

/**
 * Create a new split bill
 */
export async function createSplitBill(
  request: CreateSplitBillRequest
): Promise<SplitBill> {
  const response = await fetch(`${API_BASE_URL}/api/split`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create split bill' }));
    throw new Error(error.message || 'Failed to create split bill');
  }

  return response.json();
}

/**
 * Get split bill by ID
 */
export async function getSplitBill(id: string): Promise<SplitBill> {
  const response = await fetch(`${API_BASE_URL}/api/split/${id}`);

  if (!response.ok) {
    throw new Error('Split bill not found');
  }

  return response.json();
}

/**
 * Get split bills created by user
 */
export async function getCreatedSplitBills(
  creatorAddress: string
): Promise<SplitBill[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/split/my/created?address=${creatorAddress}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch created split bills');
  }

  return response.json();
}

/**
 * Get pending split bills where user needs to pay
 */
export async function getPendingSplitBills(
  address: string
): Promise<SplitBill[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/split/my/pending?address=${address}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch pending split bills');
  }

  return response.json();
}

/**
 * Cancel a split bill
 */
export async function cancelSplitBill(id: string): Promise<SplitBill> {
  const response = await fetch(`${API_BASE_URL}/api/split/${id}/cancel`, {
    method: 'PUT',
  });

  if (!response.ok) {
    throw new Error('Failed to cancel split bill');
  }

  return response.json();
}

/**
 * Mark participant as paid
 */
export async function markParticipantPaid(
  splitId: string,
  participantAddress: string,
  txHash: string
): Promise<SplitBill> {
  const response = await fetch(`${API_BASE_URL}/api/split/${splitId}/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      participantAddress,
      txHash,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to mark payment');
  }

  return response.json();
}

/**
 * Calculate equal split amounts
 */
export function calculateEqualSplit(
  totalAmount: string,
  participantCount: number
): string {
  const total = parseFloat(totalAmount);
  if (isNaN(total) || participantCount <= 0) {
    return '0';
  }
  const perPerson = total / participantCount;
  return perPerson.toFixed(6);
}

/**
 * Validate split amounts sum to total
 */
export function validateSplitAmounts(
  totalAmount: string,
  amounts: string[]
): boolean {
  const total = parseFloat(totalAmount);
  const sum = amounts.reduce((acc, amt) => acc + parseFloat(amt || '0'), 0);
  // Allow small rounding error
  return Math.abs(total - sum) < 0.000001;
}
