/**
 * Split Bill Service
 * Manages split bill requests with backend API and local cache
 *
 * Delegates API calls to @e-y/shared, keeps cache + privacy layers (platform-specific).
 */

import {
  createSplitBill as sharedCreate,
  getSplitBill as sharedGetBill,
  getSplitsByCreator as sharedGetByCreator,
  getPendingSplits as sharedGetPending,
  markSplitPaid as sharedMarkPaid,
  cancelSplit as sharedCancel,
  calculateEqualSplit as sharedCalcSplit,
  validateSplitAmounts as sharedValidate,
  createApiClient,
  type SplitBill,
  type SplitBillStatus,
  type SplitParticipant,
  type ParticipantStatus,
  type CreateSplitBillRequest,
} from '@e-y/shared';
import { API_BASE_URL } from '@/src/config/api';
import { createLogger } from '@/src/utils/logger';
import { loadCached, cache } from '@/src/utils/cache';

const log = createLogger('SplitBillService');

const apiClient = createApiClient({ baseUrl: API_BASE_URL });

const CACHE_KEY = 'split_bills_cache';

export type { SplitBillStatus, ParticipantStatus, SplitParticipant, SplitBill, CreateSplitBillRequest };

/**
 * Create a new split bill
 */
export async function createSplitBill(
  request: CreateSplitBillRequest
): Promise<SplitBill> {
  const bill = await sharedCreate(apiClient, request);

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
  return sharedGetBill(apiClient, id);
}

/**
 * Get split bills created by user
 */
export async function getCreatedSplitBills(
  creatorAddress: string
): Promise<SplitBill[]> {
  try {
    const bills = await sharedGetByCreator(apiClient, creatorAddress);
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
    return await sharedGetPending(apiClient, address);
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
  const bill = await sharedCancel(apiClient, id, walletAddress);

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
  const bill = await sharedMarkPaid(apiClient, splitId, participantAddress, txHash);
  log.info('Participant marked as paid', { splitId, participantAddress });
  return bill;
}

/**
 * Calculate equal split amounts
 */
export const calculateEqualSplit = sharedCalcSplit;

/**
 * Validate split amounts sum to total
 */
export const validateSplitAmounts = sharedValidate;

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
// PRIVACY SETTINGS API (mobile-specific — not in shared yet)
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
  }
}

export interface PrivacyCheckResult {
  address: string;
  canReceive: boolean;
  reason?: 'blocked_all' | 'contacts_only';
}

/**
 * Check if participants can receive split bills from sender
 */
export async function checkSplitPrivacy(
  senderAddress: string,
  participantAddresses: string[]
): Promise<PrivacyCheckResult[]> {
  try {
    const client = apiClient.withWallet(senderAddress);
    return await client.post<PrivacyCheckResult[]>(
      '/api/splits/privacy/check',
      { participantAddresses }
    );
  } catch (error) {
    log.warn('Failed to check split privacy', error);
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
