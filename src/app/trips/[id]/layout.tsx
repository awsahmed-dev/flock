export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { TripShell } from "@/components/trips/trip-shell";

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
  };

  return (
    <TripShell trip={tripForShell} userId={user.id}>
      {children}
    </TripShell>
  );
}
