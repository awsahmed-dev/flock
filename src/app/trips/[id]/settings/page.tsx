// Slow-changing data; let Next persist across nav. Mutations call
// revalidatePath() to flush as needed.
export const revalidate = 30;

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { TripSettingsForm } from "@/components/trips/trip-settings-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SettingsPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const isOwner = trip.members.some(
    (m) => m.userId === user.id && m.role === "owner"
  );
  if (!isOwner) redirect(`/trips/${id}`);

  return (
    <div className="px-4 pt-4 max-w-5xl mx-auto">
        <TripSettingsForm
        tripId={id}
        name={trip.name}
        destination={trip.destination}
        startDate={trip.startDate}
        endDate={trip.endDate}
        budgetTotal={trip.budgetTotal ?? null}
        currency={trip.currency}
        shareToken={trip.shareToken ?? null}
      />
    </div>
  );
}
