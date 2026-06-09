import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { trips } from "@/lib/db/schema";
import { isNull, eq } from "drizzle-orm";
import { getDestinationHero } from "@/lib/unsplash";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * B20: one-time backfill — fetch Unsplash hero images for every trip
 * that doesn't have one yet. Gated to authenticated users so it can't
 * be hit by random callers; we sequence the fetches with a small delay
 * to stay under Unsplash demo-tier rate limit (50/hour).
 *
 * Returns a small JSON summary for the caller to inspect. Idempotent:
 * already-filled trips are skipped.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db.query.trips.findMany({
    where: isNull(trips.heroImageUrl),
    columns: { id: true, destination: true, name: true },
  });

  const results: Array<{ id: string; destination: string; ok: boolean; reason?: string }> = [];

  for (const row of rows) {
    try {
      const hero = await getDestinationHero(row.destination);
      if (!hero) {
        results.push({ id: row.id, destination: row.destination, ok: false, reason: "no-photo" });
      } else {
        await db
          .update(trips)
          .set({
            heroImageUrl: hero.url,
            heroImageCreditName: hero.creditName,
            heroImageCreditLink: hero.creditLink,
          })
          .where(eq(trips.id, row.id));
        results.push({ id: row.id, destination: row.destination, ok: true });
      }
    } catch (err) {
      results.push({
        id: row.id,
        destination: row.destination,
        ok: false,
        reason: err instanceof Error ? err.message : "unknown",
      });
    }
    // Be polite to Unsplash demo tier — 1.2s between requests = ~50/min.
    await new Promise((r) => setTimeout(r, 1_200));
  }

  return NextResponse.json({
    total: rows.length,
    backfilled: results.filter((r) => r.ok).length,
    skipped: results.filter((r) => !r.ok).length,
    results,
  });
}
