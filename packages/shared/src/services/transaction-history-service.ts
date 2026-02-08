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
}

/**
 * Fetch transaction history via Alchemy getAssetTransfers
 * Fetches both sent and received transfers, deduplicates, sorts by timestamp.
 */
export async function fetchTransactionHistory(
  alchemyUrl: string,
  address: string,
  limit: number = 20,
): Promise<TransactionHistoryItem[]> {
  try {
    const maxCount = `0x${limit.toString(16)}`;

    const [receivedRes, sentRes] = await Promise.all([
      fetch(alchemyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'alchemy_getAssetTransfers',
          params: [{
            fromBlock: '0x0',
            toBlock: 'latest',
            toAddress: address,
            category: ['external'],
            withMetadata: true,
            excludeZeroValue: false,
            maxCount,
          }],
        }),
      }),
      fetch(alchemyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'alchemy_getAssetTransfers',
          params: [{
            fromBlock: '0x0',
            toBlock: 'latest',
            fromAddress: address,
            category: ['external'],
            withMetadata: true,
            excludeZeroValue: false,
            maxCount,
          }],
        }),
      }),
    ]);

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
      result?: { transfers?: AlchemyTransfer[] };
    }

    const [receivedData, sentData] = (await Promise.all([
      receivedRes.json(),
      sentRes.json(),
    ])) as [AlchemyResponse, AlchemyResponse];

    const transactions: TransactionHistoryItem[] = [];

    if (receivedData.result?.transfers) {
      for (const t of receivedData.result.transfers) {
        if (t.asset === 'ETH' && t.value) {
          transactions.push({
            hash: t.hash,
            from: t.from,
            to: t.to,
            amount: Number(t.value).toFixed(6),
            token: 'ETH',
            direction: 'received',
            status: 'confirmed',
            blockNumber: t.blockNum ? parseInt(t.blockNum, 16) : undefined,
            timestamp: t.metadata?.blockTimestamp
              ? new Date(t.metadata.blockTimestamp).getTime()
              : Date.now(),
            createdAt: t.metadata?.blockTimestamp || new Date().toISOString(),
          });
        }
      }
    }

    if (sentData.result?.transfers) {
      for (const t of sentData.result.transfers) {
        if (t.asset === 'ETH' && t.value) {
          transactions.push({
            hash: t.hash,
            from: t.from,
            to: t.to,
            amount: Number(t.value).toFixed(6),
            token: 'ETH',
            direction: 'sent',
            status: 'confirmed',
            blockNumber: t.blockNum ? parseInt(t.blockNum, 16) : undefined,
            timestamp: t.metadata?.blockTimestamp
              ? new Date(t.metadata.blockTimestamp).getTime()
              : Date.now(),
            createdAt: t.metadata?.blockTimestamp || new Date().toISOString(),
          });
        }
      }
    }

    // Deduplicate and sort
    const unique = new Map<string, TransactionHistoryItem>();
    transactions.sort((a, b) => b.timestamp - a.timestamp);
    for (const tx of transactions) {
      if (!unique.has(tx.hash)) {
        unique.set(tx.hash, tx);
      }
    }

    return Array.from(unique.values()).slice(0, limit);
  } catch {
    return [];
  }
}
