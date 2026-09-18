import type { BaseId, Segment } from "@/lib/packages/types";
import { redate, segmentNights } from "@/lib/packages/project";
import { addDays } from "@/lib/packages/allocate";
import { findStay } from "@/lib/packages/stay-key";

/**
 * Make the shape cover the trip exactly. No more, and no less.
 *
 * You choose the dates first, and everything after is arranging cities
 * inside them. So this is the rule the whole screen rests on: after ANY
 * edit, the stays run back-to-back from the first day and stop on the last.
 * A plan that runs past its own end date is not a long plan, it is a broken
 * one — the user already answered the length question and the app ignored
 * the answer.
 *
 * It used to fail in two opposite directions, and both are why this now
 * lives out here where a test can hammer it rather than inside a server
 * action that needs a database to run:
 *
 *  1. ONE PASS, ONE STAY. If no single stay could absorb the whole
 *     correction, the step was skipped and the shape stayed wrong. Pulling
 *     a 9-night trip back to 4 left two cities running five days past the
 *     end, nine stops on dates the trip no longer had, and no control on
 *     the screen able to repair it.
 *
 *  2. IT CHARGED THE STAY YOU JUST EDITED. The search ran from the tail, so
 *     editing the LAST city on a fully-covered trip found that same city
 *     first and undid the edit — its stepper was dead on every completed
 *     plan, while reporting "nowhere to put that night".
 */
export interface Fitted {
  segments: Segment[];
  /** whole stays the trip was too short to keep, in the order they went */
  dropped: BaseId[];
}

export function fitToTrip(
  input: Segment[],
  tripNights: number,
  tripStart: string,
  /**
   * The stay the user just acted on — it must not pay for its own change.
   *
   * A STAY key, not a city: a trip can hold two Jeddah legs, and a city
   * here would exempt both of them from funding an edit to one.
   */
  justTouched: string | null = null,
): Fitted {
  let segments = redate(input, tripStart);
  const dropped: BaseId[] = [];
  if (!segments.length) return { segments, dropped };

  // Bounded: every iteration either moves a night or removes a stay.
  let guard = segments.length + 2;
  let total = segments.reduce((n, sg) => n + segmentNights(sg), 0);

  while (total !== tripNights && segments.length && guard-- > 0) {
    const diff = tripNights - total;

    // Re-resolved every pass: the loop re-dates, which clones every
    // segment, so a reference captured once goes stale after one turn.
    const touched = justTouched ? findStay(segments, justTouched) : undefined;

    const canTake = (sg: Segment) =>
      !sg.lockedBy && sg !== touched && (diff > 0 || segmentNights(sg) > 1);
    // Prefer any stay other than the one just edited; fall back to it only
    // when nothing else can move, because the shape still has to close.
    const flex =
      [...segments].reverse().find(canTake) ??
      [...segments].reverse().find((sg) => !sg.lockedBy && (diff > 0 || segmentNights(sg) > 1));

    if (flex) {
      const room = diff > 0 ? diff : Math.max(diff, 1 - segmentNights(flex));
      flex.checkOut = addDays(flex.checkIn, segmentNights(flex) + room);
    } else if (diff < 0) {
      // Nothing left to shorten: the trip is now shorter than it has
      // cities. Drop a whole stay from the tail rather than give up — and
      // the caller reports which, because losing a city in silence is how
      // someone finds out on the day that Porto left their holiday.
      const victim = [...segments].reverse().find((sg) => !sg.lockedBy);
      if (!victim || segments.length <= 1) break;
      dropped.push(victim.baseId);
      segments = segments.filter((sg) => sg !== victim);
    } else {
      break;
    }

    segments = redate(segments, tripStart);
    total = segments.reduce((n, sg) => n + segmentNights(sg), 0);
  }

  return { segments, dropped };
}
