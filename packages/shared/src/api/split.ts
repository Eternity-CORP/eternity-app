/**
 * Split Bill API Module
 * Pure functions that accept ApiClient as first argument.
 */

import type { ApiClient } from './client';
import type { SplitBill, CreateSplitBillRequest } from '../types/split';

export type { SplitBill, SplitParticipant, CreateSplitBillRequest, SplitBillStatus, ParticipantStatus } from '../types/split';

/**
 * Create a new split bill
 */
export async function createSplitBill(
  client: ApiClient,
  request: CreateSplitBillRequest,
): Promise<SplitBill> {
  return client.withWallet(request.creatorAddress).post<SplitBill>('/api/splits', request);
}

/**
 * Get split bill by ID
 */
export async function getSplitBill(
  client: ApiClient,
  id: string,
): Promise<SplitBill> {
  return client.get<SplitBill>(`/api/splits/${id}`);
}

/**
 * Get split bills created by user
 */
export async function getSplitsByCreator(
  client: ApiClient,
  creatorAddress: string,
): Promise<SplitBill[]> {
  return client.get<SplitBill[]>(
    `/api/splits/creator/${encodeURIComponent(creatorAddress)}`,
  );
}

/**
 * Get pending split bills where user needs to pay
 */
export async function getPendingSplits(
  client: ApiClient,
  address: string,
): Promise<SplitBill[]> {
  return client.get<SplitBill[]>(
    `/api/splits/pending/${encodeURIComponent(address)}`,
  );
}

/**
 * Mark participant as paid
 */
export async function markSplitPaid(
  client: ApiClient,
  splitId: string,
  participantAddress: string,
  txHash: string,
): Promise<SplitBill> {
  return client.withWallet(participantAddress).post<SplitBill>(
    `/api/splits/${splitId}/pay`,
    { participantAddress, txHash },
  );
}

/**
 * Cancel a split bill
 */
export async function cancelSplit(
  client: ApiClient,
  id: string,
  walletAddress: string,
): Promise<SplitBill> {
  return client.withWallet(walletAddress).delete<SplitBill>(`/api/splits/${id}`);
}
