/**
 * React Hook for Transaction History
 * 
 * Usage:
 * ```typescript
 * const { transactions, loading, loadMore, refresh, setFilter } = useTransactionHistory();
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getTransactionHistory,
  type NormalizedTransaction,
  type HistoryFilter,
} from '../wallet/history';
import type { Network } from '../config/env';

export interface UseTransactionHistoryOptions {
  address: string;
  network: Network;
  autoLoad?: boolean;
}

export interface UseTransactionHistoryResult {
  transactions: NormalizedTransaction[];
  loading: boolean;
  refreshing: boolean;
  hasMore: boolean;
  error: Error | null;
  filter: HistoryFilter;
  setFilter: (filter: HistoryFilter) => void;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

const PAGE_SIZE = 20;

export function useTransactionHistory(
  options: UseTransactionHistoryOptions
): UseTransactionHistoryResult {
  const { address, network, autoLoad = true } = options;

  const [transactions, setTransactions] = useState<NormalizedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilterState] = useState<HistoryFilter>({});
  const [offset, setOffset] = useState(0);

  // Load transactions
  const load = useCallback(
    async (isRefresh: boolean = false) => {
      if (!address) return;

      try {
        if (isRefresh) {
          setRefreshing(true);
          setOffset(0);
        } else {
          setLoading(true);
        }

        setError(null);

        const newOffset = isRefresh ? 0 : offset;

        const result = await getTransactionHistory({
          address,
          network,
          limit: PAGE_SIZE,
          offset: newOffset,
          filter,
        });

        if (isRefresh) {
          setTransactions(result);
        } else {
          setTransactions(prev => [...prev, ...result]);
        }

        setHasMore(result.length === PAGE_SIZE);
        setOffset(newOffset + result.length);
      } catch (err) {
        console.error('Error loading transaction history:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [address, network, offset, filter]
  );

  // Load more (pagination)
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    await load(false);
  }, [loading, hasMore, load]);

  // Refresh
  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  // Set filter
  const setFilter = useCallback((newFilter: HistoryFilter) => {
    setFilterState(newFilter);
    setOffset(0);
    setTransactions([]);
    setHasMore(true);
  }, []);

  // Auto load on mount
  useEffect(() => {
    if (autoLoad && address) {
      load(true);
    }
  }, [address, network, filter]);

  return {
    transactions,
    loading,
    refreshing,
    hasMore,
    error,
    filter,
    setFilter,
    loadMore,
    refresh,
  };
}
