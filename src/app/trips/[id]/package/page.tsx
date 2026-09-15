export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { getPackage } from "@/lib/actions/packages";
import { PackageView } from "@/components/packages/package-view";
import { PageHeader } from "@/components/ui/page-header";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * «الباقة» — planning's front room.
 *
 * Deliberately a full page, not a sheet stacked over the itinerary: the
 * audit found trip-wide planning was happening inside a day-level add sheet,
 * which is what made it feel both buried and crowded.
 */
export default async function PackagePage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const pkg = await getPackage(id).catch(() => null);
  // The verbs write to the whole crew's plan, so the screen must not offer
  // them to a member the server will refuse (which showed as a bare
  // "couldn't save" toast on every tap).
  const isOwner = trip.members?.some((m) => m.userId === user.id && m.role === "owner") ?? false;

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader title={trip.name} backHref={`/trips/${id}/itinerary`} />
      <PackageView
        tripId={id}
        initial={pkg}
        memberCount={trip.members?.length ?? 1}
        canManage={isOwner}
      />
    </div>
  );
}
