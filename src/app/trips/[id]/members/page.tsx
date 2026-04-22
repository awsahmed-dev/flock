export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { TripShell } from "@/components/trips/trip-shell";
import { MembersBoard } from "@/components/members/members-board";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MembersPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const isOwner = trip.members.some(
    (m) => m.userId === user.id && m.role === "owner"
  );

  const inviteUrl = trip.invites[0]
    ? `${process.env.NEXT_PUBLIC_APP_URL}/invite/${trip.invites[0].token}`
    : null;

  return (
    <TripShell trip={trip} userId={user.id}>
      <MembersBoard
        tripId={id}
        userId={user.id}
        isOwner={isOwner}
        members={trip.members}
        inviteUrl={inviteUrl}
      />
    </TripShell>
  );
}
