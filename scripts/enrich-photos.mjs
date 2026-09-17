/**
 * Give every curated place a photo.
 *
 * Three testers independently stopped at the same wall: a plan of 36 stops
 * for a country they had never seen, with zero photographs anywhere. One
 * put it plainly — "for a country I've never seen, that is the whole
 * problem in one sentence."
 *
 * The obvious source is Google Places, and the app already has the photo
 * proxy for it, but that needs a key nobody has configured. Wikidata does
 * not: P18 is the canonical image for a subject, curated by hand, already
 * on Wikimedia Commons under a free licence. It is excellent for the
 * landmarks (which are 89% of the corpus) and misses most small
 * restaurants — which is the honest split, and better than a wrong photo.
 *
 *   node scripts/enrich-photos.mjs --dry     # look, change nothing
 *   node scripts/enrich-photos.mjs           # write photos.ts
 *   node scripts/enrich-photos.mjs --only=lisbon
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const DRY = process.argv.includes("--dry");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
const UA = "paxawa-enrichment/1.0 (travel planning app; contact via repo)";
const OUT = "src/lib/packages/photos.ts";

/* ── the places we curate ──────────────────────────────────────────── */
const dir = "src/lib/packages";
const files = ["library.ts", ...readdirSync(join(dir, "regions")).map((f) => join("regions", f))];
// Every curated place, paired with the coordinate we already hand-checked.
// That coordinate is the disambiguator: rather than guessing a country
// from the file layout, we accept a Wikidata match only when ITS location
// agrees with ours. "Piazza", "Old Town" and "Mini Venice" exist in a
// dozen countries; a 30km radius settles it without ambiguity.
const coordSrc = readFileSync(join(dir, "coords.ts"), "utf8")
  + files.map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
const coords = new Map();
for (const m of coordSrc.matchAll(/"((?:[^"\\]|\\.)*)":\s*\[\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\]/g)) {
  if (!coords.has(m[1])) coords.set(m[1], [parseFloat(m[2]), parseFloat(m[3])]);
}

const places = new Map(); // name -> [lat, lng] | null
for (const f of files) {
  const src = readFileSync(join(dir, f), "utf8");
  for (const p of src.matchAll(/\{\s*name:\s*"((?:[^"\\]|\\.)*)"[^{}]*?category:\s*"/g)) {
    if (!places.has(p[1])) places.set(p[1], coords.get(p[1]) ?? null);
  }
}

const wanted = [...places];
console.log(`${places.size} curated places; enriching ${wanted.length}`);

/* ── existing results are kept, so this is resumable and cheap ─────── */
let have = {};
if (existsSync(OUT)) {
  const prev = readFileSync(OUT, "utf8");
  for (const m of prev.matchAll(/"((?:[^"\\]|\\.)*)":\s*"((?:[^"\\]|\\.)*)"/g)) have[m[1]] = m[2];
  console.log(`${Object.keys(have).length} already resolved — skipping those`);
}

const api = async (url) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (r.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
      if (!r.ok) return null;
      return await r.json();
    } catch { await sleep(500); }
  }
  return null;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const km = (a, b) => {
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

/** Wikidata's own image for the subject — accepted only if it is where we say it is. */
async function photoFor(name, here) {
  const q = encodeURIComponent(name);
  const found = await api(
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${q}&language=en&format=json&limit=5&origin=*`,
  );
  for (const hit of found?.search ?? []) {
    // One call for the whole entity. Asking wbgetclaims for two properties
    // at once silently returns nothing, encoded pipe or not.
    const ent = await api(`https://www.wikidata.org/wiki/Special:EntityData/${hit.id}.json`);
    const claims = ent?.entities?.[hit.id]?.claims;
    const file = claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (!file) continue;
    // The match must be where we already know the place to be. Without
    // this the corpus would fill with the right name in the wrong country.
    if (here) {
      const g = claims?.P625?.[0]?.mainsnak?.datavalue?.value;
      if (!g) continue;
      if (km(here, [g.latitude, g.longitude]) > 30) continue;
    }
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=800`;
  }
  return null;
}

let hit = 0, miss = 0, n = 0;
for (const [name, here] of wanted) {
  if (have[name]) continue;
  n++;
  const url = await photoFor(name, here);
  if (url) { have[name] = url; hit++; } else { miss++; }
  if (n % 25 === 0) console.log(`  …${n} looked up, ${hit} found`);
  await sleep(120); // be a good citizen
}
console.log(`\nresolved ${hit}, no image for ${miss}`);

if (DRY) { console.log("dry run — nothing written"); process.exit(0); }

const body = Object.keys(have).sort().map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(have[k])},`).join("\n");
writeFileSync(OUT, `/**
 * Photos for curated places, from Wikidata's P18 and served by Wikimedia
 * Commons. Generated by scripts/enrich-photos.mjs — do not hand-edit.
 *
 * Three testers stopped at the same wall: a plan for a country they had
 * never seen, with no photographs anywhere. Landmarks resolve well here;
 * small restaurants mostly do not, which is the honest split and better
 * than showing the wrong building.
 *
 * ${Object.keys(have).length} of ${places.size} curated places.
 */
export const PLACE_PHOTOS: Record<string, string> = {
${body}
};

export function photoFor(name: string): string | null {
  return PLACE_PHOTOS[name] ?? null;
}
`);
console.log(`wrote ${OUT}`);
