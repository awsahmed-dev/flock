import { z } from "zod";

/**
 * Launch audit §17 — input shape/range validation for server actions.
 *
 * The authz layer (membership checks, scoped lookups) already existed; what
 * was missing were BOUNDS. `parseFloat` + `isNaN` lets `Infinity`, negatives
 * and 1e308 through, and free-text fields had no length cap. These helpers
 * close that gap without changing behavior for any valid input.
 *
 * Every helper throws the same plain `Error` the actions already throw, so
 * client toasts keep working unchanged.
 */

/** Money amounts: finite, positive, and bounded — a split can't be Infinity. */
export const zMoney = z.number().finite().gt(0).max(1_000_000_000);

/** Like zMoney but zero is allowed (per-member custom split rows). */
export const zMoneyOrZero = z.number().finite().min(0).max(1_000_000_000);

/** A real calendar day in YYYY-MM-DD. */
export const zDateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  });

/** Non-empty trimmed text with a hard length cap. */
export const zText = (max: number) => z.string().trim().min(1).max(max);

/** Parse or throw a plain Error with the given user-facing message. */
export function parseOr<T>(schema: z.ZodType<T>, value: unknown, message: string): T {
  const r = schema.safeParse(value);
  if (!r.success) throw new Error(message);
  return r.data;
}
