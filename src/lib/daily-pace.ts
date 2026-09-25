import { eachDayOfInterval, format, parseISO } from "date-fns";

/**
 * How much can I spend per day, and did I overspend today?
 *
 * The daily tracker used to divide the whole budget by the trip's days. That
 * over-promises whenever money went out BEFORE the trip — flights and hotels
 * are usually booked weeks ahead, dated before day 1, and so were never on
 * any day's row. A SAR 7,000 budget over 32 days read "SAR 219/day" while a
 * SAR 2,290 flight had already spent a third of it: the real figure was
 * about SAR 147. Someone pacing to 219 would overspend by half and the
 * tracker would never say so.
 *
 * Two numbers come out of this, on purpose:
 *
 * - `planPerDay` is fixed: (budget − spent before the trip) ÷ trip days.
 *   Each day is judged against it, so a past day's colour never changes
 *   after the fact.
 * - `allowanceFromToday` adapts: what's left ÷ days left, including today.
 *   It's the answer to "how much can I spend today and still land on
 *   budget" — overspend on Tuesday and Wednesday's allowance drops.
 *
 * Amounts must already be in one currency (the caller converts).
 */
export interface PaceExpense {
  date: string; // YYYY-MM-DD
  amount: number;
}

export interface DailyPace {
  preTrip: number;
  byDay: { dateKey: string; dayNumber: number; spent: number }[];
  tripDays: number;
  /** null without a budget. */
  planPerDay: number | null;
  /** null without a budget, or once the trip is over. */
  allowanceFromToday: number | null;
  daysLeft: number;
  /** Spent before the trip ate the whole budget. */
  budgetGoneBeforeTrip: boolean;
}

export function dailyPace(args: {
  expenses: PaceExpense[];
  startDate: string;
  endDate: string;
  budget: number | null;
  today: string;
}): DailyPace {
  const { startDate, endDate, today } = args;
  const budget = args.budget && args.budget > 0 ? args.budget : null;

  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) }).map((d) =>
    format(d, "yyyy-MM-dd"),
  );
  const tripDays = days.length;

  const perDay = new Map<string, number>();
  let preTrip = 0;
  for (const e of args.expenses) {
    if (e.date < startDate) preTrip += e.amount;
    else perDay.set(e.date, (perDay.get(e.date) ?? 0) + e.amount);
  }

  const byDay = days.map((dateKey, i) => ({ dateKey, dayNumber: i + 1, spent: perDay.get(dateKey) ?? 0 }));

  const planPerDay = budget == null || tripDays === 0 ? null : Math.max(0, (budget - preTrip) / tripDays);

  // Days still to come, today included. Before the trip that's all of them.
  const daysLeft =
    today < startDate ? tripDays : today > endDate ? 0 : days.filter((d) => d >= today).length;

  // What's gone already: everything before the trip, plus every trip day
  // before today. Today's own spend is part of today's allowance, not
  // subtracted from it — otherwise the number would shrink as you log.
  const spentBeforeToday =
    preTrip + byDay.filter((d) => d.dateKey < today).reduce((s, d) => s + d.spent, 0);

  const allowanceFromToday =
    budget == null || daysLeft === 0 ? null : Math.max(0, (budget - spentBeforeToday) / daysLeft);

  return {
    preTrip,
    byDay,
    tripDays,
    planPerDay,
    allowanceFromToday,
    daysLeft,
    budgetGoneBeforeTrip: budget != null && preTrip >= budget,
  };
}
