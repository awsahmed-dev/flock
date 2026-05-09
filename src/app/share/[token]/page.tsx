import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { trips, itineraryItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  MapPin, Calendar, Clock, DollarSign,
  Ticket, Hotel, Bus, Utensils, Star,
  ExternalLink, Users, Globe,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const trip = await db.query.trips.findFirst({ where: eq(trips.shareToken, token) });
  if (!trip) return { title: "Trip not found" };
  return {
    title: `${trip.name} · Flock`,
    description: `Check out this ${trip.destination} trip planned with Flock`,
    openGraph: {
      title: `${trip.name} · Flock`,
      description: `${differenceInDays(parseISO(trip.endDate), parseISO(trip.startDate)) + 1} days in ${trip.destination}`,
    },
  };
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  activity: <Ticket className="w-3.5 h-3.5" />,
  accommodation: <Hotel className="w-3.5 h-3.5" />,
  transport: <Bus className="w-3.5 h-3.5" />,
  meal: <Utensils className="w-3.5 h-3.5" />,
  other: <Star className="w-3.5 h-3.5" />,
};

const TYPE_COLOR: Record<string, string> = {
  activity: "text-violet-600 bg-violet-100 dark:text-violet-300 dark:bg-violet-900/40",
  accommodation: "text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40",
  transport: "text-amber-600 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/40",
  meal: "text-emerald-600 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/40",
  other: "text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-900/40",
};

const STATUS_DOT: Record<string, string> = {
  confirmed: "bg-green-500",
  proposed: "bg-amber-400",
  rejected: "bg-red-400",
};

export default async function SharePage({ params }: Props) {
  const { token } = await params;

  const trip = await db.query.trips.findFirst({
    where: eq(trips.shareToken, token),
    with: { members: { with: { user: true } } },
  });

  if (!trip) notFound();

  // All non-rejected items ordered by dayDate + sortOrder
  const items = await db
    .select()
    .from(itineraryItems)
    .where(and(eq(itineraryItems.tripId, trip.id)))
    .orderBy(itineraryItems.dayDate, itineraryItems.sortOrder);

  const confirmedItems = items.filter((i) => i.status !== "rejected");

  // Build ordered day list
  const start = parseISO(trip.startDate);
  const end = parseISO(trip.endDate);
  const totalDays = differenceInDays(end, start) + 1;
  const days: string[] = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const byDay = (day: string) =>
    confirmedItems.filter((i) => i.dayDate === day);

  const totalCost = confirmedItems
    .filter((i) => i.costEstimate)
    .reduce((s, i) => s + (i.costEstimate ?? 0), 0);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://flock-pi-six.vercel.app";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-6 pt-16 pb-12">
          {/* Flock badge */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-white/60">Planned with Flock</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
            {trip.name}
          </h1>

          <div className="flex flex-wrap items-center gap-4 mt-4 text-white/70 text-sm">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              {trip.destination}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" />
              {format(start, "MMM d")} – {format(end, "MMM d, yyyy")}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" />
              {totalDays} day{totalDays !== 1 ? "s" : ""}
            </span>
            {trip.members.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-primary" />
                {trip.members.length} traveler{trip.members.length !== 1 ? "s" : ""}
              </span>
            )}
            {totalCost > 0 && (
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-primary" />
                ~{trip.currency} {totalCost.toLocaleString()} est.
              </span>
            )}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mt-8">
            {[
              { label: "Activities", value: confirmedItems.filter(i => i.type === "activity").length },
              { label: "Meals", value: confirmedItems.filter(i => i.type === "meal").length },
              { label: "Confirmed", value: confirmedItems.filter(i => i.status === "confirmed").length },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-center backdrop-blur">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <div className="border-t border-white/10" />

      {/* ── Day-by-day itinerary ─────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        {days.map((day, idx) => {
          const dayItems = byDay(day);
          const parsed = parseISO(day);
          return (
            <div key={day} className="flex gap-4 sm:gap-6">
              {/* Day badge */}
              <div className="shrink-0 flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-white/8 border border-white/15 flex flex-col items-center justify-center backdrop-blur">
                  <span className="text-[10px] font-medium text-white/50 leading-none">{format(parsed, "EEE")}</span>
                  <span className="text-lg font-bold leading-tight">{format(parsed, "d")}</span>
                </div>
                {idx < days.length - 1 && (
                  <div className="w-px flex-1 mt-2 bg-white/10 min-h-4" />
                )}
              </div>

              {/* Day content */}
              <div className="flex-1 pb-2">
                <p className="text-sm font-semibold text-white/80 mb-3">
                  Day {idx + 1} · {format(parsed, "MMMM d, yyyy")}
                </p>

                {dayItems.length === 0 ? (
                  <p className="text-sm text-white/30 italic">Nothing planned</p>
                ) : (
                  <div className="space-y-2">
                    {dayItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur hover:bg-white/8 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {/* Type icon */}
                          <div className={`shrink-0 rounded-lg p-1.5 mt-0.5 ${TYPE_COLOR[item.type] ?? TYPE_COLOR.other}`}>
                            {TYPE_ICON[item.type] ?? TYPE_ICON.other}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm leading-snug">{item.title}</p>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[item.status] ?? ""}`} />
                            </div>

                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {item.startTime && (
                                <span className="flex items-center gap-1 text-xs text-white/50">
                                  <Clock className="w-3 h-3" />
                                  {item.startTime}
                                </span>
                              )}
                              {item.locationName && (
                                <span className="flex items-center gap-1 text-xs text-white/50">
                                  <MapPin className="w-3 h-3" />
                                  {item.locationName}
                                </span>
                              )}
                              {item.costEstimate != null && item.costEstimate > 0 && (
                                <span className="text-xs font-medium text-emerald-400">
                                  ~{trip.currency} {item.costEstimate.toFixed(0)}
                                </span>
                              )}
                            </div>

                            {item.notes && (
                              <p className="text-xs text-white/40 mt-1.5 leading-relaxed">{item.notes}</p>
                            )}

                            {item.bookingUrl && (
                              <a
                                href={item.bookingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                                View booking
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── CTA footer ────────────────────────────────────────────── */}
      <div className="border-t border-white/10 bg-white/3">
        <div className="max-w-3xl mx-auto px-6 py-12 text-center space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center mx-auto shadow-lg shadow-primary/30">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Plan your group trip with Flock</h2>
            <p className="text-sm text-white/50 mt-1.5 max-w-md mx-auto">
              Itinerary planning, group voting, expense splitting — all in one place. Free to get started.
            </p>
          </div>
          <Link
            href={appUrl}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-opacity"
          >
            Start planning free
          </Link>
          <p className="text-xs text-white/30">
            This trip was shared via{" "}
            <Link href={appUrl} className="underline hover:text-white/50 transition-colors">
              Flock
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
