/**
 * Module-scoped TTL cache for market data — SERVER-SIDE ONLY.
 *
 * Next.js `fetch(..., { next: { revalidate } })` hints are wiped by
 * `revalidatePath()`, so after every mutation the dashboard would re-fetch a
 * full year of price history from CoinGecko/Yahoo (slow, rate-limited). This
 * cache lives in module memory and is independent of the Next data cache, so
 * stable data (coin-id lookups, historical series) survives revalidation and
 * keeps re-renders fast. In-flight promises are shared to dedupe concurrent
 * calls for the same key.
 */
const store = new Map<string, { exp: number; val: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

export async function memo<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.exp > now) return hit.val as T;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const p = (async () => {
    try {
      const val = await fn();
      // don't cache empty/null results for long — let them retry sooner
      store.set(key, { exp: Date.now() + (val == null ? Math.min(ttlMs, 60_000) : ttlMs), val });
      return val;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p as Promise<T>;
}
