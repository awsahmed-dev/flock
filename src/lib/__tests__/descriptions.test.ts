import { describe, it, expect } from "vitest";
import { BASES } from "@/lib/packages/library";
import { PLACE_WHAT, whatIs } from "@/lib/packages/descriptions";

/**
 * The plain sentence that says what a place IS.
 *
 * Reading his own finished plan, the app's owner said: "I don't know what
 * are you talking about because I don't know the places... So I cannot like
 * trust you enough to say like, yeah, okay, go with it." Every `why` line in
 * the corpus is written for someone who already knows the place — it gives
 * the argument, never the identification.
 *
 * These tests hold the line that fixes that. They cannot check whether a
 * sentence is TRUE — nothing automated can — but they can hold it to the
 * shape that keeps it honest: flat, dateless, numberless, unevaluative, and
 * present on every single place.
 */

const all = Object.values(BASES);
const shapes = all.flatMap((b) => [...b.days, ...(b.dayTrip ? [b.dayTrip] : [])]);

const PLACES = (() => {
  const m = new Map<string, { why: string; nameAr: string }>();
  for (const d of shapes) for (const p of d.places) if (!m.has(p.name)) m.set(p.name, { why: p.why, nameAr: p.nameAr });
  return m;
})();

/**
 * Words that sell rather than identify. A line carrying one of these has
 * stopped telling you what the place is and started telling you how to feel
 * about it, which is the `why`'s job and only works once you know the what.
 */
const EVALUATIVE =
  /\b(famous|iconic|best|must-see|must see|hidden gem|beloved|stunning|breathtaking|legendary|renowned|charming|popular|world-class|paradise|beautiful|lovely|amazing|spectacular|unmissable|vibrant|bustling)\b/i;

/** Arabic dialect verbs that address the reader — the caption never does. */
const AR_SECOND_PERSON =
  /(تقدرون|تقدر\b|شوفوا|روحوا|اقعدوا|خذوا|كونوا|اطلبوا|انزلوا|اطلعوا|تاكلون|عندكم|عليكم|لكم\b|رحلتكم|زيارتكم)/;

describe("place descriptions", () => {
  it("covers every curated place", () => {
    const missing = [...PLACES.keys()].filter((n) => !PLACE_WHAT[n]);
    expect(missing, `no description for: ${missing.slice(0, 8).join(", ")}`).toHaveLength(0);
  });

  it("describes nothing that is not in the corpus", () => {
    // An orphan means a place was renamed or deleted and its sentence was
    // left behind, which is how a description drifts onto the wrong thing.
    const orphans = Object.keys(PLACE_WHAT).filter((n) => !PLACES.has(n));
    expect(orphans, `description with no place: ${orphans.slice(0, 8).join(", ")}`).toHaveLength(0);
  });

  it("states no number, date or price", () => {
    // Every invented fact this corpus has shipped was a number: a fabricated
    // two-hour train, a founding century nobody checked. The line that only
    // has to say "a Buddhist temple in Asakusa" never needs one.
    for (const [name, v] of Object.entries(PLACE_WHAT)) {
      expect(/\d/.test(v.what), `${name}: digit in "${v.what}"`).toBe(false);
      expect(/[\d٠-٩]/.test(v.whatAr), `${name}: digit in Arabic "${v.whatAr}"`).toBe(false);
    }
  });

  it("identifies rather than sells", () => {
    for (const [name, v] of Object.entries(PLACE_WHAT)) {
      const hit = v.what.match(EVALUATIVE);
      expect(hit, `${name}: evaluative "${hit?.[0]}" in "${v.what}"`).toBeNull();
    }
  });

  it("never addresses the reader", () => {
    // The caption is a label. The `why` directly below it is the voice that
    // speaks to you, and two second persons in a row read as nagging.
    for (const [name, v] of Object.entries(PLACE_WHAT)) {
      expect(/\b(you|your|yours)\b/i.test(v.what), `${name}: second person in "${v.what}"`).toBe(false);
      const ar = v.whatAr.match(AR_SECOND_PERSON);
      expect(ar, `${name}: Arabic second person "${ar?.[0]}" in "${v.whatAr}"`).toBeNull();
    }
  });

  it("is one plain sentence of a readable length", () => {
    for (const [name, v] of Object.entries(PLACE_WHAT)) {
      expect(v.what.length, `${name}: too short — "${v.what}"`).toBeGreaterThanOrEqual(30);
      expect(v.what.length, `${name}: too long — "${v.what}"`).toBeLessThanOrEqual(100);
      expect(v.what.endsWith("."), `${name}: no full stop — "${v.what}"`).toBe(true);
      // An em-dash or semicolon is a second clause wearing a disguise.
      expect(/[—;]/.test(v.what), `${name}: compound sentence — "${v.what}"`).toBe(false);
    }
  });

  it("says something the why does not", () => {
    // Exact equality was too weak a test. Two lines can be different strings
    // and still read as the same sentence stacked twice, which is what the
    // itinerary row actually showed: "A thatched teahouse on an old road in
    // Hakone." directly above "A thatched teahouse on the old Tokaido road,
    // run by the same family for four hundred years". The row is three lines
    // tall on a phone; it has to earn all three.
    const STOP = new Set(
      "a an the of in on at to and or is are was for with from by its it this that you your there here be been into over under up down out off as but so than then".split(" "),
    );
    const words = (s: string) =>
      s.toLowerCase().replace(/[^a-z\s-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));

    const loud: string[] = [];
    for (const [name, meta] of PLACES) {
      const v = PLACE_WHAT[name];
      if (!v) continue;
      const w = words(v.what);
      if (!w.length) continue;
      const inWhy = new Set(words(meta.why));
      const overlap = w.filter((x) => inWhy.has(x)).length / w.length;
      if (overlap >= 0.7) loud.push(`${name} ${(overlap * 100).toFixed(0)}% — "${v.what}"`);
    }
    expect(loud, `descriptions that just restate their own why:\n${loud.join("\n")}`).toHaveLength(0);
  });

  it("is written in Arabic too", () => {
    // An Arabic-first app that falls back to English for the one line whose
    // whole job is comprehension has not shipped the feature.
    for (const [name, v] of Object.entries(PLACE_WHAT)) {
      expect(/[؀-ۿ]/.test(v.whatAr), `${name}: no Arabic in "${v.whatAr}"`).toBe(true);
      const latin = v.whatAr.match(/[a-zA-Z]{4,}/);
      expect(latin, `${name}: untranslated "${latin?.[0]}" in "${v.whatAr}"`).toBeNull();
    }
  });

  it("looks a place up by name", () => {
    const [someName] = PLACES.keys();
    expect(whatIs(someName)?.what).toBeTruthy();
    expect(whatIs("a place that does not exist")).toBeNull();
  });
});
