import type { Base, BaseId, CuratedDay, CuratedPlace, ProjectedDay, Segment, TransportMode } from "@/lib/packages/types";
import { addDays } from "@/lib/packages/allocate";
import type { AllocatedLeg } from "@/lib/packages/allocate";
import { gatewayErrands } from "@/lib/packages/gateways";
import type { GatewayState } from "@/lib/packages/gateways";

/**
 * The day grid is a PROJECTION of the trip's shape, not a stored blob.
 *
 * This is the change that makes «شكل الرحلة» a handle rather than a one-way
 * door: edit the shape, re-run this, and the days follow. The old model
 * froze a payload at generation time, so any structural edit afterwards was
 * a data-corruption question with no answer.
 *
 * What it must respect, or the plan lies:
 *  · the first day at every base starts on a train or a plane — including
 *    the trip's own first day, when you flew in — so it holds an afternoon,
 *    not a full day
 *  · a long transfer (3h+) leaves even less
 *  · the last day is a departure — a morning, and then the airport
 *  · a day trip spends the day somewhere else entirely
 */

/** Turn an allocation into dated segments. */
export function segmentsFromLegs(legs: AllocatedLeg[], tripStart: string): Segment[] {
  let cursor = tripStart;
  return legs.map((l, i) => {
    const checkIn = cursor;
    const checkOut = addDays(cursor, l.nights);
    cursor = checkOut;
    return {
      baseId: l.baseId,
      order: i,
      checkIn,
      checkOut,
      transportInMode: l.transportInMode,
      transportInMinutes: l.transportInMinutes,
      dayTrips: [],
      lockedBy: null,
    };
  });
}

/** Nights a segment covers. */
export function segmentNights(s: Segment): number {
  const a = Date.UTC(+s.checkIn.slice(0, 4), +s.checkIn.slice(5, 7) - 1, +s.checkIn.slice(8, 10));
  const b = Date.UTC(+s.checkOut.slice(0, 4), +s.checkOut.slice(5, 7) - 1, +s.checkOut.slice(8, 10));
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/**
 * Re-date a list of segments so they run back-to-back from `tripStart`.
 * Called after every reorder or nights change — the shape is authored in
 * nights and stored as dates, and this is the one place that conversion
 * happens.
 */
export function redate(segments: Segment[], tripStart: string): Segment[] {
  let cursor = tripStart;
  return segments
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((s, i) => {
      const n = segmentNights(s);
      const checkIn = cursor;
      const checkOut = addDays(cursor, n);
      cursor = checkOut;
      return {
        ...s,
        order: i,
        checkIn,
        checkOut,
        // You do not travel to your first base from anywhere in this trip.
        // Removing or reordering the opening base used to leave its
        // successor advertising a train it never took.
        transportInMode: i === 0 ? null : s.transportInMode,
        transportInMinutes: i === 0 ? null : s.transportInMinutes,
      };
    });
}

/**
 * Re-link the legs after a reorder.
 *
 * Curated transport is authored for the route's own order, so dragging
 * Kyoto above Tokyo left Tokyo with no inbound leg at all — it silently
 * vanished from the errand list, and the projection stopped thinning its
 * arrival day. Any base that is no longer first gets an estimate from the
 * real distance between the two, which the user can change.
 */
export function relink(segments: Segment[], bases: Record<BaseId, Base>): Segment[] {
  return segments.map((s, i) => {
    if (i === 0) return { ...s, transportInMode: null, transportInMinutes: null };
    const from = bases[segments[i - 1].baseId];
    const to = bases[s.baseId];

    // A leg we cannot measure has no duration — and that outranks whatever
    // is already stored.
    //
    // This check has to come BEFORE the stored-value shortcut below, not
    // after. Nothing in the app lets a person type a duration, so a stored
    // number between two cities we cannot place was generated, and the only
    // generator that could have produced it is one of the hardcoded
    // fallbacks since removed. Leaving it in place kept printing "2h" for
    // Tashkent to Samarkand long after the code that invented it was gone.
    if (!from || !to || from.coordsUnknown || to.coordsUnknown) {
      return { ...s, transportInMode: s.transportInMode ?? ("train" as const), transportInMinutes: null };
    }

    if (s.transportInMode && s.transportInMinutes != null) return s;
    return { ...s, ...estimateLeg(from, to) };
  });
}

/** A defensible guess, not a fabrication: great-circle distance and a mode. */
export function estimateLeg(from: Base, to: Base): { transportInMode: TransportMode; transportInMinutes: number } {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(to.lat - from.lat);
  const dLng = rad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.sin(dLng / 2) ** 2;
  const km = 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  // Past ~700km overland, people fly; below it, rail beats the airport twice.
  if (km > 700) return { transportInMode: "flight", transportInMinutes: Math.round(120 + (km / 750) * 60) };
  return { transportInMode: "train", transportInMinutes: Math.max(20, Math.round((km / 90) * 60)) };
}

const MODE_EN: Record<string, string> = {
  train: "Train", flight: "Flight", car: "Drive", bus: "Bus", ferry: "Ferry",
};
const MODE_AR: Record<string, string> = {
  train: "قطار", flight: "طيران", car: "سيارة", bus: "باص", ferry: "عبّارة",
};

/** "About 2h 15m, then check in and drop the bags." */
function durationLine(mins: number | null, loc: "en" | "ar"): string {
  if (!mins) {
    return loc === "ar" ? "يوم انتقال — خذوا راحتكم." : "A moving day — take it easy.";
  }
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const dur =
    loc === "ar"
      ? h
        ? `${h} ساعة${m ? ` و${m} دقيقة` : ""}`
        : `${m} دقيقة`
      : h
        ? `${h}h${m ? ` ${m}m` : ""}`
        : `${m}m`;
  return loc === "ar"
    ? `حوالي ${dur} — بعدها سجّلوا دخولكم وحطّوا الشنط.`
    : `About ${dur} — then check in and drop the bags.`;
}

const hour = (t?: string) => (t ? parseInt(t.slice(0, 2), 10) : 12);

/** Afternoon-and-later, for a day that begins on a train. */
function afternoonOf(places: CuratedPlace[], keep: number): CuratedPlace[] {
  const late = places.filter((p) => hour(p.startTime) >= 14);
  if (late.length) return late.slice(0, keep);
  return places.slice(-keep);
}

/** Morning only, for the day you fly home. */
function morningOf(places: CuratedPlace[]): CuratedPlace[] {
  const early = places.filter((p) => hour(p.startTime) < 12);
  return (early.length ? early : places).slice(0, 1);
}

/** A crew save, as the projection needs to see it. */
export interface SaveForPlan {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  category?: string | null;
  rating?: number | null;
}

export function projectDays(
  segments: Segment[],
  bases: Record<BaseId, Base>,
  tripStart: string,
  saves?: SaveForPlan[],
): ProjectedDay[] {
  const ordered = redate(segments, tripStart);
  const out: ProjectedDay[] = [];
  let index = 0;

  ordered.forEach((seg, si) => {
    const base = bases[seg.baseId];
    if (!base) return;
    const nights = segmentNights(seg);
    // Each curated shape is used at most once per stay. Because a base's
    // maxNights never exceeds its shape count, this cannot run dry.
    const pool = base.days.slice();
    const trips = seg.dayTrips.filter((t) => bases[t]);
    let tripCursor = 0;

    for (let d = 0; d < nights; d++) {
      const date = addDays(seg.checkIn, d);
      // Day one of the whole trip is an arrival as much as any transfer is —
      // you landed that morning. Curated opening days are already written
      // that way (Tokyo's starts at 17:00), so this costs nothing when the
      // route opens where its author intended and saves the plan from
      // proposing a 10:00 start when it doesn't.
      const isTravel = d === 0;
      const arrivedFromAnotherBase = d === 0 && si > 0;
      const longHaul = arrivedFromAnotherBase && (seg.transportInMinutes ?? 0) >= 180;

      // Day trips never land on the arrival day — you have just got off a
      // train, you are not getting on another one.
      const takeTrip = d > 0 && tripCursor < trips.length;
      if (takeTrip) {
        const to = trips[tripCursor++];
        const shape = bases[to].dayTrip;
        out.push({
          date,
          index: index++,
          baseId: seg.baseId,
          title: shape?.title ?? `Day trip to ${bases[to].name}`,
          titleAr: shape?.titleAr ?? `رحلة يوم إلى ${bases[to].nameAr}`,
          travel: false,
          dayTripTo: to,
          departure: false,
          places: shape?.places ?? [],
        });
        continue;
      }

      // Pick a shape this weekday can actually honour. Shapes are otherwise
      // taken in order; this only reorders when a day-constrained place
      // would land on a day it is shut.
      const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
      const fits = (sh: CuratedDay) =>
        sh.places.every((pl) => !pl.openDays || pl.openDays.includes(weekday));
      let shapeIdx = pool.findIndex(fits);
      if (shapeIdx === -1) shapeIdx = 0;
      const shape = pool.splice(shapeIdx, 1)[0];
      // If it still carries something shut today, leave that one out rather
      // than sending someone to a closed door.
      const openHere = (ps: CuratedPlace[]) =>
        ps.filter((pl) => !pl.openDays || pl.openDays.includes(weekday));
      // The move itself is a stop. The shape knew "train, 2h 15m" and the
      // day it happened on said nothing at all — no checkout, no train, no
      // "today you go to Kyoto" — on a multi-city trip that is the single
      // most important thing on the day.
      const leg: CuratedPlace[] = arrivedFromAnotherBase
        ? [
            {
              name: `${MODE_EN[seg.transportInMode ?? "train"]} to ${base.name}`,
              nameAr: `${MODE_AR[seg.transportInMode ?? "train"]} إلى ${base.nameAr}`,
              why: durationLine(seg.transportInMinutes, "en"),
              whyAr: durationLine(seg.transportInMinutes, "ar"),
              category: "rest",
              startTime: "09:00",
              leg: true,
            },
          ]
        : [];
      out.push({
        date,
        index: index++,
        baseId: seg.baseId,
        // Only a transfer renames the day; the trip's own first day keeps
        // its curated title, which is already an arrival story.
        title: arrivedFromAnotherBase
          ? `Arrive in ${base.name}`
          : shape?.title ?? `Open day in ${base.name}`,
        titleAr: arrivedFromAnotherBase
          ? `الوصول إلى ${base.nameAr}`
          : shape?.titleAr ?? `يوم حر في ${base.nameAr}`,
        travel: isTravel,
        dayTripTo: null,
        departure: false,
        places: !shape
          ? leg
          : isTravel
            ? [...leg, ...afternoonOf(openHere(shape.places), longHaul ? 1 : 2)]
            : openHere(shape.places),
      });
    }
  });

  // The departure day: it is a day of the trip but not a night anywhere, and
  // it belongs to the last base.
  const last = ordered[ordered.length - 1];
  if (last && bases[last.baseId]) {
    const base = bases[last.baseId];
    // The next UNUSED shape, never one the stay already served. Clamping to
    // the last index meant a stay that used every shape got its final day
    // repeated verbatim as the departure — Byōdō-in twice, Osaka Castle Park
    // twice, and the last day was always a copy of the one before it.
    const usedHere = new Set(
      out.filter((d) => d.baseId === last.baseId && !d.dayTripTo).map((d) => d.title),
    );
    const shape = base.days.find((d) => !usedHere.has(d.title));
    out.push({
      date: last.checkOut,
      index: index++,
      baseId: last.baseId,
      title: "Last morning",
      titleAr: "آخر صباح",
      travel: false,
      dayTripTo: null,
      departure: true,
      places: shape ? morningOf(shape.places) : [],
    });
  }

  if (saves?.length) placeSaves(out, ordered, bases, saves);

  return out;
}

/** Loose match, so "Toyosu Market" and "Toyosu Fish Market" are one place. */
function samePlace(a: string, b: string) {
  const norm = (x: string) =>
    x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\u0600-\u06ff ]/g, "").trim();
  const A = norm(a);
  const B = norm(b);
  if (!A || !B) return false;
  if (A === B) return true;
  return A.length >= 5 && B.length >= 5 && (A.includes(B) || B.includes(A));
}

/**
 * Slot the crew's own saves into the plan.
 *
 * User testing: a curated route placed 33 of its own stops and ZERO of the
 * twelve the user had saved, then duplicated two of them under slightly
 * different names. And the tray's «add» put a Kyoto restaurant on a Tokyo
 * day, 450km and six days out, because nothing consulted the base.
 *
 * So: a save goes to the base it is actually near, on that base's emptiest
 * non-travel day, and never twice.
 */
function placeSaves(
  days: ProjectedDay[],
  segments: Segment[],
  bases: Record<BaseId, Base>,
  saves: SaveForPlan[],
): void {
  const already = (name: string) => days.some((d) => d.places.some((p) => samePlace(p.name, name)));

  for (const save of saves) {
    if (already(save.name)) continue;

    // Which base is this near? No coords, or nothing close, means we cannot
    // honestly say — leave it in the tray rather than guess a city.
    let target: BaseId | null = null;
    if (save.lat != null && save.lng != null) {
      let best = Infinity;
      for (const seg of segments) {
        const b = bases[seg.baseId];
        if (!b) continue;
        const dx = b.lat - save.lat;
        const dy = b.lng - save.lng;
        const d2 = dx * dx + dy * dy;
        if (d2 < best) {
          best = d2;
          target = seg.baseId;
        }
      }
      // ~0.9° ≈ a metro area and its day-trip radius. Beyond that the place
      // belongs to a city this trip does not visit.
      if (best > 0.8) target = null;
    }
    if (!target) continue;

    const candidates = days.filter(
      (d) => d.baseId === target && !d.travel && !d.departure && !d.dayTripTo,
    );
    if (!candidates.length) continue;
    const day = candidates.reduce((a, b) => (b.places.length < a.places.length ? b : a));
    day.places.push({
      name: save.name,
      nameAr: save.name,
      why: "From your saves",
      whyAr: "من محفوظاتكم",
      category: (save.category as CuratedPlace["category"]) ?? "sight",
      // A save's rating came from Google. Ours never did.
      savedRating: save.rating ?? undefined,
    });
  }
}

/**
 * What the shape says you still have to book. The user's next real-world
 * action after planning is booking, and the plan had no consequence at all
 * until this existed.
 */
export interface Errand {
  kind: "stay" | "transport" | "roundtrip" | "flightIn" | "flightOut";
  baseId: BaseId;
  nights?: number;
  mode?: string;
  done: boolean;
}

export function errandsFor(segments: Segment[], gateways?: GatewayState): Errand[] {
  const out: Errand[] = [];
  if (!segments.length) return out;

  // The flights come first because they are booked first and cost the most.
  // The list used to open with a hotel and never mention getting to the
  // country at all, which understated the trip by its two largest tickets.
  if (gateways) {
    for (const g of gatewayErrands(gateways)) {
      out.push({ kind: g.kind, baseId: g.baseId, done: false });
    }
  }

  redate(segments, segments[0].checkIn).forEach((s, i) => {
    if (i > 0 && s.transportInMode) {
      out.push({
        kind: "transport",
        baseId: s.baseId,
        mode: s.transportInMode,
        done: s.lockedBy === "flight",
      });
    }
    out.push({
      kind: "stay",
      baseId: s.baseId,
      nights: segmentNights(s),
      done: s.lockedBy === "hotel",
    });
  });
  return out;
}
