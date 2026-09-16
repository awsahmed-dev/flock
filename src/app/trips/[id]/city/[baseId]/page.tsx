export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { getCityBoard } from "@/lib/actions/city";
import { CityBoard } from "@/components/city/city-board";
import { PageHeader } from "@/components/ui/page-header";

interface Props {
  params: Promise<{ id: string; baseId: string }>;
}

/**
 * «وش نسوي في {المدينة}؟» — the city layer of the plan.
 *
 * Reachable only for a base the trip actually visits, because the whole
 * point is that this screen knows which days it is allowed to touch.
 */
export default async function CityPage({ params }: Props) {
  const { id, baseId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const board = await getCityBoard(id, baseId).catch(() => null);
  if (!board) redirect(`/trips/${id}/shape`);

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader title={trip.name} backHref={`/trips/${id}/shape`} />
      <CityBoard tripId={id} board={board} />
    </div>
  );
}
