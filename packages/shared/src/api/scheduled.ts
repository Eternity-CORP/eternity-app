/**
 * Scheduled Payments API Module
 * Pure functions that accept ApiClient as first argument.
 * All endpoints require x-wallet-address header (use client.withWallet()).
 */

import type { ApiClient } from './client';
import type { ScheduledPayment, CreateScheduledPaymentRequest, UpdateScheduledPaymentRequest } from '../types/scheduled';

export type { ScheduledPayment, CreateScheduledPaymentRequest, UpdateScheduledPaymentRequest };

/**
 * Get all scheduled payments for the wallet
 */
export async function getScheduledPayments(
  client: ApiClient,
  walletAddress: string,
): Promise<ScheduledPayment[]> {
  return client.withWallet(walletAddress).get<ScheduledPayment[]>('/api/scheduled');
}

/**
 * Get a single scheduled payment by ID
 */
export async function getScheduledPayment(
  client: ApiClient,
  id: string,
): Promise<ScheduledPayment> {
  return client.get<ScheduledPayment>(`/api/scheduled/${id}`);
}

/**
 * Get pending payments
 */
export async function getPendingScheduledPayments(
  client: ApiClient,
  walletAddress: string,
): Promise<ScheduledPayment[]> {
  return client.withWallet(walletAddress).get<ScheduledPayment[]>('/api/scheduled/pending');
}

/**
 * Get upcoming payments within N days
 */
export async function getUpcomingScheduledPayments(
  client: ApiClient,
  walletAddress: string,
  days: number = 7,
): Promise<ScheduledPayment[]> {
  return client.withWallet(walletAddress).get<ScheduledPayment[]>(
    `/api/scheduled/upcoming?days=${days}`,
  );
}

/**
 * Create a new scheduled payment
 */
export async function createScheduledPayment(
  client: ApiClient,
  request: CreateScheduledPaymentRequest,
): Promise<ScheduledPayment> {
  return client.withWallet(request.creatorAddress).post<ScheduledPayment>(
    '/api/scheduled',
    request,
  );
}

/**
 * Update a scheduled payment
 */
export async function updateScheduledPayment(
  client: ApiClient,
  id: string,
  updates: UpdateScheduledPaymentRequest,
  walletAddress: string,
): Promise<ScheduledPayment> {
  return client.withWallet(walletAddress).put<ScheduledPayment>(
    `/api/scheduled/${id}`,
    updates,
  );
}

/**
 * Execute a scheduled payment
 */
export async function executeScheduledPayment(
  client: ApiClient,
  id: string,
  txHash: string,
  walletAddress: string,
): Promise<ScheduledPayment> {
  return client.withWallet(walletAddress).post<ScheduledPayment>(
    `/api/scheduled/${id}/execute`,
    { txHash },
  );
}

/**
 * Cancel a scheduled payment
 */
export async function cancelScheduledPayment(
  client: ApiClient,
  id: string,
  walletAddress: string,
): Promise<ScheduledPayment> {
  return client.withWallet(walletAddress).post<ScheduledPayment>(
    `/api/scheduled/${id}/cancel`,
  );
}

/**
 * Delete a scheduled payment permanently
 */
export async function deleteScheduledPayment(
  client: ApiClient,
  id: string,
  walletAddress: string,
): Promise<void> {
  await client.withWallet(walletAddress).delete(`/api/scheduled/${id}`);
}
