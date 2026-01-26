/**
 * Split Bill Service
 * Manages split bill requests with backend API and local cache
 */

import { apiClient, ApiError } from './api-client';
import { createLogger } from '@/src/utils/logger';
import { loadCached, cache } from '@/src/utils/cache';

const log = createLogger('SplitBillService');

const CACHE_KEY = 'split_bills_cache';

export type SplitBillStatus = 'active' | 'completed' | 'cancelled';
export type ParticipantStatus = 'pending' | 'paid';

export interface SplitParticipant {
  id?: string;
  address: string;
  username?: string;
  name?: string;
  amount: string;
  status: ParticipantStatus;
  paidTxHash?: string;
  paidAt?: string;
}

export interface SplitBill {
  id: string;
  creatorAddress: string;
  creatorUsername?: string;
  recipientAddress?: string;
  totalAmount: string;
  tokenSymbol: string;
  description?: string;
  participants: SplitParticipant[];
  createdAt: string;
  updatedAt: string;
  status: SplitBillStatus;
}

export interface CreateSplitBillRequest {
  creatorAddress: string;
  creatorUsername?: string;
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
  const client = apiClient.withWallet(request.creatorAddress);
  const bill = await client.post<SplitBill>('/api/splits', request);

  // Update cache
  const cached = await loadCached<SplitBill>(CACHE_KEY, request.creatorAddress);
  cached.unshift(bill);
  await cache(CACHE_KEY, request.creatorAddress, cached);

  log.info('Split bill created', { id: bill.id });
  return bill;
}

/**
 * Get split bill by ID
 */
export async function getSplitBill(id: string): Promise<SplitBill> {
  try {
    return await apiClient.get<SplitBill>(`/api/splits/${id}`);
  } catch (error) {
    if (ApiError.isApiError(error) && error.statusCode === 404) {
      throw new Error('Split bill not found');
    }
    throw error;
  }
}

/**
 * Get split bills created by user
 */
export async function getCreatedSplitBills(
  creatorAddress: string
): Promise<SplitBill[]> {
  try {
    const bills = await apiClient.get<SplitBill[]>(
      `/api/splits/creator/${encodeURIComponent(creatorAddress)}`
    );
    await cache(CACHE_KEY, creatorAddress, bills);
    return bills;
  } catch (error) {
    log.warn('Failed to fetch split bills, using cache', error);
    return loadCached<SplitBill>(CACHE_KEY, creatorAddress);
  }
}

/**
 * Get pending split bills where user needs to pay
 */
export async function getPendingSplitBills(
  address: string
): Promise<SplitBill[]> {
  try {
    return await apiClient.get<SplitBill[]>(
      `/api/splits/pending/${encodeURIComponent(address)}`
    );
  } catch (error) {
    log.warn('Failed to fetch pending split bills', error);
    return [];
  }
}

/**
 * Cancel a split bill
 */
export async function cancelSplitBill(
  id: string,
  walletAddress: string
): Promise<SplitBill> {
  const client = apiClient.withWallet(walletAddress);
  const bill = await client.delete<SplitBill>(`/api/splits/${id}`);

  // Update cache
  const cached = await loadCached<SplitBill>(CACHE_KEY, walletAddress);
  const index = cached.findIndex((b) => b.id === id);
  if (index !== -1) {
    cached[index] = bill;
    await cache(CACHE_KEY, walletAddress, cached);
  }

  log.info('Split bill cancelled', { id });
  return bill;
}

/**
 * Mark participant as paid
 */
export async function markParticipantPaid(
  splitId: string,
  participantAddress: string,
  txHash: string
): Promise<SplitBill> {
  const client = apiClient.withWallet(participantAddress);
  const bill = await client.post<SplitBill>(`/api/splits/${splitId}/pay`, {
    participantAddress,
    txHash,
  });

  log.info('Participant marked as paid', { splitId, participantAddress });
  return bill;
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

/**
 * Sync local cache with backend
 */
export async function syncSplitBills(address: string): Promise<void> {
  try {
    const bills = await getCreatedSplitBills(address);
    await cache(CACHE_KEY, address, bills);
    log.debug('Split bills synced');
  } catch (error) {
    log.warn('Failed to sync split bills', error);
  }
}

// ============================================================================
// PRIVACY SETTINGS API
// ============================================================================

export type SplitPrivacySetting = 'anyone' | 'contacts' | 'none';

/**
 * Save user's split bill privacy setting to server
 */
export async function saveSplitPrivacySetting(
  address: string,
  setting: SplitPrivacySetting
): Promise<void> {
  try {
    const client = apiClient.withWallet(address);
    await client.post('/api/splits/privacy', { setting });
    log.info('Split privacy setting saved', { setting });
  } catch (error) {
    log.warn('Failed to save split privacy setting', error);
    // Don't throw - local setting is still saved
  }
}

export interface PrivacyCheckResult {
  address: string;
  canReceive: boolean;
  reason?: 'blocked_all' | 'contacts_only';
}

/**
 * Check if participants can receive split bills from sender
 * Returns list of participants who will NOT receive the request
 */
export async function checkSplitPrivacy(
  senderAddress: string,
  participantAddresses: string[]
): Promise<PrivacyCheckResult[]> {
  try {
    const client = apiClient.withWallet(senderAddress);
    const result = await client.post<PrivacyCheckResult[]>(
      '/api/splits/privacy/check',
      { participantAddresses }
    );
    return result;
  } catch (error) {
    log.warn('Failed to check split privacy', error);
    // If check fails, assume all can receive (don't block creation)
    return participantAddresses.map((address) => ({
      address,
      canReceive: true,
    }));
  }
}

/**
 * Get names of participants who will not receive the split request
 */
export function getBlockedParticipantNames(
  results: PrivacyCheckResult[],
  participants: Array<{ address: string; name?: string; username?: string }>
): string[] {
  const blocked = results.filter((r) => !r.canReceive);
  return blocked.map((b) => {
    const participant = participants.find(
      (p) => p.address.toLowerCase() === b.address.toLowerCase()
    );
    return participant?.name || participant?.username || b.address.slice(0, 10) + '...';
  });
}
