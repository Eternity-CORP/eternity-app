/**
 * Scheduled Payment Service
 * Manages scheduled payments with backend API and local cache
 */

import { apiClient, ApiError } from './api-client';
import { createLogger } from '@/src/utils/logger';
import Storage from '@/src/utils/storage';

const log = createLogger('ScheduledPaymentService');

const SCHEDULED_PAYMENTS_CACHE_KEY = 'scheduled_payments_cache';

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

// Cache helpers
async function loadCachedPayments(address: string): Promise<ScheduledPayment[]> {
  try {
    const cacheKey = `${SCHEDULED_PAYMENTS_CACHE_KEY}_${address.toLowerCase()}`;
    const data = await Storage.getItem(cacheKey);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    log.warn('Failed to load cached payments', error);
    return [];
  }
}

async function cachePayments(address: string, payments: ScheduledPayment[]): Promise<void> {
  try {
    const cacheKey = `${SCHEDULED_PAYMENTS_CACHE_KEY}_${address.toLowerCase()}`;
    await Storage.setItem(cacheKey, JSON.stringify(payments));
  } catch (error) {
    log.warn('Failed to cache payments', error);
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
    const client = apiClient.withWallet(creatorAddress);
    const payments = await client.get<ScheduledPayment[]>('/api/scheduled');
    await cachePayments(creatorAddress, payments);
    return payments;
  } catch (error) {
    log.warn('Failed to fetch scheduled payments, using cache', error);
    return loadCachedPayments(creatorAddress);
  }
}

/**
 * Create a new scheduled payment
 */
export async function createScheduledPayment(
  request: CreateScheduledPaymentRequest
): Promise<ScheduledPayment> {
  const client = apiClient.withWallet(request.creatorAddress);
  const payment = await client.post<ScheduledPayment>('/api/scheduled', request);

  // Update cache
  const cached = await loadCachedPayments(request.creatorAddress);
  cached.unshift(payment);
  await cachePayments(request.creatorAddress, cached);

  log.info('Scheduled payment created', { id: payment.id });
  return payment;
}

/**
 * Get a single payment by ID
 */
export async function getScheduledPayment(id: string): Promise<ScheduledPayment | null> {
  try {
    return await apiClient.get<ScheduledPayment>(`/api/scheduled/${id}`);
  } catch (error) {
    if (ApiError.isApiError(error) && error.statusCode === 404) {
      return null;
    }
    log.warn('Failed to get scheduled payment', error);
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
  const client = apiClient.withWallet(walletAddress);
  const payment = await client.put<ScheduledPayment>(`/api/scheduled/${id}`, updates);

  // Update cache
  const cached = await loadCachedPayments(walletAddress);
  const index = cached.findIndex((p) => p.id === id);
  if (index !== -1) {
    cached[index] = payment;
    await cachePayments(walletAddress, cached);
  }

  log.info('Scheduled payment updated', { id });
  return payment;
}

/**
 * Cancel a scheduled payment
 */
export async function cancelScheduledPayment(
  id: string,
  walletAddress: string
): Promise<boolean> {
  const client = apiClient.withWallet(walletAddress);
  const payment = await client.post<ScheduledPayment>(`/api/scheduled/${id}/cancel`);

  // Update cache
  const cached = await loadCachedPayments(walletAddress);
  const index = cached.findIndex((p) => p.id === id);
  if (index !== -1) {
    cached[index] = payment;
    await cachePayments(walletAddress, cached);
  }

  log.info('Scheduled payment cancelled', { id });
  return true;
}

/**
 * Delete a scheduled payment permanently
 */
export async function deleteScheduledPayment(
  id: string,
  walletAddress: string
): Promise<boolean> {
  const client = apiClient.withWallet(walletAddress);
  await client.delete(`/api/scheduled/${id}`);

  // Update cache
  const cached = await loadCachedPayments(walletAddress);
  const filtered = cached.filter((p) => p.id !== id);
  await cachePayments(walletAddress, filtered);

  log.info('Scheduled payment deleted', { id });
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
  const client = apiClient.withWallet(walletAddress);
  const payment = await client.post<ScheduledPayment>(`/api/scheduled/${id}/execute`, { txHash });

  // Refresh cache to include any new recurring payment
  await syncScheduledPayments(walletAddress);

  log.info('Scheduled payment executed', { id, txHash });
  return payment;
}

/**
 * Get pending payments for an address
 */
export async function getPendingPayments(
  creatorAddress: string
): Promise<ScheduledPayment[]> {
  try {
    const client = apiClient.withWallet(creatorAddress);
    return await client.get<ScheduledPayment[]>('/api/scheduled/pending');
  } catch (error) {
    log.warn('Failed to get pending payments', error);
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
    const client = apiClient.withWallet(creatorAddress);
    return await client.get<ScheduledPayment[]>(`/api/scheduled/upcoming?days=${days}`);
  } catch (error) {
    log.warn('Failed to get upcoming payments', error);
    const cached = await loadCachedPayments(creatorAddress);
    const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return cached.filter(
      (p) => p.status === 'pending' && new Date(p.scheduledAt) <= futureDate
    );
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
    log.debug('Scheduled payments synced');
  } catch (error) {
    log.warn('Failed to sync scheduled payments', error);
  }
}
