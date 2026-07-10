/**
 * QA BUG-11 — the trip budget the UI should reason about. A "per person"
 * budget stores the per-head number in trips.budget_total with
 * budget_type = 'per_person'; every read multiplies by the crew size so
 * "$2,000 per person × 4" reads as an $8,000 trip budget. Flat budgets
 * pass through unchanged.
 */
export function effectiveTripBudget(
  budgetTotal: number | string | null | undefined,
  budgetType: string | null | undefined,
  memberCount: number,
): number | null {
  if (budgetTotal == null) return null;
  const total = Number(budgetTotal);
  if (!Number.isFinite(total) || total <= 0) return null;
  return budgetType === "per_person" ? total * Math.max(1, memberCount) : total;
}
