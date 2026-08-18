import { diffDaysIso, toIsoDay } from "@/lib/today";
import { tripPhase, type TripPhase } from "@/lib/trip-phase";

/**
 * Now redesign, step 2 — the ONE clock, made finer.
 *
 * `tripPhase()` answers "which of four products is this trip right now?" and
 * stays the source of truth for the nav and the cockpit routing. `tripMoment()`
 * sits beside it and answers the questions the phase can't: how far into the
 * phase am I, is it the first or last day, what's due now. Everything that
 * used to grow its own little clock (the planning ladder, the evening recap,
 * readiness) reads this instead.
 *
 * Calendar-only, like tripPhase: `todayIso` comes from the server (`getToday()`)
 * or as a prop; no Date is constructed here. Time-of-day questions (is the day
 * over? what's next?) are `dayMoment()` below and take the client's clock
 * explicitly.
 */
export type PlanningWindow = "far" | "near";

export interface TripMoment {
  phase: TripPhase;
  todayIso: string;
  /** Days from today to the start (positive before, 0 on day 1, negative after). */
  daysToStart: number;
  /** Days from today to the end (0 on the last day, negative after). */
  daysToEnd: number;
  totalDays: number;
  /** LIVE only: 0-based day index; null otherwise. */
  dayIndex: number | null;
  isFirstDay: boolean;
  isLastDay: boolean;
  /** PLANNING only: "far" (> NEAR_DAYS out) or "near" (≤ NEAR_DAYS). */
  window: PlanningWindow | null;
  /**
   * What is DUE by now — the readiness/ladder schedule, one place:
   *   decisions, stops, crew  — always
   *   budget                  — from NEAR_DAYS out
   *   docs                    — from DEPARTURE (≤ 7)
   *   packing                 — from PACK_DAYS out
   */
  due: { budget: boolean; docs: boolean; packing: boolean };
}

export const NEAR_DAYS = 14;
export const PACK_DAYS = 2;

export function tripMoment(trip: { startDate: string; endDate: string }, todayIso: string): TripMoment {
  const today = toIsoDay(todayIso);
  const start = toIsoDay(trip.startDate);
  const end = toIsoDay(trip.endDate);
  const phase = tripPhase(trip, today);
  const daysToStart = diffDaysIso(today, start);
  const daysToEnd = diffDaysIso(today, end);
  const totalDays = Math.max(1, diffDaysIso(start, end) + 1);
  const dayIndex = phase === "LIVE" ? Math.max(0, Math.min(totalDays - 1, -daysToStart)) : null;
  const window: PlanningWindow | null = phase === "PLANNING" ? (daysToStart > NEAR_DAYS ? "far" : "near") : null;
  const started = daysToStart <= 0;
  return {
    phase,
    todayIso: today,
    daysToStart,
    daysToEnd,
    totalDays,
    dayIndex,
    isFirstDay: phase === "LIVE" && dayIndex === 0,
    isLastDay: phase === "LIVE" && today === end,
    window,
    due: {
      budget: started || daysToStart <= NEAR_DAYS,
      docs: started || daysToStart <= 7,
      packing: started || daysToStart <= PACK_DAYS,
    },
  };
}

// ─── time-of-day, LIVE ────────────────────────────────────────────────────────

export interface DayStop {
  id: string;
  /** "HH:mm" or null */
  startTime: string | null;
  done: boolean;
  /** booking anchors are pinned and don't count as "stops to do" */
  anchor?: boolean;
}

export interface DayMoment {
  /** regular (non-anchor) stops today */
  total: number;
  done: number;
  /** undone stops whose start time is still ahead of `nowHm` */
  aheadTimed: number;
  /** undone stops whose start time has passed (unmarked) */
  passedUnmarked: number;
  /** undone stops with no time */
  untimed: number;
  allDone: boolean;
  /** the next stop to surface: first undone whose time is ahead (or ≤ 5 min ago), else the last undone */
  nextId: string | null;
  /** minutes until `nextId` starts; null when untimed or none */
  minutesToNext: number | null;
  /**
   * The evening recap may show. Fires when everything is done, OR when it is
   * late (≥ EVENING_HOUR) AND nothing timed is still ahead. It never fires
   * while a stop with a later start time is outstanding — the itinerary
   * asserts the day is over; the clock only suggests it.
   */
  eveningRecap: boolean;
  /** late enough that unmarked past stops deserve a "done?" nudge */
  windingDown: boolean;
}

export const EVENING_HOUR = 21;

const toMin = (hm: string): number => {
  const [h, m] = hm.slice(0, 5).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function dayMoment(stops: DayStop[], nowHm: string): DayMoment {
  const now = toMin(nowHm);
  const regular = stops.filter((s) => !s.anchor);
  const undone = regular.filter((s) => !s.done).sort((a, b) => (a.startTime ?? "99").localeCompare(b.startTime ?? "99"));
  const aheadTimed = undone.filter((s) => s.startTime && toMin(s.startTime) >= now).length;
  const passedUnmarked = undone.filter((s) => s.startTime && toMin(s.startTime) < now).length;
  const untimed = undone.filter((s) => !s.startTime).length;
  const allDone = regular.length > 0 && undone.length === 0;
  const upcoming = undone.find((s) => !s.startTime || toMin(s.startTime) >= now - 5) ?? undone[undone.length - 1] ?? null;
  const minutesToNext = upcoming?.startTime ? Math.max(0, toMin(upcoming.startTime) - now) : null;
  const late = now >= EVENING_HOUR * 60;
  return {
    total: regular.length,
    done: regular.length - undone.length,
    aheadTimed,
    passedUnmarked,
    untimed,
    allDone,
    nextId: upcoming?.id ?? null,
    minutesToNext,
    eveningRecap: allDone || (late && aheadTimed === 0),
    windingDown: late,
  };
}
