/**
 * Shared Transaction History Service
 * Pure fetch() functions for Alchemy getAssetTransfers.
 * No ethers dependency — apps handle fallback block scanning locally.
 */

export interface TransactionHistoryItem {
  hash: string;
  from: string;
  to: string;
  amount: string;
  token: string;
  direction: 'sent' | 'received';
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  timestamp: number;
  createdAt: string;
  networkId?: string; // which network this tx is on
}

/** Pagination cursor returned by Alchemy */
export interface TransactionPageKeys {
  receivedPageKey?: string;
  sentPageKey?: string;
}

/** Result with items + pagination cursors */
export interface TransactionHistoryPage {
  items: TransactionHistoryItem[];
  pageKeys: TransactionPageKeys;
  hasMore: boolean;
}

interface AlchemyTransfer {
  hash: string;
  from: string;
  to: string;
  asset: string;
  value: number;
  blockNum?: string;
  metadata?: { blockTimestamp?: string };
}

interface AlchemyResponse {
  result?: { transfers?: AlchemyTransfer[]; pageKey?: string };
}

/**
 * Build Alchemy getAssetTransfers request body.
 */
function buildAlchemyRequest(
  id: number,
  address: string,
  direction: 'to' | 'from',
  maxCount: string,
  pageKey?: string,
) {
  const params: Record<string, unknown> = {
    fromBlock: '0x0',
    toBlock: 'latest',
    category: ['external', 'erc20'],
    withMetadata: true,
    excludeZeroValue: false,
    maxCount,
    order: 'desc',
  };
  if (direction === 'to') params.toAddress = address;
  else params.fromAddress = address;
  if (pageKey) params.pageKey = pageKey;

  return {
    jsonrpc: '2.0',
    id,
    method: 'alchemy_getAssetTransfers',
    params: [params],
  };
}

function mapTransfers(transfers: AlchemyTransfer[], direction: 'received' | 'sent'): TransactionHistoryItem[] {
  return transfers.map(t => ({
    hash: t.hash,
    from: t.from,
    to: t.to,
    amount: Number(t.value ?? 0).toFixed(6),
    token: t.asset || 'ETH',
    direction,
    status: 'confirmed' as const,
    blockNumber: t.blockNum ? parseInt(t.blockNum, 16) : undefined,
    timestamp: t.metadata?.blockTimestamp
      ? new Date(t.metadata.blockTimestamp).getTime()
      : Date.now(),
    createdAt: t.metadata?.blockTimestamp || new Date().toISOString(),
  }));
}

/**
 * Fetch transaction history via Alchemy getAssetTransfers (paginated).
 * Returns items + pageKeys for cursor-based "load more".
 */
export async function fetchTransactionHistoryPage(
  alchemyUrl: string,
  address: string,
  limit: number = 20,
  pageKeys?: TransactionPageKeys,
): Promise<TransactionHistoryPage> {
  try {
    const maxCount = `0x${limit.toString(16)}`;

    const [receivedRes, sentRes] = await Promise.all([
      fetch(alchemyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildAlchemyRequest(1, address, 'to', maxCount, pageKeys?.receivedPageKey)),
      }),
      fetch(alchemyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildAlchemyRequest(2, address, 'from', maxCount, pageKeys?.sentPageKey)),
      }),
    ]);

    const [receivedData, sentData] = (await Promise.all([
      receivedRes.json(),
      sentRes.json(),
    ])) as [AlchemyResponse, AlchemyResponse];

    const transactions: TransactionHistoryItem[] = [
      ...mapTransfers(receivedData.result?.transfers || [], 'received'),
      ...mapTransfers(sentData.result?.transfers || [], 'sent'),
    ];

    // Deduplicate and sort
    const unique = new Map<string, TransactionHistoryItem>();
    transactions.sort((a, b) => b.timestamp - a.timestamp);
    for (const tx of transactions) {
      if (!unique.has(tx.hash)) {
        unique.set(tx.hash, tx);
      }
    }

    const newPageKeys: TransactionPageKeys = {
      receivedPageKey: receivedData.result?.pageKey,
      sentPageKey: sentData.result?.pageKey,
    };
    const hasMore = !!(newPageKeys.receivedPageKey || newPageKeys.sentPageKey);

    return {
      items: Array.from(unique.values()),
      pageKeys: newPageKeys,
      hasMore,
    };
  } catch {
    return { items: [], pageKeys: {}, hasMore: false };
  }
}

/**
 * Fetch transaction history (non-paginated, returns flat array).
 * Backwards-compatible wrapper for callers that don't need pagination.
 */
export async function fetchTransactionHistory(
  alchemyUrl: string,
  address: string,
  limit: number = 20,
): Promise<TransactionHistoryItem[]> {
  const page = await fetchTransactionHistoryPage(alchemyUrl, address, limit);
  return page.items.slice(0, limit);
}

/**
 * Paginated result for multi-chain fetch.
 */
export interface MultiChainTransactionPage {
  items: TransactionHistoryItem[];
  /** Per-network page keys for subsequent loads */
  networkPageKeys: Record<string, TransactionPageKeys>;
  hasMore: boolean;
}

/**
 * Fetch transaction history from multiple Alchemy URLs (paginated).
 */
export async function fetchMultiChainTransactionHistoryPage(
  networks: { networkId: string; alchemyUrl: string }[],
  address: string,
  limitPerNetwork: number = 10,
  networkPageKeys?: Record<string, TransactionPageKeys>,
): Promise<MultiChainTransactionPage> {
  const results = await Promise.allSettled(
    networks.map(async ({ networkId, alchemyUrl }) => {
      const pk = networkPageKeys?.[networkId];
      const page = await fetchTransactionHistoryPage(alchemyUrl, address, limitPerNetwork, pk);
      return {
        networkId,
        items: page.items.map(item => ({ ...item, networkId })),
        pageKeys: page.pageKeys,
        hasMore: page.hasMore,
      };
    }),
  );

  const allItems: TransactionHistoryItem[] = [];
  const newNetworkPageKeys: Record<string, TransactionPageKeys> = {};
  let anyHasMore = false;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value.items);
      newNetworkPageKeys[result.value.networkId] = result.value.pageKeys;
      if (result.value.hasMore) anyHasMore = true;
    }
  }

  allItems.sort((a, b) => {
    const timeA = typeof a.timestamp === 'number' ? a.timestamp : new Date(a.timestamp || 0).getTime();
    const timeB = typeof b.timestamp === 'number' ? b.timestamp : new Date(b.timestamp || 0).getTime();
    return timeB - timeA;
  });

  return { items: allItems, networkPageKeys: newNetworkPageKeys, hasMore: anyHasMore };
}

/**
 * Fetch transaction history from multiple Alchemy URLs (non-paginated).
 * Backwards-compatible wrapper.
 */
export async function fetchMultiChainTransactionHistory(
  networks: { networkId: string; alchemyUrl: string }[],
  address: string,
  limitPerNetwork: number = 10,
): Promise<TransactionHistoryItem[]> {
  const page = await fetchMultiChainTransactionHistoryPage(networks, address, limitPerNetwork);
  return page.items;
}
