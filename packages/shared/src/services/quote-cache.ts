/**
 * Quote Cache -- caches swap/bridge quotes for 30 seconds.
 * Prevents re-fetching on every keystroke.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 30_000; // 30 seconds
const MAX_ENTRIES = 50;
const cache = new Map<string, CacheEntry<unknown>>();

function hashParams(params: Record<string, unknown>): string {
  return JSON.stringify(params);
}

export function getCachedQuote<T>(params: Record<string, unknown>): T | null {
  const key = hashParams(params);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCachedQuote<T>(params: Record<string, unknown>, data: T): void {
  const key = hashParams(params);
  cache.set(key, { data, timestamp: Date.now() });

  // Evict old entries
  if (cache.size > MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now - v.timestamp > CACHE_TTL) cache.delete(k);
    }
  }
}

export function clearQuoteCache(): void {
  cache.clear();
}
