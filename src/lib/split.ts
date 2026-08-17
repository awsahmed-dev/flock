/**
 * Splitting money without conjuring or destroying it.
 *
 * The bug this replaces: `createExpense` stored `amount / members.length`
 * raw, and every display rounds to 2dp independently. Proven by test —
 * $100 split 7 ways told each of 7 people "$14.29", which sums to $100.03.
 * $10 split 3 ways lost a cent. The camera flow rounded BEFORE sending, so
 * $0.01 split 2 ways stored $0.02 — 200% of the bill. There was no
 * remainder step anywhere in the codebase.
 *
 * The fix is to do all arithmetic in MINOR UNITS (integers), which makes
 * the invariant exact rather than approximate: the shares always sum to
 * the total, for every amount, every party count and every currency.
 *
 * The remainder goes to the PAYER. They are the one out of pocket, and
 * they are the one person guaranteed to be in the split — so giving them
 * the odd cents means nobody is ever asked for more than their fair share.
 */

/**
 * Currencies whose minor unit is not 1/100. ISO 4217 exponents.
 * JPY/KRW have no subunit; KWD/BHD/OMR/JOD/TND have three decimals.
 * Anything not listed is assumed to be 2 — correct for the vast majority.
 */
const EXPONENTS: Record<string, number> = {
  JPY: 0, KRW: 0, VND: 0, CLP: 0, ISK: 0, XAF: 0, XOF: 0, XPF: 0, RWF: 0, UGX: 0, PYG: 0, DJF: 0, GNF: 0, KMF: 0, VUV: 0,
  KWD: 3, BHD: 3, OMR: 3, JOD: 3, TND: 3, LYD: 3, IQD: 3,
};

/** Decimal places for a currency. 2 unless ISO 4217 says otherwise. */
export function currencyExponent(currency: string | null | undefined): number {
  if (!currency) return 2;
  return EXPONENTS[currency.toUpperCase()] ?? 2;
}

/** e.g. 12.34 USD -> 1234 ; 1000 JPY -> 1000 ; 12.345 KWD -> 12345 */
export function toMinorUnits(amount: number, currency: string): number {
  return Math.round(amount * 10 ** currencyExponent(currency));
}

/** Inverse of toMinorUnits. */
export function fromMinorUnits(minor: number, currency: string): number {
  return minor / 10 ** currencyExponent(currency);
}

/**
 * Split `amount` equally between `userIds`, giving the remainder to
 * `payerId`. Returns major-unit amounts that sum EXACTLY to `amount`.
 *
 * If `payerId` is not in `userIds` the remainder goes to the first party —
 * it has to go somewhere, and silently dropping it is the bug being fixed.
 */
export function splitEqually(
  amount: number,
  currency: string,
  userIds: string[],
  payerId: string,
): { userId: string; amountOwed: number }[] {
  if (userIds.length === 0) return [];

  const totalMinor = toMinorUnits(amount, currency);
  const base = Math.trunc(totalMinor / userIds.length);
  let remainder = totalMinor - base * userIds.length;

  // Whoever carries the remainder is resolved once, not per iteration, so
  // the result is stable regardless of member ordering.
  const carrierIndex = Math.max(0, userIds.indexOf(payerId));

  return userIds.map((userId, i) => {
    let minor = base;
    if (i === carrierIndex) {
      minor += remainder;
      remainder = 0;
    }
    return { userId, amountOwed: fromMinorUnits(minor, currency) };
  });
}

/**
 * Does a set of shares add up to the expense? Used by the "split equally"
 * button's own validator, which previously rejected its own output at
 * $100 / 7 and $100 / 3 because it compared floats with a 0.01 tolerance.
 * In minor units the comparison is exact.
 */
export function sharesMatchTotal(
  shares: number[],
  amount: number,
  currency: string,
): boolean {
  const sum = shares.reduce((acc, s) => acc + toMinorUnits(s, currency), 0);
  return sum === toMinorUnits(amount, currency);
}
