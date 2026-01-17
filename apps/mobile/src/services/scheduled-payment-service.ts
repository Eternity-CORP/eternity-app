/**
 * Scheduled Payment Service
 * Manages scheduled payments with backend API and local cache
 *
 * Note: Notifications are disabled in Expo Go. Build a development client
 * for full notification support.
 */

import { API_BASE_URL } from '@/src/config/api';
import Storage from '@/src/utils/storage';

const SCHEDULED_PAYMENTS_CACHE_KEY = 'scheduled_payments_cache';
const REQUEST_TIMEOUT = 15000;

export type RecurringInterval = 'daily' | 'weekly' | 'monthly';
export type ScheduledPaymentStatus = 'pending' | 'executed' | 'cancelled' | 'failed';

export interface ScheduledPayment {
  id: string;
  creatorAddress: string;
  recipient: string;
  recipientUsername?: string;
  recipientName?: string;
  amount: string;
  tokenSymbol: string;
  scheduledAt: string;
  recurringInterval?: RecurringInterval | null;
  recurringEndDate?: string | null;
  description?: string;
  status: ScheduledPaymentStatus;
  executedTxHash?: string | null;
  executedAt?: string | null;
  reminderSent?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScheduledPaymentRequest {
  creatorAddress: string;
  recipient: string;
  recipientUsername?: string;
  recipientName?: string;
  amount: string;
  tokenSymbol: string;
  scheduledAt: string;
  recurringInterval?: RecurringInterval;
  recurringEndDate?: string;
  description?: string;
}

export interface UpdateScheduledPaymentRequest {
  recipient?: string;
  recipientUsername?: string;
  recipientName?: string;
  amount?: string;
  tokenSymbol?: string;
  scheduledAt?: string;
  recurringInterval?: RecurringInterval | null;
  recurringEndDate?: string | null;
  description?: string;
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
 * Load cached scheduled payments
 */
async function loadCachedPayments(address: string): Promise<ScheduledPayment[]> {
  try {
    const cacheKey = `${SCHEDULED_PAYMENTS_CACHE_KEY}_${address.toLowerCase()}`;
    const data = await Storage.getItem(cacheKey);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading cached payments:', error);
    return [];
  }
}

/**
 * Save payments to cache
 */
async function cachePayments(address: string, payments: ScheduledPayment[]): Promise<void> {
  try {
    const cacheKey = `${SCHEDULED_PAYMENTS_CACHE_KEY}_${address.toLowerCase()}`;
    await Storage.setItem(cacheKey, JSON.stringify(payments));
  } catch (error) {
    console.error('Error caching payments:', error);
  }
}

/**
 * Configure notifications (no-op in Expo Go)
 */
export async function configureNotifications(): Promise<void> {
  // Notifications require development build
}

/**
 * Request notification permissions (no-op in Expo Go)
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  return false;
}

/**
 * Load all scheduled payments from backend
 */
export async function loadScheduledPayments(
  creatorAddress: string
): Promise<ScheduledPayment[]> {
  try {
    if (!isOnline()) {
      return loadCachedPayments(creatorAddress);
    }

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/scheduled`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-wallet-address': creatorAddress,
        },
      }
    );

    if (!response.ok) {
      console.warn('Failed to fetch scheduled payments, using cache');
      return loadCachedPayments(creatorAddress);
    }

    const payments: ScheduledPayment[] = await response.json();

    // Update cache
    await cachePayments(creatorAddress, payments);

    return payments;
  } catch (error) {
    console.warn('Error fetching scheduled payments, using cache:', error);
    return loadCachedPayments(creatorAddress);
  }
}

/**
 * Create a new scheduled payment
 */
export async function createScheduledPayment(
  request: CreateScheduledPaymentRequest
): Promise<ScheduledPayment> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/api/scheduled`,
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
    throw new Error(error.message || 'Failed to create scheduled payment');
  }

  const payment: ScheduledPayment = await response.json();

  // Update cache
  const cached = await loadCachedPayments(request.creatorAddress);
  cached.unshift(payment);
  await cachePayments(request.creatorAddress, cached);

  return payment;
}

/**
 * Get a single payment by ID
 */
export async function getScheduledPayment(id: string): Promise<ScheduledPayment | null> {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/scheduled/${id}`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to get scheduled payment');
    }

    return response.json();
  } catch (error) {
    console.warn('Error getting scheduled payment:', error);
    return null;
  }
}

/**
 * Update a scheduled payment
 */
export async function updateScheduledPayment(
  id: string,
  updates: UpdateScheduledPaymentRequest,
  walletAddress: string
): Promise<ScheduledPayment | null> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/api/scheduled/${id}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-wallet-address': walletAddress,
      },
      body: JSON.stringify(updates),
    }
  );

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Failed to update scheduled payment');
  }

  const payment: ScheduledPayment = await response.json();

  // Update cache
  const cached = await loadCachedPayments(walletAddress);
  const index = cached.findIndex((p) => p.id === id);
  if (index !== -1) {
    cached[index] = payment;
    await cachePayments(walletAddress, cached);
  }

  return payment;
}

/**
 * Cancel a scheduled payment
 */
export async function cancelScheduledPayment(
  id: string,
  walletAddress: string
): Promise<boolean> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/api/scheduled/${id}/cancel`,
    {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'x-wallet-address': walletAddress,
      },
    }
  );

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Failed to cancel scheduled payment');
  }

  const payment: ScheduledPayment = await response.json();

  // Update cache
  const cached = await loadCachedPayments(walletAddress);
  const index = cached.findIndex((p) => p.id === id);
  if (index !== -1) {
    cached[index] = payment;
    await cachePayments(walletAddress, cached);
  }

  return true;
}

/**
 * Delete a scheduled payment permanently
 */
export async function deleteScheduledPayment(
  id: string,
  walletAddress: string
): Promise<boolean> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/api/scheduled/${id}`,
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
    throw new Error(error.message || 'Failed to delete scheduled payment');
  }

  // Update cache
  const cached = await loadCachedPayments(walletAddress);
  const filtered = cached.filter((p) => p.id !== id);
  await cachePayments(walletAddress, filtered);

  return true;
}

/**
 * Mark a payment as executed
 */
export async function markPaymentExecuted(
  id: string,
  txHash: string,
  walletAddress: string
): Promise<ScheduledPayment | null> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/api/scheduled/${id}/execute`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-wallet-address': walletAddress,
      },
      body: JSON.stringify({ txHash }),
    }
  );

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Failed to mark payment as executed');
  }

  const payment: ScheduledPayment = await response.json();

  // Refresh cache to include any new recurring payment
  await syncScheduledPayments(walletAddress);

  return payment;
}

/**
 * Get pending payments for an address
 */
export async function getPendingPayments(
  creatorAddress: string
): Promise<ScheduledPayment[]> {
  try {
    if (!isOnline()) {
      const cached = await loadCachedPayments(creatorAddress);
      return cached.filter((p) => p.status === 'pending');
    }

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/scheduled/pending`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-wallet-address': creatorAddress,
        },
      }
    );

    if (!response.ok) {
      const cached = await loadCachedPayments(creatorAddress);
      return cached.filter((p) => p.status === 'pending');
    }

    return response.json();
  } catch (error) {
    console.warn('Error getting pending payments:', error);
    const cached = await loadCachedPayments(creatorAddress);
    return cached.filter((p) => p.status === 'pending');
  }
}

/**
 * Get upcoming payments (next N days, default 7)
 */
export async function getUpcomingPayments(
  creatorAddress: string,
  days: number = 7
): Promise<ScheduledPayment[]> {
  try {
    if (!isOnline()) {
      const cached = await loadCachedPayments(creatorAddress);
      const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      return cached.filter(
        (p) => p.status === 'pending' && new Date(p.scheduledAt) <= futureDate
      );
    }

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/scheduled/upcoming?days=${days}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-wallet-address': creatorAddress,
        },
      }
    );

    if (!response.ok) {
      const cached = await loadCachedPayments(creatorAddress);
      const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      return cached.filter(
        (p) => p.status === 'pending' && new Date(p.scheduledAt) <= futureDate
      );
    }

    return response.json();
  } catch (error) {
    console.warn('Error getting upcoming payments:', error);
    return [];
  }
}

/**
 * Get overdue payments that haven't been executed
 */
export async function getOverduePayments(
  creatorAddress: string
): Promise<ScheduledPayment[]> {
  const pending = await getPendingPayments(creatorAddress);
  const now = new Date();

  return pending.filter((p) => new Date(p.scheduledAt) < now);
}

/**
 * Sync local cache with backend
 */
export async function syncScheduledPayments(address: string): Promise<void> {
  try {
    const payments = await loadScheduledPayments(address);
    await cachePayments(address, payments);
  } catch (error) {
    console.warn('Failed to sync scheduled payments:', error);
  }
}
