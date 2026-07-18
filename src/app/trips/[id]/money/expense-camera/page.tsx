export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { getRates } from "@/lib/fx";
import { ExpenseCamera } from "@/components/money/expense-camera";

interface Props {
  params: Promise<{ id: string }>;
}

/** Phase 6 §8-B — Point-and-Split: camera → OCR → split → logged. */
export default async function ExpenseCameraPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const fxRates = await getRates(trip.currency).catch(() => null);

  return (
    <ExpenseCamera
      tripId={id}
      tripCurrency={trip.currency}
      destination={trip.destination}
      currentUserId={user.id}
      fxRates={fxRates}
      crew={trip.members.map((m) => ({
        userId: m.userId,
        displayName: m.user?.displayName || m.displayName,
        avatarUrl: m.user?.avatarUrl ?? null,
      }))}
    />
  );
}
