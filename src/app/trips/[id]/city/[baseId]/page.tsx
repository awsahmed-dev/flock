export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { getCityBoard } from "@/lib/actions/city";
import { stayFromParam } from "@/lib/packages/stay-key";
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
/**
 * A base id is not URL-safe and must be decoded before it is compared.
 *
 * Every curated id — «tokyo», «kuala_lumpur» — survives a round trip
 * through a URL unchanged, so this screen looked fine for years. A typed
 * city does not: its id is «custom:penang», the colon is escaped
 * somewhere between the link and the route, and the page then looked for
 * a stay called «custom%3Apenang», found none, and bounced to the shape
 * screen. Silently — a tap that just put you back where you started.
 *
 * So no city you typed yourself has ever had a city page, which is why
 * «املأ الباقي» could not be reached on a trip to Jeddah at all.
 */
function decodeBaseId(raw: string): string {
  try {
    // Decoding an already-decoded id is a no-op; decoding a malformed one
    // throws, and then the raw value is still the best guess we have.
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default async function CityPage({ params }: Props) {
  const { id, baseId: rawBaseId } = await params;
  // The URL names a STAY — «jeddah» or «jeddah~2» — not just a city.
  const stayKey = stayFromParam(decodeBaseId(rawBaseId));
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const board = await getCityBoard(id, stayKey).catch(() => null);
  if (!board) redirect(`/trips/${id}/shape`);

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader title={trip.name} backHref={`/trips/${id}/shape`} />
      <CityBoard tripId={id} board={board} />
    </div>
  );
}
