import { create } from 'zustand';
import type { ShardState } from '../../../services/shardsService';
import { getShardState } from '../../../services/shardsService';

interface ShardsStore {
  totalShards: number;
  shardsEarnedToday: number;
  lastUpdated?: number;
  lastEarnedAt?: number;
  loading: boolean;
  error?: string;
  loadShardState: (options?: { authToken?: string; force?: boolean }) => Promise<void>;
  applyEarnedShards: (count: number) => void;
}

export const useShards = create<ShardsStore>((set, get) => ({
  totalShards: 0,
  shardsEarnedToday: 0,
  lastUpdated: undefined,
  lastEarnedAt: undefined,
  loading: false,
  error: undefined,

  async loadShardState(options) {
    const { lastUpdated, loading, totalShards: prevTotal, lastEarnedAt } = get();

    if (loading) {
      return;
    }

    if (!options?.force && lastUpdated && Date.now() - lastUpdated < 30_000) {
      // Avoid spamming the backend; reuse recent value
      return;
    }

    set({ loading: true, error: undefined });

    try {
      const state: ShardState | null = await getShardState({ authToken: options?.authToken });
      if (!state) {
        set({ loading: false });
        return;
      }

      const increased = state.totalShards > prevTotal;

      set({
        totalShards: state.totalShards,
        shardsEarnedToday: state.shardsEarnedToday,
        lastUpdated: Date.now(),
        lastEarnedAt: increased ? Date.now() : lastEarnedAt,
        loading: false,
        error: undefined,
      });
    } catch (error: any) {
      set({
        loading: false,
        error: error?.message || 'Failed to load shard state',
      });
    }
  },

  applyEarnedShards(count: number) {
    if (!count || count <= 0) return;
    const { totalShards, shardsEarnedToday } = get();

    set({
      totalShards: totalShards + count,
      shardsEarnedToday: shardsEarnedToday + count,
      lastEarnedAt: Date.now(),
    });
  },
}));

export const selectShardTotals = (state: ShardsStore) => ({
  totalShards: state.totalShards,
  shardsEarnedToday: state.shardsEarnedToday,
});
