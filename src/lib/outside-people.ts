import { splitEqually } from "@/lib/split";

/**
 * People outside the trip — the pure maths, kept out of the server action so
 * it can be tested on its own.
 *
 * The model: an expense shared with outside people stores MY share as its
 * `amount`, so every existing total counts what I consumed rather than what
 * I happened to front. What the others owe me — or what I owe whoever paid —
 * lives beside it in `contact_splits`.
 */

export const ME = "me";

export type OutsidePayer = typeof ME | string; // "me", or a contact id

export interface OutsideSplitRow {
  contactId: string;
  direction: "owes_me" | "i_owe";
  amount: number;
}

/**
 * Split a bill equally between me and `contactIds`.
 *
 * - I paid: each contact owes me their share.
 * - A contact paid: I owe THAT contact my share. What the other contacts owe
 *   the payer is between them, not mine to track, so it isn't recorded.
 *
 * Shares are exact in minor units (see `splitEqually`), with any remainder
 * carried by whoever paid — so the shares always sum to the bill.
 */
export function splitWithOutside(args: {
  bill: number;
  currency: string;
  contactIds: string[];
  payer: OutsidePayer;
}): { myShare: number; rows: OutsideSplitRow[] } {
  const contactIds = [...new Set(args.contactIds)].filter((id) => id && id !== ME);
  if (contactIds.length === 0) return { myShare: args.bill, rows: [] };
  if (args.payer !== ME && !contactIds.includes(args.payer)) {
    throw new Error("Whoever paid has to be one of the people in the split");
  }

  const shares = splitEqually(args.bill, args.currency, [ME, ...contactIds], args.payer);
  const myShare = shares.find((s) => s.userId === ME)!.amountOwed;

  if (args.payer === ME) {
    return {
      myShare,
      rows: shares
        .filter((s) => s.userId !== ME)
        .map((s) => ({ contactId: s.userId, direction: "owes_me" as const, amount: s.amountOwed })),
    };
  }
  return { myShare, rows: [{ contactId: args.payer, direction: "i_owe", amount: myShare }] };
}

/**
 * Net position per contact, in whatever units the rows are already in.
 * Positive: they owe me. Negative: I owe them. Settled rows don't count.
 */
export function netByContact(
  rows: { contactId: string; direction: "owes_me" | "i_owe"; amount: number; settled: boolean }[],
): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rows) {
    if (r.settled) continue;
    const signed = r.direction === "owes_me" ? r.amount : -r.amount;
    out.set(r.contactId, (out.get(r.contactId) ?? 0) + signed);
  }
  return out;
}
