/**
 * Tiny in-memory token-bucket rate limiter for API routes.
 *
 * Scope is per-process — fine for guarding against a single user hammering
 * a route. Swap for Upstash Redis when we go multi-region. Until then, this
 * is enough to keep Anthropic costs sane if someone scripts the AI routes.
 *
 * Usage:
 *   const r = checkLimit(`ai:${userId}`, { capacity: 10, refillPerSec: 0.2 });
 *   if (!r.ok) return new Response(`Slow down — ${r.retryAfter}s`, { status: 429 });
 */

interface Bucket {
  tokens: number;
  lastRefill: number; // ms
}

const buckets = new Map<string, Bucket>();

// Cheap GC — bucket eviction once we've grown past ~5k keys
function maybeEvict() {
  if (buckets.size < 5000) return;
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [k, v] of buckets.entries()) {
    if (v.lastRefill < cutoff) buckets.delete(k);
  }
}

export interface LimitOpts {
  /** Max tokens in the bucket (i.e. burst size). */
  capacity: number;
  /** Refill rate, tokens per second. capacity / refillPerSec = full-bucket time. */
  refillPerSec: number;
}

export interface LimitResult {
  ok: boolean;
  remaining: number;
  /** Suggested seconds to wait before retrying (only when !ok). */
  retryAfter: number;
}

export function checkLimit(key: string, opts: LimitOpts): LimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { tokens: opts.capacity, lastRefill: now };
    buckets.set(key, bucket);
    maybeEvict();
  }

  // Refill
  const elapsedSec = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(
    opts.capacity,
    bucket.tokens + elapsedSec * opts.refillPerSec,
  );
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { ok: true, remaining: Math.floor(bucket.tokens), retryAfter: 0 };
  }

  const retryAfter = Math.ceil((1 - bucket.tokens) / opts.refillPerSec);
  return { ok: false, remaining: 0, retryAfter };
}
