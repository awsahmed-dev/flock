/**
 * Retype curated restaurants that were written as "activity".
 *
 * The projection used to discard the curated category, so every meal in
 * every plan was filed as an activity and rendered with the same icon as a
 * temple. New plans get it right; this fixes the ones already in the
 * ground. Reads the names straight out of the curated source so the list
 * cannot drift from it.
 *
 *   node scripts/backfill-meal-types.mjs [--dry]
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const DRY = process.argv.includes("--dry");
const url = readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.*)$/m)?.[1]?.replace(/^"|"$/g, "");
if (!url) throw new Error("DATABASE_URL not found in .env.local");

const dir = "src/lib/packages";
const files = ["library.ts", ...readdirSync(join(dir, "regions")).map((f) => join("regions", f))];
const names = new Set();
for (const f of files) {
  const src = readFileSync(join(dir, f), "utf8");
  // one curated place is one { name: "…", … category: "food" … } object
  for (const m of src.matchAll(/\{\s*name:\s*"((?:[^"\\]|\\.)*)"[^{}]*?category:\s*"food"[^{}]*?\}/g)) {
    names.add(m[1]);
  }
}
console.log(`found ${names.size} curated food places`);

const sql = postgres(url);
const rows = await sql`
  select id from itinerary_items
  where provider in ('package', 'chosen') and type = 'activity'
    and title in ${sql([...names])}
`;
console.log(`${rows.length} stop(s) to retype`);
if (!DRY && rows.length) {
  await sql`update itinerary_items set type = 'meal' where id in ${sql(rows.map((r) => r.id))}`;
  console.log("done");
} else if (DRY) {
  console.log("dry run — nothing written");
}
await sql.end();
