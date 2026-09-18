export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { listRoutes } from "@/lib/actions/shape";
import { findBaseByText } from "@/lib/packages/library";
import { RoutesScreen } from "@/components/shape/routes-screen";
import { isCountryOnly, curatedBasesInCountry } from "@/lib/packages/destination-base";
import { PageHeader } from "@/components/ui/page-header";

interface Props {
  params: Promise<{ id: string }>;
}

/** «المسارات» — the one screen between an empty trip and a complete plan. */
export default async function RoutesPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const destination = trip.destination ?? trip.name ?? "";
  const routes = await listRoutes(id).catch(() => []);
  // Even with no curated route we can start a one-base shape, as long as we
  // recognise the destination well enough to have content for it.
  const fallback = findBaseByText(destination) ?? (trip.destination ? null : findBaseByText(trip.name ?? ""));

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader title={trip.name} backHref={`/trips/${id}/itinerary`} />
      <RoutesScreen
        tripId={id}
        routes={routes}
        destination={destination}
        fallbackBaseId={fallback?.id ?? null}
        countryOnly={isCountryOnly(destination)}
        inCountry={curatedBasesInCountry(destination).map((b) => ({
          id: b.id,
          name: b.name,
          nameAr: b.nameAr,
        }))}
      />
    </div>
  );
}
