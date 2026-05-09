export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { db } from "@/lib/db";
import { votes, voteOptions, voteResponses } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { VotesBoard } from "@/components/votes/votes-board";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function VotesPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const isOwner = trip.members.some(
    (m) => m.userId === user.id && m.role === "owner"
  );

  const rawVotes = await db.query.votes.findMany({
    where: eq(votes.tripId, id),
    with: {
      options: { orderBy: asc(voteOptions.sortOrder) },
      responses: true,
    },
    orderBy: [asc(votes.createdAt)],
  });

  return (
    <VotesBoard
      tripId={id}
      userId={user.id}
      isOwner={isOwner}
      currency={trip.currency}
      votes={rawVotes as any}
    />
  );
}
