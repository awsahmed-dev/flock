import type { BaseId, Segment } from "@/lib/packages/types";

/**
 * Where a trip enters and leaves.
 *
 * "I'll be entering the country from this place or this city, and then I
 * travel back from this city or a different city."
 *
 * Three rules keep this from becoming another question nobody wants:
 *
 *  1. NOTHING IS ASKED UP FRONT. Both ends default to the shape's own first
 *     and last base. A round trip — most trips — never sees a control and
 *     never answers anything.
 *  2. THE STORED VALUE IS AN INTENT, NOT A LOCK. If it disagrees with the
 *     shape, we say so and offer both repairs: move the shape, or change the
 *     intent. Silently rewriting either one is how the date-change bug
 *     stranded nine rows in the database.
 *  3. REVERSE, NEVER ROTATE. A curated route is a line, not a loop: its
 *     transport legs and its geography only hold in order or in reverse.
 *     Lisbon → Porto reversed is a real trip; rotated to start in the middle
 *     is a plan that doubles back and pretends not to.
 */

export interface GatewayState {
  /** the base the trip flies into — stored, or the shape's first */
  arrive: BaseId | null;
  /** the base the trip flies home from — stored, or the shape's last */
  depart: BaseId | null;
  /** the user actually chose these, rather than inheriting the shape's ends */
  arriveSet: boolean;
  departSet: boolean;
  /** in through one city, home from another */
  openJaw: boolean;
  /** stored arrival is set but is not the shape's first base */
  arriveMismatch: boolean;
  /** stored departure is set but is not the shape's last base */
  departMismatch: boolean;
  /** a stored end names a city the shape does not visit at all */
  arriveMissing: boolean;
  departMissing: boolean;
}

export function gatewayState(
  segments: Segment[],
  arriveBaseId: string | null,
  departBaseId: string | null,
): GatewayState {
  const order = segments.map((s) => s.baseId);
  const first = order[0] ?? null;
  const last = order[order.length - 1] ?? null;

  const arriveSet = !!arriveBaseId;
  const departSet = !!departBaseId;
  const arrive = arriveBaseId ?? first;
  const depart = departBaseId ?? last;

  const arriveMissing = arriveSet && !order.includes(arriveBaseId!);
  const departMissing = departSet && !order.includes(departBaseId!);

  return {
    arrive,
    depart,
    arriveSet,
    departSet,
    openJaw: !!arrive && !!depart && arrive !== depart,
    arriveMissing,
    departMissing,
    // A missing city is its own message; calling it a "mismatch" as well
    // would put two contradictory repairs on the same row.
    arriveMismatch: arriveSet && !arriveMissing && arriveBaseId !== first,
    departMismatch: departSet && !departMissing && departBaseId !== last,
  };
}

export interface Ordering<T> {
  items: T[];
  /** the order was reversed to honour the gateways */
  reversed: boolean;
  /** every gateway that could apply is now satisfied */
  honoured: boolean;
}

/**
 * Order a chain so it starts where the trip lands and ends where it leaves,
 * if reversing achieves that. Returns the chain untouched when reversing
 * would not help, so a route with an unreachable pair of ends keeps its
 * curated order rather than being scrambled toward an impossible one.
 */
export function orderForGateways<T>(
  items: T[],
  idOf: (item: T) => BaseId,
  arrive: BaseId | null,
  departure: BaseId | null,
): Ordering<T> {
  if (items.length < 2) {
    return { items, reversed: false, honoured: true };
  }
  const ids = items.map(idOf);
  // Only an end the chain actually contains can be honoured or broken by
  // ordering; one it does not contain is a different problem entirely.
  const wantArrive = arrive && ids.includes(arrive) ? arrive : null;
  const wantDepart = departure && ids.includes(departure) ? departure : null;
  const applicable = (wantArrive ? 1 : 0) + (wantDepart ? 1 : 0);
  if (!applicable) return { items, reversed: false, honoured: true };

  const score = (list: BaseId[]) =>
    (wantArrive && list[0] === wantArrive ? 1 : 0) +
    (wantDepart && list[list.length - 1] === wantDepart ? 1 : 0);

  const forward = score(ids);
  const backward = score([...ids].reverse());

  // Ties keep the curated order: a route is written in the direction its
  // author meant it to be walked.
  if (backward > forward) {
    return { items: [...items].reverse(), reversed: true, honoured: backward === applicable };
  }
  return { items, reversed: false, honoured: forward === applicable };
}

export type GatewayErrand =
  /** one ticket, out and back through the same city */
  | { kind: "roundtrip"; baseId: BaseId }
  /** two tickets, because the trip does not come home the way it went out */
  | { kind: "flightIn"; baseId: BaseId }
  | { kind: "flightOut"; baseId: BaseId };

/**
 * The flights the shape implies.
 *
 * "Still to book" listed every hotel and every train and never once
 * mentioned getting to the country or home from it — the two most expensive
 * things on the trip. An open-jaw trip is two separate tickets and has to be
 * shown as two, or the checklist quietly understates the work.
 */
export function gatewayErrands(g: GatewayState): GatewayErrand[] {
  if (!g.arrive || !g.depart) return [];
  if (g.arrive === g.depart) return [{ kind: "roundtrip", baseId: g.arrive }];
  return [
    { kind: "flightIn", baseId: g.arrive },
    { kind: "flightOut", baseId: g.depart },
  ];
}
