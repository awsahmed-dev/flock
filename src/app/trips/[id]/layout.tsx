// Trip name/destination/dates change rarely; layout doesn't need to re-fetch
// on every tab navigation. Removing `force-dynamic` lets Next persist the
// rendered layout across child route changes. Live data (chat unread badge,
// real-time votes) updates client-side via React Query + Supabase realtime —
// not via the layout.
//
// `revalidate = 60` puts a ceiling on staleness for edits; trip-settings
// mutations call revalidatePath to flush immediately when they change names.

export const revalidate = 60;

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { TripShell } from "@/components/trips/trip-shell";
import { isOwner as checkOwner } from "@/lib/permissions";

interface Props {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function TripLayout({ children, params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  // Only pass serializable primitives to the client component
  const tripForShell = {
    id: trip.id,
    name: trip.name,
    destination: trip.destination,
    startDate: trip.startDate,   // date column → already a string from Drizzle
    endDate: trip.endDate,
    shareToken: trip.shareToken ?? null,
    currency: trip.currency,
    budgetTotal: trip.budgetTotal != null ? Number(trip.budgetTotal) : null,
  };

  // Phase 7 §4: crew for the standard header's avatar stack + Crew sheet.
  const crew = trip.members.map((m) => ({
    userId: m.userId,
    displayName: m.user?.displayName || m.displayName,
    avatarUrl: m.user?.avatarUrl ?? null,
  }));

  return (
    <TripShell trip={tripForShell} userId={user.id} isOwner={checkOwner(trip, user.id)} crew={crew}>
      {children}
    </TripShell>
  );
}
