import { and, eq, or } from "drizzle-orm";
import { expenses } from "@/lib/db/schema";

/**
 * Who may see an expense.
 *
 * A personal expense is its payer's business alone — "just me" means just
 * me. Until now it was private only in the balance maths: every member's
 * Money page, cockpit and dashboard summed it, the chat got a card for it,
 * and the public share page counted it in "trip cost" for anyone holding the
 * link. Every read that shows expenses to a person goes through one of
 * these two filters instead of a bare `eq(expenses.tripId, …)`.
 *
 * Row-level security enforces the same rule for any direct client read
 * (migrations/2026-09-25_personal_expenses_private.sql).
 */

/** What `viewerId` may see in a trip: everything shared, plus their own personal spend. */
export function visibleExpenses(tripId: string, viewerId: string) {
  return and(eq(expenses.tripId, tripId), or(eq(expenses.scope, "shared"), eq(expenses.paidBy, viewerId)))!;
}

/** What the crew as a whole — or the public — may see: shared spend only. */
export function sharedExpenses(tripId: string) {
  return and(eq(expenses.tripId, tripId), eq(expenses.scope, "shared"))!;
}
