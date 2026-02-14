/**
 * Business Wallet API Module
 * Pure functions that accept ApiClient as first argument.
 */

import type { ApiClient } from './client';
import type { BusinessWallet, BusinessActivity, Proposal } from '../types/business';

export interface SaveBusinessRequest {
  name: string;
  description?: string;
  icon?: string;
  tokenSymbol: string;
  tokenSupply: number;
  contractAddress: string;
  treasuryAddress: string;
  factoryTxHash: string;
  network: string;
  transferPolicy: string;
  quorumThreshold: number;
  votingPeriod: number;
  vestingEnabled: boolean;
  vestingConfig?: Record<string, unknown>;
  dividendsEnabled: boolean;
  dividendsConfig?: Record<string, unknown>;
  createdBy: string;
  members: { address: string; username?: string; shares: number; role: string }[];
}

export interface SaveProposalRequest {
  onChainId: number;
  type: string;
  title: string;
  description?: string;
  data?: Record<string, unknown>;
  deadline: string;
  createdBy: string;
}

/**
 * Save business metadata after contract deployment
 */
export async function saveBusiness(
  client: ApiClient,
  request: SaveBusinessRequest,
): Promise<BusinessWallet> {
  return client.withWallet(request.createdBy).post<BusinessWallet>('/api/business', request);
}

/**
 * Get business details by contract address
 */
export async function getBusiness(
  client: ApiClient,
  contractAddress: string,
): Promise<BusinessWallet> {
  return client.get<BusinessWallet>(`/api/business/${encodeURIComponent(contractAddress)}`);
}

/**
 * Get businesses for a user address
 */
export async function getUserBusinesses(
  client: ApiClient,
  address: string,
): Promise<BusinessWallet[]> {
  return client.get<BusinessWallet[]>(`/api/business/user/${encodeURIComponent(address)}`);
}

/**
 * Save proposal metadata
 */
export async function saveProposal(
  client: ApiClient,
  businessId: string,
  request: SaveProposalRequest,
): Promise<Proposal> {
  return client.withWallet(request.createdBy).post<Proposal>(
    `/api/business/${encodeURIComponent(businessId)}/proposal`,
    request,
  );
}

/**
 * Get activity log for a business
 */
export async function getBusinessActivity(
  client: ApiClient,
  businessId: string,
): Promise<BusinessActivity[]> {
  return client.get<BusinessActivity[]>(
    `/api/business/${encodeURIComponent(businessId)}/activity`,
  );
}

/**
 * Update business metadata
 */
export async function updateBusiness(
  client: ApiClient,
  id: string,
  data: Partial<BusinessWallet>,
  walletAddress: string,
): Promise<BusinessWallet> {
  return client.withWallet(walletAddress).put<BusinessWallet>(
    `/api/business/${encodeURIComponent(id)}`,
    data,
  );
}
