import AsyncStorage from '@react-native-async-storage/async-storage';
import { ETHERSCAN_API_KEY, ENDPOINTS, getBaseUrl, getChainId, REQUEST_TIMEOUT_MS, RETRY_COUNT, RETRY_BACKOFF_MS } from '../../constants/etherscanApi';
import { DEFAULT_NETWORK, Network } from '../../config/env';

export enum TransactionType {
  SEND = 'SEND',
  RECEIVE = 'RECEIVE',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

export interface TransactionTokenInfo {
  symbol: string;
  decimals: number;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string; // wei for ETH or base units for tokens
  timestamp: number; // seconds
  status: TransactionStatus;
  token?: TransactionTokenInfo; // present for token transfers
  type: TransactionType;
}

type EtherscanResponse = {
  status: string;
  message: string;
  result: any[];
};

const CACHE_PREFIX = 'etherscan_tx_cache_';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function buildUrl(network: Network, query: string) {
  const base = getBaseUrl(network);
  const chainId = getChainId(network);
  const apiKey = ETHERSCAN_API_KEY ? `&apikey=${encodeURIComponent(ETHERSCAN_API_KEY)}` : '';
  // Etherscan API V2 format: ?chainid=X&module=...
  return `${base}?chainid=${chainId}&${query}${apiKey}`;
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function normalizeStatus(raw: any): TransactionStatus {
  // Etherscan fields: isError ('0'/'1'), txreceipt_status ('0'/'1'), blockNumber
  const isError = raw.isError === '1' || raw.txreceipt_status === '0';
  const isPending = !raw.blockNumber || raw.blockNumber === '0';
  if (isPending) return TransactionStatus.PENDING;
  if (isError) return TransactionStatus.FAILED;
  return TransactionStatus.CONFIRMED;
}

function parseNormalTx(address: string, tx: any): Transaction {
  const timestamp = Number(tx.timeStamp); // seconds
  const status = normalizeStatus(tx);
  const from = String(tx.from || '').toLowerCase();
  const to = String(tx.to || '').toLowerCase();
  return {
    hash: tx.hash,
    from,
    to,
    value: String(tx.value), // wei
    timestamp,
    status,
    type: from === address.toLowerCase() ? TransactionType.SEND : TransactionType.RECEIVE,
  };
}

function parseInternalTx(address: string, tx: any): Transaction {
  const timestamp = Number(tx.timeStamp);
  const from = String(tx.from || '').toLowerCase();
  const to = String(tx.to || '').toLowerCase();
  // Internal tx may not have receipt status; treat non-zero block as confirmed by default
  const status = tx.isError === '1' ? TransactionStatus.FAILED : (tx.blockNumber && tx.blockNumber !== '0' ? TransactionStatus.CONFIRMED : TransactionStatus.PENDING);
  return {
    hash: tx.hash || tx.parentHash || `${tx.traceId || ''}-${tx.blockNumber || '0'}`,
    from,
    to,
    value: String(tx.value || '0'), // wei
    timestamp,
    status,
    type: from === address.toLowerCase() ? TransactionType.SEND : TransactionType.RECEIVE,
  };
}

function parseTokenTx(address: string, tx: any): Transaction {
  const timestamp = Number(tx.timeStamp);
  const from = String(tx.from || '').toLowerCase();
  const to = String(tx.to || '').toLowerCase();
  const token: TransactionTokenInfo = {
    symbol: String(tx.tokenSymbol || 'TOKEN'),
    decimals: Number(tx.tokenDecimal || 18),
  };
  return {
    hash: tx.hash,
    from,
    to,
    value: String(tx.value), // base units (depends on tokenDecimal)
    timestamp,
    status: normalizeStatus(tx),
    token,
    type: from === address.toLowerCase() ? TransactionType.SEND : TransactionType.RECEIVE,
  };
}

function dedupeAndSort(list: Transaction[]): Transaction[] {
  const seen = new Set<string>();
  const out: Transaction[] = [];
  for (const tx of list) {
    const key = `${tx.hash}:${tx.timestamp}:${tx.value}:${tx.token?.symbol || 'ETH'}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(tx);
    }
  }
  return out.sort((a, b) => b.timestamp - a.timestamp);
}

async function getCached(address: string, network: Network, page: number, offset: number): Promise<Transaction[] | null> {
  try {
    const key = `${CACHE_PREFIX}${network}:${address.toLowerCase()}:${page}:${offset}`;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.data as Transaction[];
  } catch {
    return null;
  }
}

async function setCached(address: string, network: Network, page: number, offset: number, data: Transaction[]) {
  try {
    const key = `${CACHE_PREFIX}${network}:${address.toLowerCase()}:${page}:${offset}`;
    await AsyncStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

/**
 * Clear all transaction cache for a specific address
 */
export async function clearTransactionCache(address: string, network?: Network): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const prefix = network
      ? `${CACHE_PREFIX}${network}:${address.toLowerCase()}`
      : `${CACHE_PREFIX}`;

    const keysToRemove = keys.filter(k => k.startsWith(prefix));
    await AsyncStorage.multiRemove(keysToRemove);
    console.log(`🗑️ [etherscanService] Cleared ${keysToRemove.length} cache entries`);
  } catch (e) {
    console.warn(`⚠️ [etherscanService] Failed to clear cache:`, e);
  }
}

async function fetchWithRetry(url: string): Promise<EtherscanResponse> {
  let attempt = 0;
  let lastError: any;
  while (attempt <= RETRY_COUNT) {
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as EtherscanResponse;
      if (json.status === '0' && String(json.result).includes('Max rate limit')) {
        // backoff and retry
        await delay(RETRY_BACKOFF_MS * Math.pow(2, attempt));
        attempt++;
        continue;
      }
      return json;
    } catch (err: any) {
      lastError = err;
      if (err?.name === 'AbortError') {
        // timeout -> backoff and retry
        await delay(RETRY_BACKOFF_MS * Math.pow(2, attempt));
        attempt++;
        continue;
      }
      if (attempt < RETRY_COUNT) {
        await delay(RETRY_BACKOFF_MS * Math.pow(2, attempt));
        attempt++;
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export interface HistoryOptions {
  page?: number;
  offset?: number;
  network?: Network;
  forceRefresh?: boolean;
}

/**
 * Fetch transaction history using Etherscan (normal, internal, and token transfers)
 * - Authenticated using API key (if provided)
 * - Pagination via page/offset
 * - Caching with TTL invalidation
 * - Retry with exponential backoff
 */
export async function getTransactionHistory(address: string, options: HistoryOptions = {}): Promise<Transaction[]> {
  const network = options.network || DEFAULT_NETWORK;
  const page = options.page ?? 1;
  const offset = options.offset ?? 50;

  console.log(`🔍 [etherscanService] Fetching transaction history for ${address.slice(0, 6)}...${address.slice(-4)}`);
  console.log(`📄 [etherscanService] Network: ${network}, Page: ${page}, Offset: ${offset}, ForceRefresh: ${options.forceRefresh}`);

  const cached = !options.forceRefresh ? await getCached(address, network, page, offset) : null;
  if (cached) {
    console.log(`📦 [etherscanService] Using cached data: ${cached.length} transactions`);
    return cached;
  }

  const addr = address.toLowerCase();

  const normalUrl = buildUrl(network, `${ENDPOINTS.NORMAL_TX}&address=${addr}&startblock=0&endblock=99999999&sort=desc&page=${page}&offset=${offset}`);
  const internalUrl = buildUrl(network, `${ENDPOINTS.INTERNAL_TX}&address=${addr}&startblock=0&endblock=99999999&sort=desc&page=${page}&offset=${offset}`);
  const tokenUrl = buildUrl(network, `${ENDPOINTS.TOKEN_TX}&address=${addr}&startblock=0&endblock=99999999&sort=desc&page=${page}&offset=${offset}`);

  console.log(`🌐 [etherscanService] Fetching from Etherscan API...`);
  console.log(`🔗 [etherscanService] API Key present: ${ETHERSCAN_API_KEY ? 'YES' : 'NO'} (length: ${ETHERSCAN_API_KEY?.length || 0})`);
  console.log(`🔗 [etherscanService] Sample URL: ${normalUrl.replace(ETHERSCAN_API_KEY || '', 'HIDDEN')}`);

  const [normalResp, internalResp, tokenResp] = await Promise.all([
    fetchWithRetry(normalUrl),
    fetchWithRetry(internalUrl),
    fetchWithRetry(tokenUrl),
  ]);

  console.log(`📊 [etherscanService] API Responses:`);
  console.log(`  - Normal TX: status=${normalResp.status}, message=${normalResp.message}, result=${typeof normalResp.result === 'string' ? normalResp.result : `array[${normalResp.result?.length || 0}]`}`);
  console.log(`  - Internal TX: status=${internalResp.status}, message=${internalResp.message}, result=${typeof internalResp.result === 'string' ? internalResp.result : `array[${internalResp.result?.length || 0}]`}`);
  console.log(`  - Token TX: status=${tokenResp.status}, message=${tokenResp.message}, result=${typeof tokenResp.result === 'string' ? tokenResp.result : `array[${tokenResp.result?.length || 0}]`}`);

  const normalTxs: Transaction[] =
    normalResp.status === '1'
      ? normalResp.result.map((tx) => parseNormalTx(addr, tx))
      : [];

  const internalTxs: Transaction[] =
    internalResp.status === '1'
      ? internalResp.result.map((tx) => parseInternalTx(addr, tx))
      : [];

  const tokenTxs: Transaction[] =
    tokenResp.status === '1'
      ? tokenResp.result.map((tx) => parseTokenTx(addr, tx))
      : [];

  console.log(`🔢 [etherscanService] Parsed transactions: Normal=${normalTxs.length}, Internal=${internalTxs.length}, Token=${tokenTxs.length}`);

  const combined = dedupeAndSort([...normalTxs, ...internalTxs, ...tokenTxs]);

  console.log(`✅ [etherscanService] Final result: ${combined.length} unique transactions`);
  if (combined.length > 0) {
    console.log(`📝 [etherscanService] First transaction: ${JSON.stringify(combined[0])}`);
  }

  await setCached(address, network, page, offset, combined);
  return combined;
}
