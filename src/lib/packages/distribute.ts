import type { CanonDay, CanonPackage } from "@/lib/packages/canonical";

/**
 * Fitting a curated route of N days onto a trip of D days.
 *
 * Extracted from the package builder because both previous versions shipped
 * broken and neither was catchable without a test: clamping repeated the
 * same "last morning" nine times, and the fix after it dropped Kyoto from a
 * 3-day Japan trip and left 23 consecutive blank days on a 30-day one.
 *
 * The rule: allocate by CITY, proportional to how much curated content the
 * city has, with every city guaranteed a day while days remain. A city with
 * more days than content gets its free days in place — spread through the
 * trip, labelled with the city you are actually in, and ready to receive the
 * crew's saves.
 */
export interface Slot {
  /** the curated day for this slot, or null for a free day */
  shape: CanonDay | null;
  city: string;
  cityAr: string;
}

export function distributeDays(canon: CanonPackage, dayCount: number): Slot[] {
  if (dayCount <= 0) return [];

  const byCity: { city: string; cityAr: string; shapes: CanonDay[] }[] = [];
  for (const d of canon.days) {
    const last = byCity[byCity.length - 1];
    if (last && last.city === d.city) last.shapes.push(d);
    else byCity.push({ city: d.city, cityAr: d.cityAr, shapes: [d] });
  }
  if (!byCity.length) return [];

  // Largest-remainder allocation, so the shares always sum to exactly D.
  const total = canon.days.length;
  const ideal = byCity.map((c) => (dayCount * c.shapes.length) / total);
  const quota = ideal.map((a) => Math.max(1, Math.floor(a)));

  let sum = quota.reduce((a, b) => a + b, 0);
  while (sum > dayCount) {
    // Trim the fattest city first; when every city is down to one day the
    // trip is shorter than the route, so trailing cities are dropped — a
    // 2-day trip cannot visit three, and pretending otherwise is the lie.
    let fat = -1;
    let fatVal = 1;
    quota.forEach((q, i) => {
      if (q > fatVal) { fatVal = q; fat = i; }
    });
    if (fat >= 0) quota[fat] -= 1;
    else {
      quota.pop();
      byCity.pop();
      ideal.pop();
    }
    sum = quota.reduce((a, b) => a + b, 0);
  }
  while (sum < dayCount) {
    let best = 0;
    let bestRem = -Infinity;
    quota.forEach((q, i) => {
      const rem = ideal[i] - q;
      if (rem > bestRem) { bestRem = rem; best = i; }
    });
    quota[best] += 1;
    sum += 1;
  }

  const slots: Slot[] = [];
  byCity.forEach((c, ci) => {
    const n = quota[ci];
    for (let j = 0; j < n; j++) {
      // Fewer days than curated content → sample evenly, so the arrival day
      // and the signature day both survive. More days → the extras are free
      // days in that same city.
      const shape =
        n >= c.shapes.length
          ? (c.shapes[j] ?? null)
          : (c.shapes[Math.floor((j * c.shapes.length) / n)] ?? null);
      slots.push({ shape, city: c.city, cityAr: c.cityAr });
    }
  });

  // Only reachable if a city block ran short; stays honest rather than short.
  const tail = byCity[byCity.length - 1];
  while (slots.length < dayCount) {
    slots.push({ shape: null, city: tail.city, cityAr: tail.cityAr });
  }
  return slots.slice(0, dayCount);
}
