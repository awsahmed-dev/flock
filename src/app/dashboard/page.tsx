export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { trips, tripMembers, profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { TripGrid, SuggestedTrips } from "@/components/trips/trip-grid";
import { PastTripsRow } from "@/components/dashboard/past-trips-row";
import { DashboardAccountMenu } from "@/components/dashboard/dashboard-account-menu";
import { parseISO, differenceInDays, isPast, isFuture } from "date-fns";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { getDictionary, getLocale, tFromDict } from "@/lib/i18n";
import Link from "next/link";
import { Calendar, Clock, ArrowRight, Plus, Globe2, Plane } from "lucide-react";
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

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  // B21: prefer the user's profile.display_name (editable from /account/
  // profile) over the Supabase user_metadata. Falls back to first word of
  // email only when nothing else is set.
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
  const ongoingTrips = allTrips.filter(
    (t) => parseDateOnly(t.startDate) <= now && now <= parseDateOnly(t.endDate)
  );
  const upcomingTrips = allTrips
    .filter((t) => isFuture(parseDateOnly(t.startDate)))
    .sort((a, b) => parseDateOnly(a.startDate).getTime() - parseDateOnly(b.startDate).getTime());
  const pastTrips = allTrips.filter((t) => isPast(parseDateOnly(t.endDate)));

  const totalDays = allTrips.reduce(
    (s, t) => s + differenceInDays(parseDateOnly(t.endDate), parseDateOnly(t.startDate)) + 1,
    0
  );

  // Best trip to spotlight: ongoing first, then soonest upcoming
  const spotlight: Trip | null = ongoingTrips[0] || upcomingTrips[0] || null;

  const timeOfDay = getTimeOfDay();
  const timeEmoji = { morning: "☀️", afternoon: "🌤️", evening: "🌙" }[timeOfDay];

  // B15-d: pull the dictionary so the stats chips, greeting + spotlight
  // text are translated server-side.
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = (k: string, p?: Record<string, string | number>) =>
    tFromDict(dict, k, p, locale);

  // B15-i: dropped the {count} interpolation in these labels — the chip
  // already renders s.value next to it, so a label like "5 total trips"
  // alongside the "5" pill produced the duplicated "5 5 total trips"
  // bug spotted in screenshot. Labels are now plain noun strings.
  const stats = [
    { label: t("dashboard.totalTrips"), value: allTrips.length, color: "text-primary", bg: "bg-primary/8" },
    { label: t("dashboard.upcomingCount"), value: upcomingTrips.length, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { label: t("dashboard.daysPlanned"), value: totalDays, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: t("dashboard.pastTrips"), value: pastTrips.length, color: "text-muted-foreground", bg: "bg-muted/60" },
  ];

  return (
    <DashboardShell
      accountMenu={
        <DashboardAccountMenu
          displayName={profileRow?.displayName ?? firstName}
          avatarUrl={profileRow?.avatarUrl ?? null}
          userId={user.id}
        />
      }
      user={{
        displayName: profileRow?.displayName ?? firstName,
        avatarUrl: profileRow?.avatarUrl ?? null,
        userId: user.id,
      }}
    >
      {/* B24-followup: consistent vertical rhythm between sections. Was a
          chaotic mix of mb-4 / mb-6 / mb-8 / no-margin that made the
          Memories row sit flush against the trips grid. Now every
          section is a child of one space-y wrapper. */}
      <div className="space-y-10 sm:space-y-12">
      <div className="space-y-4">
        {/* ── Greeting row: name + new-trip CTA only. Profile lives in
            the global header now, not next to the action button. */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t(`greeting.${timeOfDay}`, { name: firstName })}
            </h1>
            {allTrips.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {t("greeting.tripsSummaryEmpty")}
              </p>
            )}
          </div>
          <Link
            href="/trips/new"
            prefetch
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 px-3.5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            {t("dashboard.newTrip")}
          </Link>
        </div>

        {allTrips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {stats.map((s) => (
              <div
                key={s.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px]"
              >
                <span className={`font-bold tabular-nums ${s.color}`}>{s.value}</span>
                <span className="text-muted-foreground">{s.label.toLowerCase()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Spotlight: ongoing or soonest upcoming ─────────────────── */}
      {spotlight && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full ${
              ongoingTrips.length > 0
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
            }`}>
              {ongoingTrips.length > 0 ? (
                <>
                  <span className="relative flex w-2 h-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                    <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
                  </span>
                  Ongoing now
                </>
              ) : (
                <>
                  <Plane className="w-3 h-3" />
                  Up next
                </>
              )}
            </span>
          </div>

          <Link href={`/trips/${spotlight.id}`}>
            <div className={`group relative rounded-2xl ${spotlight.heroImageUrl ? "" : `bg-gradient-to-br ${getGradient(spotlight.id)}`} p-6 overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-0.5 transition-all duration-200 min-h-[160px]`}>
              {/* B19: destination photo behind the spotlight card */}
              {spotlight.heroImageUrl && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={spotlight.heroImageUrl}
                    alt={spotlight.destination}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/35 to-black/55" />
                </>
              )}
              {/* Decorative orbs */}
              <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
              <div className="absolute right-12 -bottom-6 w-24 h-24 rounded-full bg-white/8" />
              <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-black/5" />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <p className="text-white/70 text-xs font-medium uppercase tracking-widest mb-1.5">
                    {spotlight.destination}
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {spotlight.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span className="flex items-center gap-1.5 text-white/80 text-sm">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(parseDateOnly(spotlight.startDate), "MMM d")} –{" "}
                      {format(parseDateOnly(spotlight.endDate), "MMM d, yyyy")}
                    </span>
                    <span className="flex items-center gap-1.5 text-white/80 text-sm">
                      <Clock className="w-3.5 h-3.5" />
                      {differenceInDays(parseDateOnly(spotlight.endDate), parseDateOnly(spotlight.startDate)) + 1} days
                    </span>
                    {spotlight.budgetTotal && (
                      <span className="flex items-center gap-1.5 text-white/80 text-sm">
                        <Globe2 className="w-3.5 h-3.5" />
                        {spotlight.currency} {spotlight.budgetTotal.toLocaleString()} budget
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 transition-colors backdrop-blur">
                    {t("dashboard.openTrip")}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform rtl:rotate-180" />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {allTrips.filter((t) => !isPast(parseDateOnly(t.endDate))).length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              {t("dashboard.activeTripsHeading")}
            </h2>
            <div className="flex-1 h-px bg-border/60" />
          </div>
          <TripGrid trips={allTrips.filter((t) => !isPast(parseDateOnly(t.endDate)))} />
        </section>
      )}

      {pastTrips.length > 0 && (
        <PastTripsRow trips={pastTrips} />
      )}

      {allTrips.length > 0 && <SuggestedTrips />}
      </div>
    </DashboardShell>
  );
}
