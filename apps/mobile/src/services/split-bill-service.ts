/**
 * Split Bill Service
 * Manages split bill requests with backend API and local cache
 */

import { API_BASE_URL } from '@/src/config/api';
import Storage from '@/src/utils/storage';

const SPLIT_BILLS_CACHE_KEY = 'split_bills_cache';
const REQUEST_TIMEOUT = 15000;

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

interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}

/**
 * Check if we're online
 */
function isOnline(): boolean {
  // In React Native, we could use NetInfo, but for simplicity assume online
  return true;
}

/**
 * Create fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Load cached split bills
 */
async function loadCachedSplitBills(address: string): Promise<SplitBill[]> {
  try {
    const cacheKey = `${SPLIT_BILLS_CACHE_KEY}_${address.toLowerCase()}`;
    const data = await Storage.getItem(cacheKey);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading cached split bills:', error);
    return [];
  }
}

/**
 * Save split bills to cache
 */
async function cacheSplitBills(address: string, bills: SplitBill[]): Promise<void> {
  try {
    const cacheKey = `${SPLIT_BILLS_CACHE_KEY}_${address.toLowerCase()}`;
    await Storage.setItem(cacheKey, JSON.stringify(bills));
  } catch (error) {
    console.error('Error caching split bills:', error);
  }
}

/**
 * Create a new split bill
 */
export async function createSplitBill(
  request: CreateSplitBillRequest
): Promise<SplitBill> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/api/splits`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-wallet-address': request.creatorAddress,
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Failed to create split bill');
  }

  const bill: SplitBill = await response.json();

  // Update cache
  const cached = await loadCachedSplitBills(request.creatorAddress);
  cached.unshift(bill);
  await cacheSplitBills(request.creatorAddress, cached);

  return bill;
}

/**
 * Get split bill by ID
 */
export async function getSplitBill(id: string): Promise<SplitBill> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/api/splits/${id}`,
    {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Split bill not found');
    }
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Failed to get split bill');
  }

  return response.json();
}

/**
 * Get split bills created by user
 */
export async function getCreatedSplitBills(
  creatorAddress: string
): Promise<SplitBill[]> {
  try {
    if (!isOnline()) {
      return loadCachedSplitBills(creatorAddress);
    }

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/splits/creator/${encodeURIComponent(creatorAddress)}`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      }
    );

    if (!response.ok) {
      console.warn('Failed to fetch split bills, using cache');
      return loadCachedSplitBills(creatorAddress);
    }

    const bills: SplitBill[] = await response.json();

    // Update cache
    await cacheSplitBills(creatorAddress, bills);

    return bills;
  } catch (error) {
    console.warn('Error fetching split bills, using cache:', error);
    return loadCachedSplitBills(creatorAddress);
  }
}

/**
 * Get pending split bills where user needs to pay
 */
export async function getPendingSplitBills(
  address: string
): Promise<SplitBill[]> {
  try {
    if (!isOnline()) {
      const cached = await loadCachedSplitBills(address);
      return cached.filter((b) => {
        const participant = b.participants.find(
          (p) => p.address.toLowerCase() === address.toLowerCase()
        );
        return participant && participant.status === 'pending' && b.status === 'active';
      });
    }

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/splits/pending/${encodeURIComponent(address)}`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      }
    );

    if (!response.ok) {
      console.warn('Failed to fetch pending split bills');
      return [];
    }

    return response.json();
  } catch (error) {
    console.warn('Error fetching pending split bills:', error);
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
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/api/splits/${id}`,
    {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'x-wallet-address': walletAddress,
      },
    }
  );

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Failed to cancel split bill');
  }

  const bill: SplitBill = await response.json();

  // Update cache
  const cached = await loadCachedSplitBills(walletAddress);
  const index = cached.findIndex((b) => b.id === id);
  if (index !== -1) {
    cached[index] = bill;
    await cacheSplitBills(walletAddress, cached);
  }

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
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/api/splits/${splitId}/pay`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-wallet-address': participantAddress,
      },
      body: JSON.stringify({
        participantAddress,
        txHash,
      }),
    }
  );

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Failed to mark participant as paid');
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

/**
 * Sync local cache with backend
 */
export async function syncSplitBills(address: string): Promise<void> {
  try {
    const bills = await getCreatedSplitBills(address);
    await cacheSplitBills(address, bills);
  } catch (error) {
    console.warn('Failed to sync split bills:', error);
  }
}
