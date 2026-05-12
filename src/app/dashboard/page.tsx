export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { trips, tripMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { TripGrid } from "@/components/trips/trip-grid";
import { parseISO, differenceInDays, isPast, isFuture, format } from "date-fns";
import Link from "next/link";
import { Calendar, MapPin, Clock, ArrowRight, Plus, Globe2 } from "lucide-react";
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

  const firstName =
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
    (t) => parseISO(t.startDate) <= now && now <= parseISO(t.endDate)
  );
  const upcomingTrips = allTrips
    .filter((t) => isFuture(parseISO(t.startDate)))
    .sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime());
  const pastTrips = allTrips.filter((t) => isPast(parseISO(t.endDate)));

  const totalDays = allTrips.reduce(
    (s, t) => s + differenceInDays(parseISO(t.endDate), parseISO(t.startDate)) + 1,
    0
  );

  // Best trip to spotlight: ongoing first, then soonest upcoming
  const spotlight: Trip | null = ongoingTrips[0] || upcomingTrips[0] || null;

  const timeOfDay = getTimeOfDay();
  const timeEmoji = { morning: "☀️", afternoon: "🌤️", evening: "🌙" }[timeOfDay];

  const stats = [
    { label: "Total trips", value: allTrips.length, color: "text-primary", bg: "bg-primary/8" },
    { label: "Upcoming", value: upcomingTrips.length, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
    { label: "Days planned", value: totalDays, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
    { label: "Past trips", value: pastTrips.length, color: "text-muted-foreground", bg: "bg-muted/60" },
  ];

  return (
    <DashboardShell>
      {/* ── Greeting ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Good {timeOfDay}, {firstName} {timeEmoji}
          </h1>
          <p className="text-muted-foreground mt-1.5">
            {allTrips.length === 0
              ? "Create your first trip to get started"
              : ongoingTrips.length > 0
              ? `You're currently on a trip — ${ongoingTrips[0].name}!`
              : upcomingTrips.length > 0
              ? `${upcomingTrips.length} upcoming trip${upcomingTrips.length !== 1 ? "s" : ""} · Next: ${upcomingTrips[0].name}`
              : `${allTrips.length} trip${allTrips.length !== 1 ? "s" : ""} in your history`}
          </p>
        </div>
        <Link
          href="/trips/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New trip
        </Link>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────── */}
      {allTrips.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border/60 bg-card p-4 flex flex-col gap-1"
            >
              <span className={`text-3xl font-bold ${s.color}`}>{s.value}</span>
              <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Spotlight: ongoing or soonest upcoming ─────────────────── */}
      {spotlight && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full ${
              ongoingTrips.length > 0
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
            }`}>
              {ongoingTrips.length > 0 ? "🟢 Ongoing now" : "🔵 Up next"}
            </span>
          </div>

          <Link href={`/trips/${spotlight.id}`}>
            <div className={`group relative rounded-2xl bg-gradient-to-br ${getGradient(spotlight.id)} p-6 overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-0.5 transition-all duration-200`}>
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
                      {format(parseISO(spotlight.startDate), "MMM d")} –{" "}
                      {format(parseISO(spotlight.endDate), "MMM d, yyyy")}
                    </span>
                    <span className="flex items-center gap-1.5 text-white/80 text-sm">
                      <Clock className="w-3.5 h-3.5" />
                      {differenceInDays(parseISO(spotlight.endDate), parseISO(spotlight.startDate)) + 1} days
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
                    Open trip
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* ── All trips grid ─────────────────────────────────────────── */}
      <div>
        {allTrips.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              All trips · {allTrips.length}
            </h2>
            <div className="flex-1 h-px bg-border/60" />
          </div>
        )}
        <TripGrid trips={allTrips} />
      </div>
    </DashboardShell>
  );
}
