import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { tripMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { recordEventsAndLearn, type IncomingEvent } from "@/lib/discovery/ingest-db";

/**
 * Batched discovery-event ingest. The client emits dwell/open/add/vote events
 * (debounced ~every 2s); this persists them to place_events and folds the
 * confirmed ones into the member's durable taste vector. Returns the updated
 * durable vector so the client can keep its session vector in sync.
 *
 * The fast session learning happens client-side for instant re-rank — this
 * route is the slow, durable side.
 */
const MAX_BATCH = 50;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { tripId?: string; events?: IncomingEvent[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tripId = body.tripId;
  const events = Array.isArray(body.events) ? body.events.slice(0, MAX_BATCH) : [];
  if (!tripId || events.length === 0) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  // Membership gate — only a trip member can write events for it.
  const member = await db.query.tripMembers.findFirst({
    where: and(eq(tripMembers.tripId, tripId), eq(tripMembers.userId, user.id)),
    columns: { id: true },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const durable = await recordEventsAndLearn(tripId, user.id, events);
    return NextResponse.json({ ok: true, durable });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Event ingest failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
