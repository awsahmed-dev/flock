/**
 * Real-time FX rates via exchangerate.host (free, no key, ~30 currencies via
 * ECB plus many world currencies). Refreshed once per 24h per base currency
 * — travel apps don't need minute-by-minute precision; what matters is that
 * "AED 200" shows up in someone's USD budget without the user doing math.
 *
 * We keep a module-level in-memory cache so each server runtime reuses the
 * same map across requests. In Vercel this is per-instance — fine, the
 * upstream is fast and bursting a fresh fetch every cold start is cheap.
 */

interface RateBundle {
  base: string;
  /** ISO code → multiplier to convert from base to that currency. */
  rates: Record<string, number>;
  fetchedAt: number;
}

const CACHE = new Map<string, RateBundle>();
const TTL_MS = 24 * 60 * 60 * 1000; // 24h — fresh window
// Hard ceiling: we keep stale bundles for 7d so a multi-day upstream outage
// doesn't strip every page of FX. Past this we drop and return null.
const STALE_MAX_MS = 7 * 24 * 60 * 60 * 1000;

// In-flight requests per base — collapses a thundercluster of concurrent
// page loads after TTL expiry into a single upstream fetch.
const INFLIGHT = new Map<string, Promise<RateBundle | null>>();

const API = "https://api.exchangerate.host/latest";

async function fetchFresh(base: string): Promise<RateBundle | null> {
  try {
    const url = `${API}?base=${encodeURIComponent(base)}`;
    // 5s timeout so a flaky network never stalls a page render. Falls back
    // to "no FX available" — the UI shows raw amounts in that case.
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = (await res.json()) as { base?: string; rates?: Record<string, number> };
    if (!data?.rates || typeof data.rates !== "object") return null;
    return {
      base: (data.base ?? base).toUpperCase(),
      rates: data.rates,
      fetchedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Get rates with the given base currency.
 *
 * Strategy: stale-while-revalidate, in-memory per Vercel instance.
 *   - Fresh hit (< 24h) → return it, no fetch.
 *   - Stale-but-usable hit (< 7d) → return it, kick off a background
 *     revalidate so the next caller gets fresh data without paying the
 *     latency now.
 *   - No usable hit → fetch synchronously, return result (or null).
 *
 * Multiple concurrent callers post-TTL share a single in-flight fetch.
 * Returns NULL on hard failure — callers handle that branch (raw amounts,
 * no "≈" hint).
 *
 * Once we outgrow per-instance memory, swap CACHE for @vercel/kv or
 * Upstash — the public API stays the same.
 */
export async function getRates(base: string): Promise<RateBundle | null> {
  const key = base.toUpperCase();
  const hit = CACHE.get(key);
  const now = Date.now();

  if (hit && now - hit.fetchedAt < TTL_MS) return hit;

  // Stale-but-usable: return immediately, refresh in background. Don't
  // await; the next request reaps the fresh value.
  if (hit && now - hit.fetchedAt < STALE_MAX_MS) {
    if (!INFLIGHT.has(key)) {
      const p = fetchFresh(key).then((fresh) => {
        if (fresh) CACHE.set(key, fresh);
        INFLIGHT.delete(key);
        return fresh;
      });
      INFLIGHT.set(key, p);
      // Swallow rejections — this is a fire-and-forget background refresh.
      p.catch(() => INFLIGHT.delete(key));
    }
    return hit;
  }

  // Cold or past stale ceiling — synchronous fetch.
  if (INFLIGHT.has(key)) return INFLIGHT.get(key)!;
  const p = fetchFresh(key).finally(() => INFLIGHT.delete(key));
  INFLIGHT.set(key, p);
  const fresh = await p;
  if (fresh) CACHE.set(key, fresh);
  return fresh ?? null;
}

/**
 * Convert `amount` from `from` to `to` using the bundle's base-anchored
 * rates. Returns NULL when either currency is missing — caller decides
 * whether to show "≈" or just hide the conversion.
 */
export function convert(
  amount: number,
  from: string,
  to: string,
  bundle: RateBundle | null,
): number | null {
  if (!bundle) return null;
  if (from === to) return amount;
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  const base = bundle.base;

  // rates map: base → currency. So 1 base = rates[c] units of c.
  // amount in `from`, want in `to`:
  //   amountInBase = amount / rates[from]   (if from != base)
  //   amountInTo   = amountInBase * rates[to]
  const rFrom = f === base ? 1 : bundle.rates[f];
  const rTo = t === base ? 1 : bundle.rates[t];
  if (!rFrom || !rTo) return null;
  return (amount / rFrom) * rTo;
}

export type { RateBundle };
