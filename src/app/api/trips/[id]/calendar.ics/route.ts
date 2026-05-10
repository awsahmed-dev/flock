import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { itineraryItems } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { buildIcs } from "@/lib/ics";

export const dynamic = "force-dynamic";

/**
 * Returns a downloadable .ics file with every itinerary item as a VEVENT.
 *
 * - Auth: must be a trip member (proxy + getTripWithMembership). The url
 *   isn't shareable as-is; we may later add a token-gated public feed for
 *   "subscribe" workflows, but one-shot download is enough for v1.
 * - Time handling: items with a `startTime` become floating-local-time
 *   events (so "breakfast 9am" stays 9am no matter the user's TZ); items
 *   without a time become all-day events on `dayDate`.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const items = await db
    .select()
    .from(itineraryItems)
    .where(eq(itineraryItems.tripId, id))
    .orderBy(asc(itineraryItems.dayDate), asc(itineraryItems.startTime));

  const ics = buildIcs(
    {
      name: `${trip.name} — Flock`,
      description: `Trip to ${trip.destination}. Exported from Flock.`,
    },
    items.map((it) => {
      const parts: string[] = [];
      if (it.locationName) parts.push(`📍 ${it.locationName}`);
      if (it.notes) parts.push(it.notes);
      if (it.costEstimate) parts.push(`Estimate: ${it.costEstimate}`);
      if (it.status && it.status !== "confirmed") {
        parts.push(`Status: ${it.status}`);
      }
      const description = parts.join("\n");

      return {
        uid: it.id,
        dayDate: it.dayDate,
        startTime: it.startTime,
        endTime: null,
        summary: it.title,
        location: it.locationName,
        description,
        url: it.bookingUrl,
        updatedAt: it.updatedAt instanceof Date ? it.updatedAt : null,
      };
    }),
  );

  const safeName = trip.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60);
  return new NextResponse(ics, {
    status: 200,
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${safeName || "trip"}.ics"`,
      "cache-control": "private, no-cache",
    },
  });
}
