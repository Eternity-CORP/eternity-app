import { API_BASE_URL } from '../config/env';
import { networkLogger } from './networkLogger';

export interface ShardTransaction {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface ShardState {
  totalShards: number;
  shardsEarnedToday: number;
  recentTransactions: ShardTransaction[];
}

function getBaseUrl(): string | null {
  if (!API_BASE_URL) {
    console.warn('[shardsService] EXPO_PUBLIC_API_BASE_URL is not set; shard API calls are disabled');
    return null;
  }
  return API_BASE_URL.replace(/\/$/, '');
}

export async function getShardState(options?: { authToken?: string }): Promise<ShardState | null> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    return null;
  }

  const url = `${baseUrl}/shards/me`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options?.authToken) {
    headers.Authorization = `Bearer ${options.authToken}`;
  }

  try {
    const response = await networkLogger.loggedFetch(url, { method: 'GET', headers });

    if (!response.ok) {
      console.warn(`[/shards/me] request failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    const state: ShardState = {
      totalShards: Number(data?.totalShards ?? 0),
      shardsEarnedToday: Number(data?.shardsEarnedToday ?? 0),
      recentTransactions: Array.isArray(data?.recentTransactions)
        ? data.recentTransactions.map((tx: any) => ({
            id: String(tx.id),
            amount: Number(tx.amount ?? 0),
            reason: tx.reason,
            createdAt: tx.createdAt,
          }))
        : [],
    };

    return state;
  } catch (error: any) {
    console.warn('[shardsService] Failed to load shard state:', error?.message || error);
    return null;
  }
}
