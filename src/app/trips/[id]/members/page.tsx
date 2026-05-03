export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { MembersBoard } from "@/components/members/members-board";
import { getBaseUrl } from "@/lib/base-url";

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
    ? `${getBaseUrl()}/invite/${trip.invites[0].token}`
    : null;

  return (
    <MembersBoard
      tripId={id}
      userId={user.id}
      isOwner={isOwner}
      members={trip.members}
      inviteUrl={inviteUrl}
    />
  );
}
