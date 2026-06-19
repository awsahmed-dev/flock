import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { tripMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { loadDurableVector } from "@/lib/discovery/ingest-db";

/**
 * Returns the member's durable taste vector for a trip. The Discover feed
 * fetches this once on mount to SEED the in-browser session vector, so a
 * returning user's feed is personalized instantly (no warm-up needed).
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tripId = searchParams.get("tripId");
  if (!tripId) return NextResponse.json({ error: "Missing tripId" }, { status: 400 });

  const member = await db.query.tripMembers.findFirst({
    where: and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, user.id)),
    columns: { id: true },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const durable = await loadDurableVector(tripId, user.id);
  return NextResponse.json({ durable });
}
