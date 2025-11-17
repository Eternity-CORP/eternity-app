import { API_BASE_URL } from '../config/env';
import { networkLogger } from './networkLogger';
import { getOrCreateDeviceId } from './deviceIdService';

export interface ShardActionResult {
  earnedShards: number;
  totalShards?: number;
  shardsEarnedToday?: number;
  limitReason?: string;
}

function getBaseUrl(): string | null {
  if (!API_BASE_URL) {
    console.warn(
      '[shardEventsService] EXPO_PUBLIC_API_BASE_URL is not set; shard event API calls are disabled',
    );
    return null;
  }
  return API_BASE_URL.replace(/\/$/, '');
}

async function postJson(path: string, body: any): Promise<ShardActionResult | null> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return null;

  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const response = await networkLogger.loggedFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    console.warn(
      `[shardEventsService] request to ${url} failed: ${response.status} ${response.statusText}`,
    );
    return null;
  }

  const data = await response.json();
  return {
    earnedShards: Number(data?.earnedShards ?? 0),
    totalShards:
      typeof data?.totalShards === 'number' ? data.totalShards : undefined,
    shardsEarnedToday:
      typeof data?.shardsEarnedToday === 'number'
        ? data.shardsEarnedToday
        : undefined,
    limitReason:
      typeof data?.limitReason === 'string' ? data.limitReason : undefined,
  };
}

export async function reportSendShard(params: {
  walletAddress: string;
  amountEth: string;
  txHash?: string;
  recipientAddress?: string;
  network?: string;
}): Promise<ShardActionResult | null> {
  const deviceId = await getOrCreateDeviceId();
  return postJson('/shards/actions/send', { ...params, deviceId });
}

export async function reportScheduledPaymentShard(params: {
  walletAddress: string;
  amountEth?: string;
  recipientAddress?: string;
}): Promise<ShardActionResult | null> {
  const deviceId = await getOrCreateDeviceId();
  return postJson('/shards/actions/scheduled-payment', { ...params, deviceId });
}

export async function reportSplitBillShard(params: {
  walletAddress: string;
  totalAmount?: string;
  participantsCount?: number;
}): Promise<ShardActionResult | null> {
  const deviceId = await getOrCreateDeviceId();
  return postJson('/shards/actions/split-bill', { ...params, deviceId });
}
