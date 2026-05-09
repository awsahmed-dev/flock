import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { chatMessages } from "@/lib/db/schema";
import { eq, asc, isNull, and } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = trip.members.some(
    (m) => m.userId === user.id && m.role === "owner"
  );

  const messages = await db.query.chatMessages.findMany({
    where: and(eq(chatMessages.tripId, id), isNull(chatMessages.deletedAt)),
    with: {
      author: true,
      reactions: true,
      replyTo: { with: { author: true } },
    },
    orderBy: [asc(chatMessages.createdAt)],
  });

  const displayName =
    (user as any).user_metadata?.display_name ||
    (user as any).email?.split("@")[0] ||
    "Traveler";

  return NextResponse.json({ messages, userId: user.id, isOwner, displayName });
}
