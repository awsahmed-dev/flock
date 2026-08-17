/**
 * Totalling multi-currency money without inventing a number.
 *
 * The bug this replaces: `convert()` returns null when a rate is missing —
 * which happens on any cold instance during an open.er-api outage — and every
 * caller invented its own fallback:
 *
 *   trips/[id]/page.tsx:91      `?? amt`  → ¥50,000 counted as $50,000 (156x)
 *   expenses-board.tsx:142      `?? 0`    → the same row counted as $0
 *
 * Rendered live on a seeded trip, that produced "TRIP TOTAL SPENT USD 520 ·
 * 17% used" on a trip containing a 96,000 KRW dinner — the dinner silently
 * counted as zero, stated in 32px type with no warning.
 *
 * Both fallbacks are wrong, and the second is worse than it looks: a total
 * that is quietly too low reads as good news.
 *
 * This module refuses to do either. It returns what it COULD convert plus an
 * explicit record of what it could not, so a caller has to decide how to
 * present an incomplete number instead of silently picking one.
 */
import { convert, type RateBundle } from "@/lib/fx";

export interface MoneyRow {
  amount: number;
  currency: string;
}

export interface MoneyTotal {
  /** Sum of every row that converted. NEVER includes a guessed value. */
  total: number;
  /** Rows that could not be converted, grouped by currency. */
  unconverted: MoneyRow[];
  /** True when every row converted — i.e. `total` is the whole story. */
  complete: boolean;
}

/**
 * Total `rows` in `target`. Rows already in `target` pass through untouched.
 *
 * When a rate is missing the row is EXCLUDED from `total` and recorded in
 * `unconverted`. Callers must handle `complete === false` — showing `total`
 * on its own is exactly the bug this exists to prevent.
 */
export function totalInCurrency(
  rows: MoneyRow[],
  target: string,
  rates: RateBundle | null,
): MoneyTotal {
  let total = 0;
  const missing = new Map<string, number>();

  for (const row of rows) {
    const amount = Number(row.amount) || 0;
    if (row.currency === target) {
      total += amount;
      continue;
    }
    const converted = convert(amount, row.currency, target, rates);
    if (converted == null) {
      missing.set(row.currency, (missing.get(row.currency) ?? 0) + amount);
      continue;
    }
    total += converted;
  }

  return {
    total,
    unconverted: [...missing.entries()].map(([currency, amount]) => ({ amount, currency })),
    complete: missing.size === 0,
  };
}

/**
 * Same, but keyed — for per-person spend and per-person balances.
 * `unconverted` is global rather than per key: if any rate is missing then
 * every derived figure is suspect, and saying so once is honest.
 */
export function totalInCurrencyBy<K>(
  rows: (MoneyRow & { key: K })[],
  target: string,
  rates: RateBundle | null,
): { byKey: Map<K, number>; unconverted: MoneyRow[]; complete: boolean } {
  const byKey = new Map<K, number>();
  const missing = new Map<string, number>();

  for (const row of rows) {
    const amount = Number(row.amount) || 0;
    const converted =
      row.currency === target ? amount : convert(amount, row.currency, target, rates);
    if (converted == null) {
      missing.set(row.currency, (missing.get(row.currency) ?? 0) + amount);
      continue;
    }
    byKey.set(row.key, (byKey.get(row.key) ?? 0) + converted);
  }

  return {
    byKey,
    unconverted: [...missing.entries()].map(([currency, amount]) => ({ amount, currency })),
    complete: missing.size === 0,
  };
}

/**
 * For client components that need a scalar `toBase(amount, ccy)` inside a
 * `useMemo` (expenses-board, balances, breakdown, transactions). Same rule as
 * above: a row whose rate is missing contributes 0 to the arithmetic AND is
 * recorded in `missing`, so the caller can render "total excludes KRW" next
 * to the headline instead of silently stating a too-low number.
 *
 * Replaces four copies of `return c ?? 0` — which was the exact "96,000 KRW
 * dinner counts as zero" bug this module exists to prevent.
 */
export function createBaseConverter(target: string, rates: RateBundle | null) {
  const missing = new Set<string>();
  function toBase(amount: number, ccy: string): number {
    const n = Number(amount) || 0;
    if (ccy === target) return n;
    const c = convert(n, ccy, target, rates);
    if (c == null) {
      missing.add(ccy);
      return 0;
    }
    return c;
  }
  return { toBase, missing };
}
