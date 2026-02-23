/**
 * Quote Cache -- caches swap/bridge quotes for 30 seconds.
 * Prevents re-fetching on every keystroke.
 */

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const CACHE_TTL = 30_000; // 30 seconds
const MAX_ENTRIES = 50;
const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Deterministic JSON stringification -- sorts object keys recursively
 * so that `{a:1,b:2}` and `{b:2,a:1}` produce the same key.
 */
function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  const sortedKeys = Object.keys(value as Record<string, unknown>).sort();
  const pairs = sortedKeys.map(
    (k) => JSON.stringify(k) + ':' + stableStringify((value as Record<string, unknown>)[k]),
  );
  return '{' + pairs.join(',') + '}';
}

function hashParams(params: Record<string, unknown>): string {
  return stableStringify(params);
}

export function getCachedQuote<T>(params: Record<string, unknown>): T | null {
  const key = hashParams(params);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCachedQuote<T>(params: Record<string, unknown>, data: T): void {
  const key = hashParams(params);
  cache.set(key, { data, fetchedAt: Date.now() });

  // Evict expired entries first
  if (cache.size > MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now - v.fetchedAt > CACHE_TTL) cache.delete(k);
    }
  }

  // If still over limit, evict oldest entries by fetchedAt
  if (cache.size > MAX_ENTRIES) {
    const entries = Array.from(cache.entries()).sort(
      ([, a], [, b]) => a.fetchedAt - b.fetchedAt,
    );
    const toRemove = entries.length - MAX_ENTRIES;
    for (let i = 0; i < toRemove; i++) {
      cache.delete(entries[i][0]);
    }
  }
}

export function clearQuoteCache(): void {
  cache.clear();
}
