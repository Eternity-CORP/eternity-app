/**
 * Scheduled Payment Service
 * Manages scheduled payments with backend API and local cache
 *
 * Delegates API calls to @e-y/shared, keeps cache layer (platform-specific).
 */

import {
  getScheduledPayments as sharedGet,
  getScheduledPayment as sharedGetOne,
  getPendingScheduledPayments as sharedGetPending,
  getUpcomingScheduledPayments as sharedGetUpcoming,
  createScheduledPayment as sharedCreate,
  updateScheduledPayment as sharedUpdate,
  executeScheduledPayment as sharedExecute,
  cancelScheduledPayment as sharedCancel,
  deleteScheduledPayment as sharedDeletePayment,
  createApiClient,
  type ScheduledPayment,
  type CreateScheduledPaymentRequest,
  type UpdateScheduledPaymentRequest,
  type RecurringInterval,
  type ScheduledPaymentStatus,
} from '@e-y/shared';
import { API_BASE_URL } from '@/src/config/api';
import { createLogger } from '@/src/utils/logger';
import { loadCached, cache } from '@/src/utils/cache';

const log = createLogger('ScheduledPaymentService');

const apiClient = createApiClient({ baseUrl: API_BASE_URL });

const CACHE_KEY = 'scheduled_payments_cache';

export type { RecurringInterval, ScheduledPaymentStatus, ScheduledPayment, CreateScheduledPaymentRequest, UpdateScheduledPaymentRequest };

/**
 * Configure notifications for scheduled payments
 * @deprecated Use notification-service directly
 */
export async function configureNotifications(): Promise<void> {
  // No-op - use notification-service for notifications
}

/**
 * Load all scheduled payments from backend
 */
export async function loadScheduledPayments(
  creatorAddress: string
): Promise<ScheduledPayment[]> {
  try {
    const payments = await sharedGet(apiClient, creatorAddress);
    await cache(CACHE_KEY, creatorAddress, payments);
    return payments;
  } catch (error) {
    log.warn('Failed to fetch scheduled payments, using cache', error);
    return loadCached<ScheduledPayment>(CACHE_KEY, creatorAddress);
  }
}

/**
 * Create a new scheduled payment
 */
export async function createScheduledPayment(
  request: CreateScheduledPaymentRequest
): Promise<ScheduledPayment> {
  const payment = await sharedCreate(apiClient, request);

  // Update cache
  const cached = await loadCached<ScheduledPayment>(CACHE_KEY, request.creatorAddress);
  cached.unshift(payment);
  await cache(CACHE_KEY, request.creatorAddress, cached);

  log.info('Scheduled payment created', { id: payment.id });
  return payment;
}

/**
 * Get a single payment by ID
 */
export async function getScheduledPayment(id: string, walletAddress: string): Promise<ScheduledPayment | null> {
  try {
    return await sharedGetOne(apiClient, id, walletAddress);
  } catch {
    log.warn('Failed to get scheduled payment');
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
  const payment = await sharedUpdate(apiClient, id, updates, walletAddress);

  // Update cache
  const cached = await loadCached<ScheduledPayment>(CACHE_KEY, walletAddress);
  const index = cached.findIndex((p) => p.id === id);
  if (index !== -1) {
    cached[index] = payment;
    await cache(CACHE_KEY, walletAddress, cached);
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
  const payment = await sharedCancel(apiClient, id, walletAddress);

  // Update cache
  const cached = await loadCached<ScheduledPayment>(CACHE_KEY, walletAddress);
  const index = cached.findIndex((p) => p.id === id);
  if (index !== -1) {
    cached[index] = payment;
    await cache(CACHE_KEY, walletAddress, cached);
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
  await sharedDeletePayment(apiClient, id, walletAddress);

  // Update cache
  const cached = await loadCached<ScheduledPayment>(CACHE_KEY, walletAddress);
  const filtered = cached.filter((p) => p.id !== id);
  await cache(CACHE_KEY, walletAddress, filtered);

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
  const payment = await sharedExecute(apiClient, id, txHash, walletAddress);

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
    return await sharedGetPending(apiClient, creatorAddress);
  } catch (error) {
    log.warn('Failed to get pending payments', error);
    const cached = await loadCached<ScheduledPayment>(CACHE_KEY, creatorAddress);
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
    return await sharedGetUpcoming(apiClient, creatorAddress, days);
  } catch (error) {
    log.warn('Failed to get upcoming payments', error);
    const cached = await loadCached<ScheduledPayment>(CACHE_KEY, creatorAddress);
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
    await cache(CACHE_KEY, address, payments);
    log.debug('Scheduled payments synced');
  } catch (error) {
    log.warn('Failed to sync scheduled payments', error);
  }
}
