export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Compass } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { trips, tripMembers, profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { differenceInCalendarDays, isFuture, isPast } from "date-fns";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { getDictionary, getLocale, tFromDict } from "@/lib/i18n";
import { Logo } from "@/components/ui/logo";
import { DashboardAccountMenu } from "@/components/dashboard/dashboard-account-menu";
import {
  DashboardTripCard,
  type TripStatusTone,
} from "@/components/dashboard/dashboard-trip-card";
import type { InferSelectModel } from "drizzle-orm";
import type { trips as tripsTable } from "@/lib/db/schema";

type Trip = InferSelectModel<typeof tripsTable>;

const CARD_GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-violet-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-blue-500",
  "from-fuchsia-500 to-violet-600",
  "from-teal-500 to-emerald-600",
];

function getGradient(id: string) {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return CARD_GRADIENTS[hash % CARD_GRADIENTS.length];
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

/**
 * Dashboard / trip list (redesign brief Screen A). Minimal shell before a trip
 * is selected: top bar (logo + avatar), greeting, a horizontal rail of active /
 * upcoming trip cards with status chips, a Memories rail of past trips, and the
 * + New-trip FAB. No stats bar, no sidebar, no "where to next" inspiration —
 * only what Screen A specifies.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const profileRow = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
    columns: { displayName: true, avatarUrl: true },
  });
  const firstName =
    profileRow?.displayName?.split(" ")[0] ||
    (user.user_metadata?.display_name as string | undefined)?.split(" ")[0] ||
    user.email?.split("@")[0] ||
    "Traveler";

  const userTrips = await db
    .select({ trip: trips })
    .from(tripMembers)
    .innerJoin(trips, eq(tripMembers.tripId, trips.id))
    .where(eq(tripMembers.userId, user.id))
    .orderBy(trips.startDate);

  const allTrips: Trip[] = userTrips.map((r) => r.trip);

  const now = new Date();
  const ongoing = allTrips.filter(
    (t) => parseDateOnly(t.startDate) <= now && now <= parseDateOnly(t.endDate),
  );
  const upcoming = allTrips
    .filter((t) => isFuture(parseDateOnly(t.startDate)))
    .sort(
      (a, b) =>
        parseDateOnly(a.startDate).getTime() - parseDateOnly(b.startDate).getTime(),
    );
  const past = allTrips
    .filter((t) => isPast(parseDateOnly(t.endDate)))
    .sort(
      (a, b) =>
        parseDateOnly(b.endDate).getTime() - parseDateOnly(a.endDate).getTime(),
    );
  const activeUpcoming = [...ongoing, ...upcoming];

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = (k: string, p?: Record<string, string | number>) =>
    tFromDict(dict, k, p, locale);
  const timeOfDay = getTimeOfDay();

  function statusFor(trip: Trip): { label: string; tone: TripStatusTone } {
    const start = parseDateOnly(trip.startDate);
    const end = parseDateOnly(trip.endDate);
    if (start <= now && now <= end) return { label: t("dashboard.statusNow"), tone: "now" };
    const d = differenceInCalendarDays(start, now);
    if (d <= 30) return { label: t("dashboard.statusInDays", { count: d }), tone: "soon" };
    return { label: t("dashboard.statusUpcoming"), tone: "upcoming" };
  }
  function datesLabel(trip: Trip): string {
    return `${format(parseDateOnly(trip.startDate), "d MMM")} – ${format(parseDateOnly(trip.endDate), "d MMM")}`;
  }

  const empty = allTrips.length === 0;

  return (
    <div className="min-h-svh bg-background text-foreground flex flex-col">
      {/* Top bar — logo left, avatar right (brief Screen A). */}
      <header className="h-[52px] shrink-0 flex items-center justify-between px-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-30">
        <Link href="/dashboard" aria-label="Paxawa" className="text-foreground">
          <Logo variant="full" size="sm" />
        </Link>
        <DashboardAccountMenu
          displayName={profileRow?.displayName ?? firstName}
          avatarUrl={profileRow?.avatarUrl ?? null}
          userId={user.id}
        />
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 pb-[calc(96px+env(safe-area-inset-bottom))] space-y-8">
        {/* Greeting */}
        <div>
          <p className="type-caption text-tertiary">{format(now, "EEEE, d MMMM")}</p>
          <h1 className="type-display mt-1">{t(`greeting.${timeOfDay}`, { name: firstName })}</h1>
        </div>

        {empty ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/40 px-6 py-12 text-center">
            <Compass className="w-8 h-8 mx-auto text-tertiary" />
            <p className="mt-3 type-body-lg font-semibold">{t("dashboard.noTripsYet")}</p>
            <Link
              href="/trips/new"
              prefetch
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-5 h-11 text-sm font-bold"
            >
              <Plus className="w-4 h-4" />
              {t("dashboard.newTrip")}
            </Link>
          </div>
        ) : (
          <>
            {activeUpcoming.length > 0 && (
              <section>
                <h2 className="type-caption text-tertiary mb-3">{t("dashboard.yourTrips")}</h2>
                <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-4 px-4 pb-1">
                  {activeUpcoming.map((trip) => (
                    <DashboardTripCard
                      key={trip.id}
                      href={`/trips/${trip.id}`}
                      name={trip.name}
                      dates={datesLabel(trip)}
                      photo={trip.heroImageUrl ?? null}
                      gradient={getGradient(trip.id)}
                      status={statusFor(trip)}
                    />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2 className="type-caption text-tertiary mb-3">{t("dashboard.memories")}</h2>
                <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-4 px-4 pb-1">
                  {past.map((trip) => (
                    <DashboardTripCard
                      key={trip.id}
                      href={`/trips/${trip.id}`}
                      name={trip.name}
                      dates={datesLabel(trip)}
                      photo={trip.heroImageUrl ?? null}
                      gradient={getGradient(trip.id)}
                      variant="memory"
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* + New trip — fixed FAB, 56px accent circle, bottom-right (brief Screen A). */}
      {!empty && (
        <Link
          href="/trips/new"
          prefetch
          aria-label={t("dashboard.newTrip")}
          className="fixed end-5 bottom-[calc(24px+env(safe-area-inset-bottom))] z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground elev-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="w-7 h-7" />
        </Link>
      )}
    </div>
  );
}
