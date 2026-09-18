import { findBaseByText, findRoutes, foldArabic, BASES } from "@/lib/packages/library";
import type { Base } from "@/lib/packages/types";

/**
 * Which city a destination string means.
 *
 * Written for the backfill that gave every pre-existing trip a shape — 42
 * of them, created before any of this existed, whose owners opened the app
 * after the release and correctly saw nothing new. A trip with no
 * `trip_segments` row has no shape, no city screen and no gateways, so the
 * whole rebuild was invisible to everyone who already had a trip.
 *
 * Destinations in the wild are messy: "Tokyo, Japan", "ماليزيا", "Tbilisi
 * International Airport, تبلّيسي، جورجيا", "Kuching, Sarawak, Malaysia",
 * and — genuinely — "Potato". The order below is the part that matters.
 */
export interface DestinationMatch {
  /** a curated base, when we have one */
  base: Base | null;
  /** otherwise the city the user typed, kept verbatim */
  customName: string;
  /** how we got there, for reporting */
  how: "city" | "route" | "typed";
}

export function baseForDestination(destination: string): DestinationMatch {
  // The city the user typed comes FIRST, and only the first part counts.
  //
  // Matching the whole string put a Kuching trip in Kuala Lumpur — a
  // different island, 1,600km away — because "Malaysia" matched. The head
  // of the string is what the person actually chose; everything after the
  // comma is the region and country that came with the autocomplete.
  const head = (destination || "").split(",")[0].trim();
  if (!head) return { base: null, customName: "", how: "typed" };

  const city = findBaseByText(head);
  if (city) return { base: city, customName: head, how: "city" };

  // A country-level destination ("Japan") has no base of its own, but its
  // curated route knows where a trip there opens. Only the head is used
  // here too, so a city inside a curated country does not get swallowed
  // by that country's route.
  const route = findRoutes(head)[0];
  const first = route ? BASES[route.legs[0].baseId] : undefined;
  if (first) return { base: first, customName: head, how: "route" };

  // Somewhere we do not curate. It is still a city you can sleep in.
  return { base: null, customName: head, how: "typed" };
}

/** The `custom:` id a typed city gets, matching what editShape writes. */
export function customBaseId(name: string): string {
  return (
    "custom:" +
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9؀-ۿ]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40)
  );
}

/**
 * Every city a destination names, in the order it names them.
 *
 * "Kuala Lumpur, Langkawi, Penang" is three cities. "Kuala Lumpur,
 * Malaysia" is one city and its country. Both are a comma-separated list
 * and telling them apart is the whole problem — get it wrong in one
 * direction and a three-city trip collapses into one, get it wrong in the
 * other and a Kuching trip acquires an imaginary stay in Sarawak.
 *
 * The rule: a part only counts as a city if it is one we curate, or if at
 * least two parts already are. That is deliberately conservative — it
 * splits the lists we can be sure about and leaves anything ambiguous as a
 * single stay, which is exactly what it does today. A trip that should
 * have been split is one tap from being split by hand; a trip wrongly
 * split has invented a leg the traveller never planned.
 */
export function basesForDestination(destination: string): DestinationMatch[] {
  const parts = (destination || "")
    .split(/[,،]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) {
    const one = baseForDestination(destination);
    return one.customName ? [one] : [];
  }

  // A part that names a country is scenery, not a stay.
  //
  // Testing this with "does it resolve to a base?" does not work, because
  // several bases deliberately carry their own country as a match key so
  // that a bare "Malaysia" still lands somewhere. That made "Malaysia"
  // look like a city and split "Kuching, Sarawak, Malaysia" into three
  // stays. A part is only a city if it matches a base by the base's OWN
  // name — otherwise it matched through a country key, and it is a country.
  const ownName = (p: string) => {
    const b = findBaseByText(p);
    if (!b) return false;
    const f = foldArabic(p);
    return [b.id, b.name, b.nameAr].some((n) => {
      const nf = foldArabic(String(n));
      return nf.length > 0 && (f.includes(nf) || nf.includes(f));
    });
  };
  const isCountry = (p: string) => !ownName(p) && findRoutes(p).length > 0;
  const cities = parts.filter((p) => !isCountry(p));
  const curated = cities.map((p) => findBaseByText(p)).filter(Boolean) as Base[];

  // One recognised city among two or more parts is enough to tell us this
  // is a list of cities, and then its unfamiliar neighbours are cities
  // too: "Penang, Langkawi" splits because Langkawi is one we know.
  //
  // "Kuching, Sarawak, Malaysia" does not, because nothing in it is a city
  // we recognise — so Sarawak stays what it is, a region we must not turn
  // into a stay nobody planned.
  if (cities.length < 2 || curated.length < 1) {
    const one = baseForDestination(destination);
    return one.customName ? [one] : [];
  }

  const seen = new Set<string>();
  const out: DestinationMatch[] = [];
  for (const p of cities) {
    const base = findBaseByText(p);
    const key = base ? base.id : customBaseId(p);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ base, customName: p, how: base ? "city" : "typed" });
  }
  return out;
}

/**
 * Country names, in both languages, for the countries we curate.
 *
 * A trip to «السعودية» is a trip to a country, and we must not pretend a
 * country is a city — that is how Kuching ended up in Kuala Lumpur. But
 * the screen was then offering nothing at all: "add a base" only suggests
 * cities that pair with a curated one, and a country-shaped custom base
 * pairs with nothing. So a 31-night Saudi trip sat there with no city, no
 * suggestions, and a checklist offering "a hotel in Saudi Arabia".
 *
 * These let us say the true, useful thing instead: we do not know which
 * city you mean, but here are the ones we know in that country.
 */
const COUNTRY_TERMS: Record<string, string[]> = {
  JP: ["japan", "اليابان"],
  TR: ["turkey", "türkiye", "turkiye", "تركيا"],
  GE: ["georgia", "جورجيا"],
  PT: ["portugal", "البرتغال"],
  GB: ["uk", "united kingdom", "britain", "england", "بريطانيا", "المملكة المتحدة", "انجلترا", "إنجلترا"],
  FR: ["france", "فرنسا"],
  BA: ["bosnia", "البوسنة"],
  AZ: ["azerbaijan", "أذربيجان", "اذربيجان"],
  MY: ["malaysia", "ماليزيا"],
  TH: ["thailand", "تايلاند", "تايلند"],
  ID: ["indonesia", "bali", "إندونيسيا", "اندونيسيا"],
  MV: ["maldives", "المالديف"],
  AE: ["uae", "emirates", "الإمارات", "الامارات"],
  SA: ["saudi", "saudi arabia", "ksa", "السعودية", "المملكة العربية السعودية"],
  OM: ["oman", "عمان", "عُمان"],
  EG: ["egypt", "مصر"],
};

/** The ISO country a destination names, when it names one at all. */
export function countryOfDestination(destination: string): string | null {
  const d = foldArabic(destination);
  if (!d) return null;
  let best: { code: string; len: number } | null = null;
  for (const [code, terms] of Object.entries(COUNTRY_TERMS)) {
    for (const term of terms) {
      const t = foldArabic(term);
      if (!t || !d.includes(t)) continue;
      if (!best || t.length > best.len) best = { code, len: t.length };
    }
  }
  return best?.code ?? null;
}

/** Stayable curated bases in the country a destination names. */
export function curatedBasesInCountry(destination: string): Base[] {
  const code = countryOfDestination(destination);
  if (!code) return [];
  return Object.values(BASES).filter((b) => b.country === code && b.maxNights > 0);
}
