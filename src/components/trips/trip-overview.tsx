"use client";

import { useState, useEffect } from "react";
import {
  Copy, Check, Users, Calendar, Wallet, ArrowRight, Clock, Link2, Sparkles,
  MapPin, Backpack, Compass, Map as MapIcon, CreditCard as CardIcon,
  Wallet as WalletIcon, X as XIcon, AlertCircle,
} from "lucide-react";
import {
  parseISO, differenceInDays, isPast, differenceInCalendarDays, eachDayOfInterval,
  format as dfFormat,
} from "date-fns";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import Link from "next/link";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";
import { AiPlannerPanel } from "./ai-planner-panel";
import { PlanDaySheet } from "@/components/itinerary/plan-day-sheet";
import { pickSuggestion, type ActionHubStats } from "./trip-action-hub";
import { fmtAmount } from "@/lib/numerals";
import { useT, useLocale } from "@/components/i18n/locale-provider";
import { UserAvatar } from "@/components/ui/user-avatar";
import { MemberStatsSheet } from "@/components/trips/member-stats-sheet";

interface Member {
  id: string;
  userId?: string;
  displayName: string;
  role: "owner" | "member";
  user?: { avatarUrl?: string | null; id?: string } | null;
}

interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  budgetTotal: number | null;
  currency: string;
  members: Member[];
}

interface Props {
  trip: Trip;
  inviteUrl: string | null;
  userId: string;
  stats: ActionHubStats;
  hero?: { url: string; creditName: string; creditLink: string } | null;
}

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

// Hero status pill — drives the countdown copy + tone.
function getTripStatus(
  startDate: string,
  endDate: string,
  t: (k: string, p?: Record<string, string | number>) => string,
) {
  const now = new Date();
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (now >= start && now <= end)
    return { label: t("trip.happeningNow"), color: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30" };
  if (isPast(end)) {
    const daysSinceEnd = differenceInCalendarDays(now, end);
    if (daysSinceEnd <= 14)
      return { label: t("trip.justEnded"), color: "bg-amber-500/20 text-amber-200 border-amber-400/30" };
    return { label: t("trip.past"), color: "bg-slate-500/20 text-slate-200 border-slate-400/30" };
  }
  const days = differenceInCalendarDays(start, now);
  return { label: t("trip.startsIn", { days }), color: "bg-blue-500/20 text-blue-100 border-blue-400/30" };
}

/**
 * Paxawa v2 — Trip Overview, redesigned. The old overview stacked a hero, an
 * onboarding strip, a loud 6-card colored action grid, two compact cards and a
 * separate AI button — it read as crowded. v2 calms it to a clear hierarchy:
 * a refined hero, the plan-first primary actions, ONE "up next" router, a quiet
 * snapshot strip, and crew — leaning on the sidebar/bottom-nav for navigation
 * rather than duplicating every tab as a tile.
 */
export function TripOverview({ trip, inviteUrl, userId, stats, hero }: Props) {
  const t = useT();
  useLocale();
  const isOwner =
    trip.members.find((m) => (m.userId ?? m.user?.id ?? m.id) === userId)?.role === "owner";
  const [copied, setCopied] = useState(false);
  const [statsMember, setStatsMember] = useState<Member | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [planDayOpen, setPlanDayOpen] = useState(false);

  const nights = differenceInDays(parseDateOnly(trip.endDate), parseDateOnly(trip.startDate));
  const gradient = getGradient(trip.id);
  const tripStatus = getTripStatus(trip.startDate, trip.endDate, t);
  const suggestion = pickSuggestion(trip.id, stats, t);

  const days = eachDayOfInterval({
    start: parseDateOnly(trip.startDate),
    end: parseDateOnly(trip.endDate),
  }).map((d) => dfFormat(d, "yyyy-MM-dd"));

  async function copyInviteLink() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success(t("common.copied"));
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-[1fr_340px] lg:gap-7 lg:items-start">
      {/* ── Left column — hero + plan actions + up-next + snapshot ─────── */}
      <div className="space-y-6 min-w-0">
        <FirstRunOnboarding tripId={trip.id} />

        {/* Hero — refined, more breathing room, a single clear status pill. */}
        <div className={`relative rounded-3xl ${hero ? "" : `bg-gradient-to-br ${gradient}`} overflow-hidden`}>
          {hero && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hero.url} alt={trip.destination} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/30" />
              <a
                href={hero.creditLink}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute bottom-1.5 end-2.5 text-[9px] text-white/55 hover:text-white/90 z-20"
              >
                📸 {hero.creditName}
              </a>
            </>
          )}
          <div className="relative z-10 px-6 py-6 sm:px-8 sm:py-7 flex flex-col min-h-[180px] sm:min-h-[200px]">
            <div className="flex items-start justify-between gap-3">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold backdrop-blur-sm ${tripStatus.color}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {tripStatus.label}
              </span>
              <div className="flex items-center -space-x-1.5 shrink-0">
                {trip.members.slice(0, 4).map((m) => (
                  <UserAvatar key={m.id} name={m.displayName} avatarUrl={m.user?.avatarUrl} seed={m.id} size="md" className="border-2 border-white/40" />
                ))}
                {trip.members.length > 4 && (
                  <div className="w-7 h-7 rounded-full bg-black/30 text-white border-2 border-white/40 flex items-center justify-center text-[10px] font-bold shrink-0">
                    +{trip.members.length - 4}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto pt-6">
              <p className="text-white/65 text-[11px] font-bold tracking-widest uppercase mb-1">
                {trip.destination}
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-[1.1] break-words">
                {trip.name}
              </h1>
              <div className="flex items-center gap-x-4 gap-y-1 mt-3 text-[12px] text-white/85 flex-wrap font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(parseDateOnly(trip.startDate), "d MMM")} – {format(parseDateOnly(trip.endDate), "d MMM")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  {t("trip.nightsCount", { nights })}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {t("trip.crewCount", { count: trip.members.length })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Plan-first primary actions. P5 "Plan this day" leads; the multi-day
            wizard sits beside it as a calmer secondary (balanced 2:1, not a
            giant bar next to a tiny chip). */}
        <div className="flex items-stretch gap-2.5">
          <button
            type="button"
            onClick={() => setPlanDayOpen(true)}
            className="flex-[2] inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-violet-600 text-white px-4 py-3 text-sm font-bold shadow-md shadow-primary/20 hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-4 h-4" />
            {t("planDay.cta")}
          </button>
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl ring-1 ring-border/70 bg-card hover:bg-muted/50 px-4 py-3 text-sm font-bold transition-colors"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            {t("itinerary.aiPlan")}
          </button>
        </div>

        {/* Up next — the single smart router (calm, one accent). */}
        <Link
          href={suggestion.href}
          className="group flex items-center gap-3.5 rounded-2xl ring-1 ring-border/60 bg-card p-4 hover:ring-border hover:shadow-md transition-all"
        >
          <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <suggestion.icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                {t("common.upNext")}
              </span>
              {suggestion.urgent && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-2.5 h-2.5" />
                  {t("common.needsYou")}
                </span>
              )}
            </div>
            <p className="font-bold text-sm leading-snug truncate">{suggestion.title}</p>
            <p className="text-xs text-muted-foreground truncate">{suggestion.body}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 rtl:rotate-180" />
        </Link>

        {/* Snapshot — quiet, scannable trip metrics; each links to its page.
            Replaces the loud 6-card grid that made the overview feel busy. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <StatTile
            href={`/trips/${trip.id}/itinerary`}
            icon={Calendar}
            accent="text-blue-600 dark:text-blue-400 bg-blue-500/10"
            value={`${stats.daysWithItems}/${stats.totalDays}`}
            label={t("overview.daysPlanned")}
          />
          <StatTile
            href={`/trips/${trip.id}/itinerary`}
            icon={MapPin}
            accent="text-cyan-600 dark:text-cyan-400 bg-cyan-500/10"
            value={String(stats.itineraryCount)}
            label={t("overview.places")}
          />
          <StatTile
            href={`/trips/${trip.id}/expenses`}
            icon={Wallet}
            accent="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
            value={`${stats.currency} ${fmtAmount(stats.totalSpent)}`}
            label={t("overview.spent")}
          />
          <StatTile
            href={`/trips/${trip.id}/pack?view=packing`}
            icon={Backpack}
            accent="text-amber-600 dark:text-amber-400 bg-amber-500/10"
            value={stats.packingTotal > 0 ? `${stats.packingPacked}/${stats.packingTotal}` : "—"}
            label={t("overview.packed")}
          />
        </div>

        {/* Discover nudge — quiet, single line. */}
        <Link
          href={`/trips/${trip.id}/discover`}
          className="group flex items-center gap-3 rounded-2xl ring-1 ring-cyan-500/20 bg-gradient-to-r from-cyan-500/[0.06] to-transparent p-3.5 hover:ring-cyan-500/40 transition-all"
        >
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">{t("cards.discover")}</p>
            <p className="text-[11px] text-muted-foreground truncate">{t("cards.discoverHeadline")}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0 rtl:rotate-180" />
        </Link>
      </div>

      {/* ── Right rail — crew + invite ─────────────────────────────────── */}
      <div className="space-y-6 lg:sticky lg:top-6">
        <div className="rounded-2xl ring-1 ring-border/60 bg-card p-5">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <h3 className="font-bold text-sm">{t("trip.crewCount", { count: trip.members.length })}</h3>
            </div>
            <Link
              href={`/trips/${trip.id}/members`}
              className="text-[11px] font-bold tracking-wider uppercase text-primary hover:text-primary/80"
            >
              {t("trip.manage")}
            </Link>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-none mb-4">
            {trip.members.map((member) => (
              <button
                type="button"
                key={member.id}
                onClick={() => setStatsMember(member)}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full ring-1 ring-border/70 bg-background hover:ring-primary/40 hover:bg-primary/5 ps-1 pe-2.5 py-1 transition-colors"
                title={member.displayName}
              >
                <UserAvatar name={member.displayName} avatarUrl={member.user?.avatarUrl} seed={member.id} size="xs" />
                <span className="text-[11px] font-medium truncate max-w-[110px]">{member.displayName}</span>
                {member.role === "owner" && (
                  <span className="text-[9px] font-bold tracking-wider uppercase text-amber-600 dark:text-amber-400">
                    {t("trip.owner")}
                  </span>
                )}
              </button>
            ))}
          </div>

          {inviteUrl ? (
            <div className="flex items-center gap-2 rounded-xl ring-1 ring-border/70 bg-muted/30 ps-3 pe-1 py-1">
              <Link2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-[11px] text-muted-foreground truncate font-mono flex-1">
                {inviteUrl.replace(/^https?:\/\//, "")}
              </span>
              <button
                type="button"
                onClick={copyInviteLink}
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  copied ? "bg-emerald-600 text-white" : "bg-gradient-to-r from-primary to-violet-600 text-white hover:opacity-90"
                }`}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? t("common.copied") : t("trip.copyInvite")}
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">{t("trip.noInviteToken")}</p>
          )}
        </div>
      </div>

      {/* Lazy-mounted panels */}
      {aiOpen && (
        <AiPlannerPanel open={aiOpen} onClose={() => setAiOpen(false)} tripId={trip.id} destination={trip.destination} />
      )}
      {planDayOpen && (
        <PlanDaySheet
          open={planDayOpen}
          onClose={() => setPlanDayOpen(false)}
          tripId={trip.id}
          days={days}
          initialDay={days[0] ?? null}
          crewSize={trip.members.length}
          isOwner={isOwner}
        />
      )}

      <MemberStatsSheet
        open={statsMember !== null}
        onClose={() => setStatsMember(null)}
        tripId={trip.id}
        member={
          statsMember
            ? {
                userId: statsMember.userId ?? statsMember.user?.id ?? statsMember.id,
                displayName: statsMember.displayName,
                avatarUrl: statsMember.user?.avatarUrl ?? null,
                role: statsMember.role,
              }
            : null
        }
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

function StatTile({
  href, icon: Icon, accent, value, label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  value: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl ring-1 ring-border/60 bg-card p-3.5 sm:p-4 hover:ring-border hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2.5 ${accent}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-lg sm:text-xl font-extrabold tabular-nums tracking-tight truncate">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{label}</p>
    </Link>
  );
}

/**
 * One-time onboarding strip explaining the Plan → Book → Wallet loop.
 * Dismissible, persisted per-user in localStorage.
 */
function FirstRunOnboarding({ tripId }: { tripId: string }) {
  const t = useT();
  const searchParams = useSearchParams();
  const showPreview = true;
  void searchParams;
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!showPreview) return;
    const seen = localStorage.getItem("paxawa.onboarding.bookingLoop.seen");
    setDismissed(seen === "1");
  }, [showPreview]);

  function dismiss() {
    localStorage.setItem("paxawa.onboarding.bookingLoop.seen", "1");
    setDismissed(true);
  }

  if (!showPreview || dismissed) return null;

  return (
    <div className="relative rounded-2xl ring-1 ring-primary/25 bg-gradient-to-br from-primary/5 via-violet-500/5 to-fuchsia-500/5 p-4 overflow-hidden">
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-2 end-2 w-7 h-7 rounded-full hover:bg-foreground/10 flex items-center justify-center"
        aria-label={t("affiliate.dismiss")}
      >
        <XIcon className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      <p className="text-[10px] font-bold tracking-widest uppercase text-primary mb-2">
        {t("onboarding.howItWorks")}
      </p>
      <ol className="space-y-2">
        <li className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0 mt-0.5">
            <MapIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">{t("onboarding.step1Title")}</p>
            <p className="text-[11px] text-muted-foreground">{t("onboarding.step1Body")}</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0 mt-0.5">
            <CardIcon className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">{t("onboarding.step2Title")}</p>
            <p className="text-[11px] text-muted-foreground">{t("onboarding.step2Body")}</p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
            <WalletIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">
              <Link href={`/trips/${tripId}/wallet`} className="hover:underline">
                {t("onboarding.step3Title")}
              </Link>
            </p>
            <p className="text-[11px] text-muted-foreground">{t("onboarding.step3Body")}</p>
          </div>
        </li>
      </ol>
    </div>
  );
}
