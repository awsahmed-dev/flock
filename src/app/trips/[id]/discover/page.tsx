export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { eachDayOfInterval, format } from "date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getTripWithMembership } from "@/lib/actions/trips";
import { geocode } from "@/lib/geocode";
import { DiscoverFeed } from "@/components/discover/discover-feed";
import { getDictionary, getLocale, tFromDict } from "@/lib/i18n";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * v2 Discover — standalone preview surface. Real Google places, ranked + tagged
 * by the engine, learning live as you scroll. Shipped additively (separate
 * route) so the existing Plan page testers use stays untouched until Discover
 * is proven and wired into the Plan IA.
 */
export default async function DiscoverPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const trip = await getTripWithMembership(id, user.id);
  if (!trip) redirect("/dashboard");

  const geo = await geocode(trip.destination).catch(() => null);
  const center: [number, number] | null = geo ? [geo.lng, geo.lat] : null;

  const days = eachDayOfInterval({
    start: parseDateOnly(trip.startDate),
    end: parseDateOnly(trip.endDate),
  }).map((d) => format(d, "yyyy-MM-dd"));

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = (k: string, p?: Record<string, string | number>) => tFromDict(dict, k, p, locale);

  return (
    <div className="max-w-[680px] mx-auto space-y-5">
      <div>
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-primary mb-2">
          {t("discover.eyebrow")}
        </p>
        <h1 className="text-3xl sm:text-[2.4rem] font-extrabold tracking-[-0.02em] leading-[1.05]">
          {t("discover.title", { destination: trip.destination })}
        </h1>
        <p className="text-[15px] text-muted-foreground mt-2 leading-relaxed">{t("discover.subtitle")}</p>
      </div>

      <DiscoverFeed tripId={trip.id} destination={trip.destination} center={center} days={days} />
    </div>
  );
}
