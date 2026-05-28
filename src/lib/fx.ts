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
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

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
 * Get rates with the given base currency. Returns NULL on network failure
 * — callers must handle that branch (no silent zero-rates).
 */
export async function getRates(base: string): Promise<RateBundle | null> {
  const key = base.toUpperCase();
  const hit = CACHE.get(key);
  if (hit && Date.now() - hit.fetchedAt < TTL_MS) return hit;
  const fresh = await fetchFresh(key);
  if (fresh) CACHE.set(key, fresh);
  // If fresh failed but we still have a stale bundle, prefer stale over nothing.
  return fresh ?? hit ?? null;
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
