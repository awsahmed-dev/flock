// Slow-changing data; let Next persist across nav. Mutations call
// revalidatePath() to flush as needed.
export const revalidate = 30;

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

  // User testing: someone typed three friends' emails into a screen called
  // "Who is coming?", then opened Crew and read "1 person on this trip" with
  // no pending row and no error. The emails were in the database the whole
  // time — the wizard writes them as targeted invites (trips.ts) and nothing
  // ever read the field back. "A group travel app that silently loses the
  // group is just a notes app with a nice header."
  const joined = new Set(
    trip.members.map((m) => (m.user?.email ?? "").toLowerCase()).filter(Boolean),
  );
  const pending = trip.invites
    .filter((i) => i.invitedEmail && !joined.has(i.invitedEmail.toLowerCase()))
    .map((i) => ({ email: i.invitedEmail as string, token: i.token }));

  return (
    <div className="px-4 pt-4 max-w-3xl mx-auto">
        <MembersBoard
        tripId={id}
        tripName={trip.name}
        userId={user.id}
        isOwner={isOwner}
        members={trip.members}
        inviteUrl={inviteUrl}
        pending={pending}
      />
    </div>
  );
}
