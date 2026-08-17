/**
 * Trip readiness — THE single source of truth for both the percentage and
 * the checklist it opens.
 *
 * Why this file exists: the bar and its own checklist used to disagree.
 * `app/trips/[id]/page.tsx` computed a weighted score (locked days 40% ·
 * budget 10% · packing 20% · crew 10% · docs 20%) while
 * `readiness-checklist.tsx` and `trip-prep-checklist.tsx` each rendered a
 * separate 5-step boolean list. On a brand-new trip the bar read
 * "Trip 0% ready" while the list one tap below it read "1 done ✓" — same
 * card, same moment, two answers.
 *
 * The fix is structural, not arithmetic: percent and steps come out of one
 * call, so a caller cannot render a number that disagrees with the list.
 * There is no longer a `readiness: number` prop anyone can pass by hand.
 *
 * Steps are equally weighted (20% each) on purpose — the bar's job is to
 * summarise the list it opens, and a user must be able to verify it by
 * counting. Weighted scores can't be checked by eye.
 */

export type ReadinessStepId = "dates" | "crew" | "stops" | "budget" | "pack";

/** Everything the score depends on. Deliberately raw facts, not opinions. */
export interface ReadinessFacts {
  hasDates: boolean;
  crewCount: number;
  stopsCount: number;
  hasBudget: boolean;
  packedCount: number;
  packTotal: number;
}

export interface ReadinessStep {
  id: ReadinessStepId;
  done: boolean;
  /** i18n key for the step label. */
  labelKey: string;
  /** Path appended to the trip base, e.g. `${base}/members`. */
  path: string;
}

export interface TripReadiness {
  steps: ReadinessStep[];
  doneCount: number;
  total: number;
  /** 0–100, always `round(doneCount / total * 100)`. */
  percent: number;
  /** Convenience for the pack step's " · N%" suffix. */
  packingPercent: number;
}

export function tripReadiness(facts: ReadinessFacts): TripReadiness {
  const packingPercent =
    facts.packTotal > 0
      ? Math.round((facts.packedCount / facts.packTotal) * 100)
      : 0;

  const steps: ReadinessStep[] = [
    { id: "dates", done: facts.hasDates, labelKey: "cockpit.stepDates", path: "/settings" },
    { id: "crew", done: facts.crewCount > 1, labelKey: "cockpit.stepCrew", path: "/members" },
    { id: "stops", done: facts.stopsCount >= 1, labelKey: "cockpit.stepStops", path: "/itinerary" },
    { id: "budget", done: facts.hasBudget, labelKey: "cockpit.stepBudget", path: "/settings" },
    // Unchanged rule: packing completes at ≥50% packed, never on mere item
    // existence — "All set 🎉" must not render while packing is barely started.
    { id: "pack", done: packingPercent >= 50, labelKey: "cockpit.stepPack", path: "/pack" },
  ];

  const doneCount = steps.filter((s) => s.done).length;

  return {
    steps,
    doneCount,
    total: steps.length,
    percent: Math.round((doneCount / steps.length) * 100),
    packingPercent,
  };
}
