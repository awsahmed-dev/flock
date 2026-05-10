import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { tripMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Bumps the current user's `last_read_chat_at` for this trip. Called from the
 * chat sidebar whenever the messages container is scrolled to (or near) the
 * bottom. Drives the ✓✓ read-receipt indicator on outgoing messages.
 *
 * Idempotent — clients can call it freely; we just write `now()` to the row.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db
    .update(tripMembers)
    .set({ lastReadChatAt: new Date() })
    .where(and(eq(tripMembers.tripId, id), eq(tripMembers.userId, user.id)));

  return NextResponse.json({ ok: true, readAt: new Date().toISOString() });
}
