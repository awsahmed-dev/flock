export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { loadTripStays } from "@/lib/stays-server";
import { affiliateMode } from "@/lib/affiliate/partners";
import { StaysBoard } from "@/components/stays/stays-board";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string }>;
}

/**
 * Stays — one card per city you sleep in, with that city's own dates.
 * Reached from the NOW ticket and the Horizon's "stay" mark; not a tab.
 */
export default async function StaysPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { e } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const { stays, crew } = await loadTripStays(id, user.id);

  return (
    <div className="px-4 pt-4 max-w-2xl mx-auto">
      <StaysBoard
        tripId={id}
        stays={stays}
        crew={crew}
        mode={affiliateMode()}
        notice={e === "busy" || e === "notlive" ? e : null}
      />
    </div>
  );
}
