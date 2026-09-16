export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { getShape } from "@/lib/actions/shape";
import { ShapeScreen } from "@/components/shape/shape-screen";
import { PageHeader } from "@/components/ui/page-header";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * «شكل الرحلة» — the trip's structure.
 *
 * No shape yet means the crew hasn't chosen a route, so send them there
 * rather than rendering an empty editor: this screen edits a live plan, it
 * never creates one.
 */
export default async function ShapePage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const shape = await getShape(id).catch(() => null);
  if (!shape) redirect(`/trips/${id}/routes`);

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader title={trip.name} backHref={`/trips/${id}/itinerary`} />
      <ShapeScreen tripId={id} initial={shape} />
    </div>
  );
}
