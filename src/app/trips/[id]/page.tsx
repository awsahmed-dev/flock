export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { TripOverview } from "@/components/trips/trip-overview";
import { getBaseUrl } from "@/lib/base-url";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TripPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const invite = trip.invites[0];
  const inviteUrl = invite ? `${getBaseUrl()}/invite/${invite.token}` : null;

  return <TripOverview trip={trip} inviteUrl={inviteUrl} userId={user.id} />;
}
