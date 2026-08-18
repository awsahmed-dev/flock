import { redirect } from "next/navigation";
import Link from "next/link";
import { CaretLeft as ChevronLeft } from "@phosphor-icons/react/dist/ssr";
import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { trips, tripMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { getDictionary, getLocale, tFromDict } from "@/lib/i18n";
import { getToday } from "@/lib/today-server";
import { toIsoDay } from "@/lib/today";

/**
 * Video round 3: the dashboard shows three memories and "See all" — this is
 * "all": every finished trip, newest first, as a two-up grid of covers.
 */
export default async function MemoriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  const rows = await db
    .select({ trip: trips })
    .from(tripMembers)
    .innerJoin(trips, eq(tripMembers.tripId, trips.id))
    .where(eq(tripMembers.userId, user.id));
  const todayIso = await getToday();
  const past = rows
    .map((r) => r.trip)
    .filter((t) => toIsoDay(t.endDate) < todayIso)
    .sort((a, b) => toIsoDay(b.endDate).localeCompare(toIsoDay(a.endDate)));
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = (k: string, p?: Record<string, string | number>) => tFromDict(dict, k, p, locale);

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-30 flex items-center gap-2 px-2 h-14 border-b border-border" style={{ background: "var(--sheet-bg)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
        <Link href="/dashboard" className="flex items-center h-11 ps-1 pe-2 text-foreground active:opacity-70" aria-label={t("common.back")}>
          <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
          <span className="text-[13px] font-semibold">{t("common.back")}</span>
        </Link>
        <p className="flex-1 min-w-0 text-center font-bold text-[15px] truncate">{t("dashboard.memories")} · {past.length}</p>
        <span className="w-16" />
      </header>
      <div className="grid grid-cols-2 gap-3 p-4 pb-24 max-w-2xl mx-auto">
        {past.map((trip) => (
          <Link key={trip.id} href={`/trips/${trip.id}`} className="relative rounded-2xl overflow-hidden active:scale-[0.98] transition-transform" style={{ aspectRatio: "1 / 1" }}>
            {trip.heroImageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={trip.heroImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.80) 100%)" }} />
              </>
            ) : (
              <div className="absolute inset-0 bg-card border border-border rounded-2xl flex items-center justify-center">
                <span className="font-extrabold" style={{ fontSize: 40, color: "var(--clr-brand)", opacity: 0.45 }}>
                  {(trip.destination || trip.name || "?").charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 p-3">
              <p className={`text-[14px] font-bold leading-tight line-clamp-1 ${trip.heroImageUrl ? "text-white" : "text-foreground"}`}>{trip.name}</p>
              <p className={`text-[11px] mt-0.5 ${trip.heroImageUrl ? "text-white/70" : "text-muted-foreground"}`}>
                {format(parseDateOnly(trip.startDate), "d MMM yyyy")} – {format(parseDateOnly(trip.endDate), "d MMM yyyy")}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
