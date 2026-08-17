import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  trips,
  itineraryItems,
  documents,
  votes,
  voteOptions,
  voteResponses,
  expenses,
} from "@/lib/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
import { parseISO, differenceInDays } from "date-fns";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { addDaysIso, diffDaysIso, toIsoDay } from "@/lib/today";
import { MapPin, Calendar, Clock, CurrencyDollar as DollarSign, Ticket, Buildings as Hotel, Bus, ForkKnife as Utensils, Star, ArrowSquareOut as ExternalLink, Users, Globe, CheckCircle as CheckCircle2, ChartBar as BarChart3 } from "@phosphor-icons/react/dist/ssr";
import { Logo } from "@/components/ui/logo";
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
    title: `${trip.name} · Paxawa`,
    description: `Check out this ${trip.destination} trip planned with Paxawa`,
    openGraph: {
      title: `${trip.name} · Paxawa`,
      description: `${differenceInDays(parseDateOnly(trip.endDate), parseDateOnly(trip.startDate)) + 1} days in ${trip.destination}`,
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

  // ── Photo strip — last 12 uploaded image documents (top-of-page gallery)
  const photoDocs = await db
    .select({ id: documents.id, url: documents.url, title: documents.title })
    .from(documents)
    .where(and(eq(documents.tripId, trip.id), eq(documents.type, "image")))
    .orderBy(desc(documents.createdAt))
    .limit(12);

  // ── Decisions — resolved votes with their winning option (most-voted).
  //    Pulls the full vote list, options, and responses in 3 round-trips.
  const tripVotes = await db
    .select()
    .from(votes)
    .where(eq(votes.tripId, trip.id))
    .orderBy(desc(votes.createdAt));
  const voteIds = tripVotes.map((v) => v.id);
  // Load all options + responses, then bucket by voteId in JS. Cheaper than
  // an IN-clause for a recap that typically has fewer than 10 votes.
  type OptRow = {
    id: string;
    voteId: string;
    label: string;
    costEstimate: number | null;
  };
  const optsByVote = new Map<string, OptRow[]>();
  const responseCounts = new Map<string, Map<string, number>>();
  if (voteIds.length > 0) {
    const optsAll = await db
      .select({
        id: voteOptions.id,
        voteId: voteOptions.voteId,
        label: voteOptions.label,
        costEstimate: voteOptions.costEstimate,
      })
      .from(voteOptions);
    const respsAll = await db.select().from(voteResponses);
    for (const o of optsAll) {
      if (!voteIds.includes(o.voteId)) continue;
      const list = optsByVote.get(o.voteId) ?? [];
      list.push(o);
      optsByVote.set(o.voteId, list);
    }
    for (const r of respsAll) {
      if (!voteIds.includes(r.voteId)) continue;
      const inner = responseCounts.get(r.voteId) ?? new Map();
      inner.set(r.selectedOptionId, (inner.get(r.selectedOptionId) ?? 0) + 1);
      responseCounts.set(r.voteId, inner);
    }
  }

  const decisions = tripVotes
    .map((v) => {
      const opts = optsByVote.get(v.id) ?? [];
      const tallies = responseCounts.get(v.id) ?? new Map<string, number>();
      const ranked = opts
        .map((o) => ({ option: o, votes: tallies.get(o.id) ?? 0 }))
        .sort((a, b) => b.votes - a.votes);
      return { vote: v, ranked };
    })
    // Skip empty/no-response votes from the public recap.
    .filter((d) => d.ranked[0]?.votes > 0)
    .slice(0, 6);

  // ── Real spend — group expenses by currency for an honest "trip cost"
  //    figure on the recap. Won't FX-convert until we wire daily rates.
  const tripExpenses = await db
    .select({ amount: expenses.amount, currency: expenses.currency })
    .from(expenses)
    .where(eq(expenses.tripId, trip.id));
  const spendByCurrency = tripExpenses.reduce<Record<string, number>>(
    (acc, e) => {
      acc[e.currency] = (acc[e.currency] ?? 0) + e.amount;
      return acc;
    },
    {},
  );

  // Build ordered day list.
  //
  // fix/tz: this used to step a LOCAL-midnight Date and serialise each step with
  // `.toISOString()`. That is the exact inverse of the bug date-only.ts was
  // written for: it shifts every day one EARLIER in UTC-PLUS zones and is
  // correct in the Americas. Measured, for a 10–13 Jul trip:
  //
  //   UTC / Los_Angeles   [07-10, 07-11, 07-12, 07-13]   4/4 day_date rows match
  //   Riyadh / London / KL[07-09, 07-10, 07-11, 07-12]   3/4 match
  //
  // Because byDay() matches these keys against itinerary_items.day_date, the
  // final day of every shared recap rendered EMPTY and day 1's stops sat under
  // day 2's heading. Dormant on Vercel (UTC); live in `next dev` for anyone
  // developing in the Gulf, Europe or Asia — i.e. on this project's own machines.
  //
  // The keys are calendar days, so they are now built as strings. No Date is
  // constructed, so no Date can be serialised through the wrong zone.
  const startIso = toIsoDay(trip.startDate);
  const totalDays = diffDaysIso(startIso, toIsoDay(trip.endDate)) + 1;
  const days: string[] = Array.from({ length: totalDays }, (_, i) => addDaysIso(startIso, i));

  // Dates for DISPLAY only — `format()` needs a Date, and parseDateOnly's local
  // midnight is what makes it render the right calendar day in every zone.
  // Never compare these against an instant; that is what the strings above are for.
  const start = parseDateOnly(trip.startDate);
  const end = parseDateOnly(trip.endDate);

  const byDay = (day: string) =>
    confirmedItems.filter((i) => i.dayDate === day);

  const totalCost = confirmedItems
    .filter((i) => i.costEstimate)
    .reduce((s, i) => s + (i.costEstimate ?? 0), 0);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://paxawa.com";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto px-6 pt-16 pb-12">
          {/* Paxawa badge */}
          <div className="flex items-center gap-2.5 mb-8 text-white/80">
            <Logo variant="full" size="sm" />
            <span className="text-white/30">·</span>
            <span className="text-sm text-white/50">Planned together</span>
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

      {/* ── Photo strip ──────────────────────────────────────────── */}
      {photoDocs.length > 0 && (
        <div className="border-t border-white/10">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <p className="text-xs font-bold tracking-wider text-white/40 uppercase mb-3">
              Photos · {photoDocs.length}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 snap-x snap-mandatory">
              {photoDocs.map((p) => (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 snap-start w-44 h-44 sm:w-56 sm:h-56 rounded-2xl overflow-hidden bg-white/5 border border-white/10 relative group"
                  title={p.title}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={p.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Decisions made (resolved votes) ─────────────────────── */}
      {decisions.length > 0 && (
        <div className="border-t border-white/10">
          <div className="max-w-3xl mx-auto px-6 py-10">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-violet-400" />
              </div>
              <h2 className="text-xl font-bold">What the crew decided</h2>
            </div>
            <div className="space-y-3">
              {decisions.map(({ vote, ranked }) => {
                const winner = ranked[0];
                const totalResponses = ranked.reduce(
                  (s, r) => s + r.votes,
                  0,
                );
                const winPct = totalResponses
                  ? Math.round((winner.votes / totalResponses) * 100)
                  : 0;
                const isClosed = vote.status === "closed";
                return (
                  <div
                    key={vote.id}
                    className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="text-sm font-semibold leading-snug">
                        {vote.question}
                      </p>
                      {isClosed && (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3" />
                          Closed
                        </span>
                      )}
                    </div>
                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm font-bold text-emerald-300">
                          🏆 {winner.option.label}
                        </p>
                        <span className="text-xs font-bold text-emerald-300/80 tabular-nums">
                          {winner.votes} vote{winner.votes !== 1 ? "s" : ""}
                          {totalResponses > 1 && ` · ${winPct}%`}
                        </span>
                      </div>
                      {winner.option.costEstimate != null && (
                        <p className="text-xs text-white/60">
                          ~{trip.currency} {winner.option.costEstimate}
                        </p>
                      )}
                    </div>
                    {ranked.length > 1 && (
                      <p className="text-[11px] text-white/40 mt-2 truncate">
                        Other options:{" "}
                        {ranked
                          .slice(1)
                          .map((r) => r.option.label)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Trip cost (real spend) ──────────────────────────────── */}
      {Object.keys(spendByCurrency).length > 0 && (
        <div className="border-t border-white/10">
          <div className="max-w-3xl mx-auto px-6 py-10">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold">What the trip actually cost</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(spendByCurrency)
                .sort(([, a], [, b]) => b - a)
                .map(([curr, total]) => (
                  <div
                    key={curr}
                    className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur"
                  >
                    <p className="text-[10px] font-bold tracking-wider text-white/40 uppercase">
                      {curr}
                    </p>
                    <p className="text-xl font-bold tabular-nums mt-0.5">
                      {total.toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

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
          <div className="mx-auto text-white inline-flex">
            <Logo variant="mark" size="xl" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Plan your group trip with Paxawa</h2>
            <p className="text-sm text-white/50 mt-1.5 max-w-md mx-auto">
              Itinerary planning, group voting, expense splitting — all in one place. Free to get started.
            </p>
          </div>
          <Link
            href={appUrl}
            className="inline-flex items-center gap-2 rounded-full bg-primary hover:opacity-90 px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-opacity"
          >
            Start planning free
          </Link>
          <p className="text-xs text-white/30">
            This trip was shared via{" "}
            <Link href={appUrl} className="underline hover:text-white/50 transition-colors">
              Paxawa
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
