export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { chatMessages } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { TripShell } from "@/components/trips/trip-shell";
import { ChatPanel } from "@/components/chat/chat-panel";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const isOwner = trip.members.some(
    (m) => m.userId === user.id && m.role === "owner"
  );

  const messages = await db.query.chatMessages.findMany({
    where: eq(chatMessages.tripId, id),
    with: {
      author: true,
      reactions: true,
      replyTo: { with: { author: true } },
    },
    orderBy: [asc(chatMessages.createdAt)],
  });

  return (
    <TripShell trip={trip} userId={user.id}>
      <ChatPanel
        tripId={id}
        userId={user.id}
        isOwner={isOwner}
        messages={messages as any}
      />
    </TripShell>
  );
}
