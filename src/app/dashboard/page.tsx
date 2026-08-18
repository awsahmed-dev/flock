export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import Link from "next/link";
import { MapPin, Wallet, Users, ChatCircle as MessageCircle, MapTrifold as MapIcon, Receipt, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { getCurrentUser } from "@/lib/auth/get-user";
import { db } from "@/lib/db";
import { trips, tripMembers, profiles, itineraryItems, expenses } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { differenceInCalendarDays } from "date-fns";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { getRates } from "@/lib/fx";
import { totalInCurrency } from "@/lib/money-total";
import { getDictionary, getLocale, tFromDict } from "@/lib/i18n";
import { Logo } from "@/components/ui/logo";
import { AccountAvatarButton } from "@/components/account/account-avatar-button";
import { NewTripTrigger } from "@/components/trips/new-trip-trigger";
import { OnboardingCard } from "@/components/dashboard/onboarding-card";
import { ColdStartRedirect } from "@/components/dashboard/cold-start-redirect";
import { TipBanner } from "@/components/dashboard/tip-banner";
import { tripPhase } from "@/lib/trip-phase";
import { getToday } from "@/lib/today-server";
import { diffDaysIso, toIsoDay } from "@/lib/today";
import type { InferSelectModel } from "drizzle-orm";
import type { trips as tripsTable } from "@/lib/db/schema";

type Trip = InferSelectModel<typeof tripsTable>;

const ACCENT = "var(--clr-brand)";

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
 * Dashboard (Phase 4B §1). A hierarchy, not a flat photo album:
 *   ZONE 1 — the ACTIVE trip as a full-bleed hero + quick actions.
 *   ZONE 2 — COMING UP as a compact horizontal rail with countdown chips.
 *   ZONE 3 — MEMORIES (past trips) as a 2-column grid.
 * The header carries the greeting + the shared account avatar; the old
 * floating "+" FAB is gone (new trip lives in the rail / a bottom CTA).
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
  // fix/tz: resolved once, in the traveller's zone, and passed to every
  // phase decision on this page.
  const todayIso = await getToday();

  // §1-F: separate the trip list into the three zones.
  //
  // fix/tz: these used to compare `parseDateOnly(endDate)` — LOCAL MIDNIGHT on
  // the end date — against `new Date()`, an instant. So from 00:00:01 on the
  // final day of a trip, `parseDateOnly(endDate) < now` was already true and
  // the trip was filed under PAST, while `tripPhase()` on this very same page
  // still said LIVE and handed it the cold-start hero. The dashboard called one
  // trip both "past" and "live" for the whole of its last day, in every
  // timezone — verified by execution, not a boundary-window edge case.
  //
  // Comparing calendar day to calendar day makes the three buckets exhaustive,
  // mutually exclusive and inclusive at both ends — and makes "ongoing" mean
  // exactly what tripPhase calls LIVE by construction rather than by luck.
  const startOf = (t: Trip) => toIsoDay(t.startDate);
  const endOf = (t: Trip) => toIsoDay(t.endDate);
  const ongoing = allTrips.filter((t) => startOf(t) <= todayIso && endOf(t) >= todayIso);
  const future = allTrips
    .filter((t) => startOf(t) > todayIso)
    .sort((a, b) => startOf(a).localeCompare(startOf(b)));
  const pastTrips = allTrips
    .filter((t) => endOf(t) < todayIso)
    .sort((a, b) => endOf(b).localeCompare(endOf(a)));

  const activeTrip = ongoing[0] ?? null;
  // Any extra ongoing trip (rare) rides in the Coming Up rail so it isn't lost.
  const upcomingTrips = [...ongoing.slice(1), ...future];

  // Stop counts (total + today) for the hero + rail cards (+ the freshest
  // past trip so the §7-C Wrap prompt can show its stop count).
  const statTripIds = [activeTrip, ...upcomingTrips, pastTrips[0]]
    .filter(Boolean)
    .map((t) => (t as Trip).id);
  const itinByTrip = new Map<string, { total: number; today: number }>();
  if (statTripIds.length) {
    const rows = await db
      .select({ tripId: itineraryItems.tripId, dayDate: itineraryItems.dayDate })
      .from(itineraryItems)
      .where(inArray(itineraryItems.tripId, statTripIds));
    for (const r of rows) {
      const e = itinByTrip.get(r.tripId) ?? { total: 0, today: 0 };
      e.total++;
      if (r.dayDate === todayIso) e.today++;
      itinByTrip.set(r.tripId, e);
    }
  }

  // Active-trip live stats: crew, spend, day-of-trip.
  let activeStats: {
    memberCount: number;
    spent: number;
    /** Currencies whose rows were EXCLUDED from `spent` because no rate was available. */
    spentMissing: string[];
    currency: string;
    totalDays: number;
    currentDayIndex: number;
    todayStops: number;
  } | null = null;
  if (activeTrip) {
    const tripCurrency = activeTrip.currency ?? "USD";
    const [memberRows, expRows] = await Promise.all([
      db.select({ userId: tripMembers.userId }).from(tripMembers).where(eq(tripMembers.tripId, activeTrip.id)),
      db.select({ amount: expenses.amount, currency: expenses.currency }).from(expenses).where(eq(expenses.tripId, activeTrip.id)),
    ]);
    let spent = 0;
    let spentMissing: string[] = [];
    if (expRows.length) {
      const rates = await getRates(tripCurrency).catch(() => null);
      // `?? amt` used to count a 96,000 KRW dinner as 96,000 USD when the
      // rate was missing. Rows without a rate are now excluded and named.
      const total = totalInCurrency(
        expRows.map((e) => ({ amount: Number(e.amount) || 0, currency: e.currency })),
        tripCurrency,
        rates,
      );
      spent = total.total;
      spentMissing = total.unconverted.map((r) => r.currency);
    }
    const start = parseDateOnly(activeTrip.startDate);
    const end = parseDateOnly(activeTrip.endDate);
    const totalDays = differenceInCalendarDays(end, start) + 1;
    const currentDayIndex = Math.max(
      0,
      Math.min(totalDays - 1, diffDaysIso(toIsoDay(activeTrip.startDate), todayIso)),
    );
    activeStats = {
      memberCount: memberRows.length,
      spent,
      spentMissing,
      currency: tripCurrency,
      totalDays,
      currentDayIndex,
      todayStops: itinByTrip.get(activeTrip.id)?.today ?? 0,
    };
  }

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = (k: string, p?: Record<string, string | number>) => tFromDict(dict, k, p, locale);
  const timeOfDay = getTimeOfDay();

  function datesLabel(trip: Trip): string {
    return `${format(parseDateOnly(trip.startDate), "d MMM")} – ${format(parseDateOnly(trip.endDate), "d MMM")}`;
  }
  function money(amount: number, currency: string): string {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }

  const empty = allTrips.length === 0;

  // Phase 6 §2.2: cold-start — a LIVE trip owns the app open.
  // fix/tz: the phase follows the viewer's calendar, not the server's.
  const liveTrip = allTrips.find((t) => tripPhase(t, todayIso) === "LIVE") ?? null;

  return (
    <div className="min-h-svh bg-background text-foreground">
      <ColdStartRedirect liveTripId={liveTrip?.id ?? null} />
      {/* HEADER — date + greeting + account avatar. */}
      <header className="flex items-start justify-between px-4 pt-6 pb-4">
        <div className="min-w-0">
          <Link href="/dashboard" aria-label="Paxawa" className="inline-block text-foreground">
            <Logo variant="full" size="sm" />
          </Link>
          <p className="type-caption text-tertiary mt-3 uppercase tracking-wider">
            {format(parseDateOnly(todayIso), "EEEE, d MMMM")}
          </p>
          <h1 className="text-[26px] font-bold leading-tight mt-0.5 truncate">
            {t(`greeting.${timeOfDay}`, { name: firstName })}
          </h1>
        </div>
        <div className="pt-1 shrink-0">
          <AccountAvatarButton size={40} />
        </div>
      </header>

      {empty ? (
        // First-run Finding 8: the written, translated onboarding card was
        // dead code while this rendered a compass and one pill. Now it is
        // the zero-trip experience.
        <div className="px-4">
          <OnboardingCard />
        </div>
      ) : (
        <div
          className="flex flex-col gap-7"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 32px)" }}
        >
          {/* Phase 6 §7-C: fresh Wrap prompt — a trip that ended < 14 days ago
              owns the top of the dashboard when nothing is live. */}
          {!activeTrip &&
            pastTrips[0] &&
            diffDaysIso(toIsoDay(pastTrips[0].endDate), todayIso) <= 14 && (
              <section>
                <div className="relative mx-4 rounded-3xl overflow-hidden" style={{ height: 180 }}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${getGradient(pastTrips[0].id)}`} />
                  {pastTrips[0].heroImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pastTrips[0].heroImageUrl} alt={pastTrips[0].name} className="absolute inset-0 w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 20%, rgba(0,0,0,0.88) 100%)" }} />
                  <Link href={`/trips/${pastTrips[0].id}`} prefetch aria-label={pastTrips[0].name} className="absolute inset-0 z-10" />
                  <div className="absolute inset-x-0 bottom-0 p-4 z-20 pointer-events-none">
                    <h2 className="text-[22px] font-bold text-white leading-tight">
                      {t("dashboard.wrappedBanner", { name: pastTrips[0].name })}
                    </h2>
                    <p className="text-[13px] text-white/70 mt-0.5">
                      {(itinByTrip.get(pastTrips[0].id)?.total ?? 0) > 0
                        ? t("dashboard.stopsDash", { count: itinByTrip.get(pastTrips[0].id)?.total ?? 0 })
                        : ""}
                      {t("dashboard.seeWrap")} <span aria-hidden className="inline-block rtl:-scale-x-100">→</span>
                    </p>
                  </div>
                </div>
              </section>
            )}

          {/* ZONE 1 — ACTIVE TRIP HERO. §4-B: the quick actions live INSIDE the
              card so they clearly belong to the active trip. A full-card tap
              zone (z-10) sits under everything except the action pills. */}
          {activeTrip && activeStats && (
            <section>
              <SectionLabel label={t("dashboard.now")} />
              <div className="relative mx-4 rounded-3xl overflow-hidden" style={{ height: 260 }}>
                <div className={`absolute inset-0 bg-gradient-to-br ${getGradient(activeTrip.id)}`} />
                {activeTrip.heroImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={activeTrip.heroImageUrl} alt={activeTrip.name} className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 20%, rgba(0,0,0,0.88) 100%)" }} />

                {/* Full-card tap zone → trip NOW page. */}
                <Link href={`/trips/${activeTrip.id}`} prefetch aria-label={activeTrip.name} className="absolute inset-0 z-10" />

                {/* LIVE badge */}
                <div className="absolute top-3 end-3 z-20 rounded-full px-3 py-1 flex items-center gap-1.5" style={{ background: "var(--clr-moss)" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />
                  <span className="text-[12px] font-bold text-primary-foreground">{t("dashboard.live")}</span>
                </div>

                {/* Bottom content — non-interactive except the action pills, so
                    taps elsewhere fall through to the tap zone. */}
                <div className="absolute inset-x-0 bottom-0 p-4 z-20 pointer-events-none">
                  <h2 className="text-[22px] font-bold text-white leading-tight line-clamp-2">{activeTrip.name}</h2>
                  <p className="text-[13px] text-white/70 mt-0.5">
                    {activeTrip.destination} · {t("dashboard.dayOf", { current: activeStats.currentDayIndex + 1, total: activeStats.totalDays })}
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <StatChip icon={MapPin} value={t("dashboard.stopsToday", { count: activeStats.todayStops })} />
                    <StatChip
                      icon={Wallet}
                      value={activeStats.spentMissing.length ? `${money(activeStats.spent, activeStats.currency)}+` : money(activeStats.spent, activeStats.currency)}
                      title={activeStats.spentMissing.length ? t("dashboard.spentIncomplete", { currencies: activeStats.spentMissing.join(", ") }) : undefined}
                    />
                    <StatChip icon={Users} value={t("dashboard.crewCount", { count: activeStats.memberCount })} />
                  </div>
                  <div className="flex gap-2 mt-3 pointer-events-auto">
                    <QuickActionPill href={`/trips/${activeTrip.id}/huddle`} icon={MessageCircle} label={t("nav.huddle")} />
                    <QuickActionPill href={`/trips/${activeTrip.id}/itinerary`} icon={MapIcon} label={t("nav.map")} />
                    <QuickActionPill href={`/trips/${activeTrip.id}/money`} icon={Receipt} label={t("nav.money")} />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Video round 3: one small educational line between the zones. */}
          <TipBanner tripHref={(ongoing[0] ?? future[0] ?? allTrips[0]) ? `/trips/${(ongoing[0] ?? future[0] ?? allTrips[0]).id}` : null} />

          {/* ZONE 2 — COMING UP. */}
          {upcomingTrips.length > 0 && (
            <section>
              <SectionLabel label={t("dashboard.comingUp")} />
              <div className="flex gap-3 overflow-x-auto scrollbar-none px-4 pb-1">
                {upcomingTrips.map((trip) => {
                  const daysUntil = Math.max(0, diffDaysIso(todayIso, toIsoDay(trip.startDate)));
                  const stops = itinByTrip.get(trip.id)?.total ?? 0;
                  const totalDays = differenceInCalendarDays(parseDateOnly(trip.endDate), parseDateOnly(trip.startDate)) + 1;
                  const progress = Math.min(100, (stops / Math.max(1, totalDays * 3)) * 100);
                  return (
                    <Link
                      key={trip.id}
                      href={`/trips/${trip.id}`}
                      prefetch
                      className="relative rounded-2xl overflow-hidden shrink-0 active:scale-[0.98] transition-transform"
                      style={{ width: 160, height: 200 }}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${getGradient(trip.id)}`} />
                      {trip.heroImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={trip.heroImageUrl} alt={trip.name} className="absolute inset-0 w-full h-full object-cover" />
                      )}
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.80) 100%)" }} />
                      <div className="absolute top-3 start-3 rounded-full px-2.5 py-1" style={{ background: "var(--clr-horizon)" }}>
                        <span className="text-[10px] font-bold text-white">
                          {daysUntil === 0 ? t("dashboard.today") : t("dashboard.daysShort", { count: daysUntil })}
                        </span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-3">
                        <p className="text-[14px] font-bold text-white leading-tight line-clamp-2">{trip.name}</p>
                        <p className="text-[12px] text-white/65 mt-0.5">{datesLabel(trip)}</p>
                        <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.20)" }}>
                          <div className="h-full me-auto rounded-full" style={{ width: `${progress}%`, background: "var(--clr-dune)", minWidth: stops > 0 ? 6 : 0 }} />
                        </div>
                      </div>
                    </Link>
                  );
                })}
                {/* Dashed "New trip" card. */}
                <NewTripTrigger variant="card" label={t("dashboard.newTrip")} />
              </div>
            </section>
          )}

          {/* ZONE 3 — MEMORIES. Video round 3: the film strip hugged the
              bottom nav and clipped at the edge. Now: up to three quiet rows
              (cover · name · dates) and "See all" → /dashboard/memories. */}
          {pastTrips.length > 0 && (
            <section className="px-4">
              <div className="flex items-baseline justify-between mt-1 mb-2">
                <p className="text-[12px] font-semibold tracking-wider uppercase text-tertiary">
                  {t("dashboard.memories")} <span className="text-muted-foreground normal-case tracking-normal tabular-nums">· {pastTrips.length}</span>
                </p>
                {pastTrips.length > 3 && (
                  <Link href="/dashboard/memories" className="text-[12px] font-bold" style={{ color: "var(--clr-brand)" }}>
                    {t("cockpit.seeAll")}
                  </Link>
                )}
              </div>
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {pastTrips.slice(0, 3).map((trip, i) => (
                  <Link
                    key={trip.id}
                    href={`/trips/${trip.id}`}
                    prefetch
                    className={`flex items-center gap-3 px-3 py-2.5 active:bg-muted/40 ${i > 0 ? "border-t border-border/60" : ""}`}
                  >
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-muted">
                      {trip.heroImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={trip.heroImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center font-extrabold" style={{ color: "var(--clr-brand)", opacity: 0.5 }}>
                          {(trip.destination || trip.name || "?").charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-bold leading-tight truncate">{trip.name}</p>
                      <p className="text-[12px] text-muted-foreground truncate mt-0.5">{trip.destination} · {datesLabel(trip)}</p>
                    </div>
                    <CaretRight size={16} weight="bold" className="text-muted-foreground/60 rtl:rotate-180 shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* §1-G: full-width new-trip CTA when there's nothing coming up. */}
          {upcomingTrips.length === 0 && (
            <div className="px-4">
              <NewTripTrigger variant="block" label={t("dashboard.planNewTrip")} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Small presentational helpers ──────────────────────────────────────── */

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="mt-1 mb-3 px-4 text-[12px] font-semibold tracking-wider uppercase text-tertiary">
      {label}
    </p>
  );
}

function StatChip({ icon: Icon, value, title }: { icon: typeof MapPin; value: string; title?: string }) {
  return (
    <span title={title} aria-label={title} className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: "rgba(255,255,255,0.15)" }}>
      <Icon size={16} className="text-white" />
      <span className="text-[12px] font-medium text-white">{value}</span>
    </span>
  );
}

function QuickActionPill({ href, icon: Icon, label }: { href: string; icon: typeof MapPin; label: string }) {
  // §4-B: glass pill overlaid on the hero card. backdropFilter MUST be inline —
  // the bundler strips it from stylesheets.
  return (
    <Link
      href={href}
      prefetch
      className="relative z-20 flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 active:scale-[0.97] transition-transform"
      style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
    >
      <Icon size={16} className="text-white" />
      <span className="text-[12px] font-semibold text-white">{label}</span>
    </Link>
  );
}
