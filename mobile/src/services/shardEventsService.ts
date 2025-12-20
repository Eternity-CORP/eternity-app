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

async function postJson(path: string, body: any, authToken?: string): Promise<ShardActionResult | null> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) return null;

  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await networkLogger.loggedFetch(url, {
    method: 'POST',
    headers,
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
  amountEth: string;
  txHash?: string;
  recipientAddress?: string;
  network?: string;
  authToken?: string;
}): Promise<ShardActionResult | null> {
  const deviceId = await getOrCreateDeviceId();
  const { authToken, ...bodyParams } = params;
  return postJson('/shards/actions/send', { ...bodyParams, deviceId }, authToken);
}

export async function reportScheduledPaymentShard(params: {
  amountEth?: string;
  recipientAddress?: string;
  authToken?: string;
}): Promise<ShardActionResult | null> {
  const deviceId = await getOrCreateDeviceId();
  const { authToken, ...bodyParams } = params;
  return postJson('/shards/actions/scheduled-payment', { ...bodyParams, deviceId }, authToken);
}

export async function reportReceiveShard(params: {
  amountEth: string;
  txHash?: string;
  senderAddress?: string;
  network?: string;
  authToken?: string;
}): Promise<ShardActionResult | null> {
  const deviceId = await getOrCreateDeviceId();
  const { authToken, ...bodyParams } = params;
  return postJson('/shards/actions/receive', { ...bodyParams, deviceId }, authToken);
}

export async function reportSplitBillShard(params: {
  totalAmount?: string;
  participantsCount?: number;
  authToken?: string;
}): Promise<ShardActionResult | null> {
  const deviceId = await getOrCreateDeviceId();
  const { authToken, ...bodyParams } = params;
  return postJson('/shards/actions/split-bill', { ...bodyParams, deviceId }, authToken);
}
