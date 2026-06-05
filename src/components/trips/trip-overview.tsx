"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Check,
  Users,
  Calendar,
  Wallet,
  ArrowRight,
  Clock,
  Link2,
  Sparkles,
  Hotel,
} from "lucide-react";
import { parseISO, differenceInDays, isPast, isFuture, differenceInCalendarDays } from "date-fns";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import Link from "next/link";
import { toast } from "sonner";
import { AiPlannerPanel } from "./ai-planner-panel";
import { HotelSearchPanel } from "@/components/hotels/hotel-search-panel";
import { TripActionHub, type ActionHubStats } from "./trip-action-hub";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Map as MapIcon, CreditCard as CardIcon, Wallet as WalletIcon, X as XIcon } from "lucide-react";
import { useT, useLocale } from "@/components/i18n/locale-provider";

interface Member {
  id: string;
  displayName: string;
  role: "owner" | "member";
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
}

const AVATAR_COLORS = [
  { bg: "bg-blue-500", text: "text-white" },
  { bg: "bg-violet-500", text: "text-white" },
  { bg: "bg-emerald-500", text: "text-white" },
  { bg: "bg-amber-500", text: "text-white" },
  { bg: "bg-rose-500", text: "text-white" },
  { bg: "bg-cyan-500", text: "text-white" },
];

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

function getMemberColor(id: string) {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// B15-e: status label now takes a translator so the hero pill follows
// the active locale ("In 38 days" / "بعد 38 يوم").
function getTripStatus(
  startDate: string,
  endDate: string,
  t: (k: string, p?: Record<string, string | number>) => string,
) {
  const now = new Date();
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (now >= start && now <= end) return { label: t("trip.happeningNow"), color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" };
  if (isPast(end)) return { label: t("trip.past"), color: "bg-slate-500/20 text-slate-300 border-slate-500/30" };
  const days = differenceInCalendarDays(start, now);
  return {
    label: t("trip.startsIn", { days }),
    color: "bg-blue-500/20 text-blue-200 border-blue-500/30",
  };
}

export function TripOverview({ trip, inviteUrl, stats }: Props) {
  const t = useT();
  // locale kept for future affiliate prefill; no longer needed on this
  // screen now that affiliate strips moved into Plan/Book mode.
  useLocale();
  const [copied, setCopied] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [hotelOpen, setHotelOpen] = useState(false);

  const nights = differenceInDays(parseDateOnly(trip.endDate), parseDateOnly(trip.startDate));
  const gradient = getGradient(trip.id);
  const tripStatus = getTripStatus(trip.startDate, trip.endDate, t);

  async function copyInviteLink() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success(t("common.copied"));
    setTimeout(() => setCopied(false), 2000);
  }

  // navLinks removed — the previous 4-tile grid duplicated the bottom-nav
  // tabs. High-frequency tabs live in the bottom nav; less-frequent views
  // (Crew / Docs / Map / Photos) are reachable via the pill row under
  // the hero card.

  return (
    <div className="space-y-6">
      {/* ── Hero card ──────────────────────────────────────────────────
          B4: trimmed ~30% in height. Padding tightened, status pip lives
          inline with destination, meta row collapses to 2 lines on
          narrow screens with smaller text. The orbs are smaller and
          fewer so the card reads as a header strip rather than a poster. */}
      <div className={`relative rounded-2xl bg-gradient-to-br ${gradient} overflow-hidden`}>
        {/* Decorative orbs */}
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -left-4 bottom-0 w-20 h-20 rounded-full bg-black/8 pointer-events-none" />

        <div className="relative z-10 px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              {/* Destination + status on one line */}
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="text-white/60 text-[10px] font-bold tracking-widest uppercase">
                  {trip.destination}
                </p>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${tripStatus.color}`}>
                  <span className="w-1 h-1 rounded-full bg-current" />
                  {tripStatus.label}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight break-words">
                {trip.name}
              </h1>
              {/* Meta row — single horizontal-scroll line on mobile */}
              <div className="flex items-center gap-3 mt-2 text-[11px] text-white/80 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {/* B15-f: date-fns ar locale resolves month names to
                      Arabic via the active-locale module state set by
                      the root layout / locale provider. Pattern stays
                      "d MMM" so the order reads naturally in both
                      languages (day, then month). */}
                  {format(parseDateOnly(trip.startDate), "d MMM")} – {format(parseDateOnly(trip.endDate), "d MMM")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {t("trip.nightsCount", { nights })}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {trip.members.length}
                </span>
                {trip.budgetTotal && (
                  <span className="inline-flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    {trip.currency} {trip.budgetTotal.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Member stack — smaller avatars to match the shorter hero */}
            <div className="flex items-center -space-x-1.5 shrink-0">
              {trip.members.slice(0, 4).map((m) => {
                const c = getMemberColor(m.id);
                return (
                  <div
                    key={m.id}
                    title={m.displayName}
                    className={`w-7 h-7 rounded-full ${c.bg} ${c.text} border-2 border-white/30 flex items-center justify-center text-[10px] font-bold shrink-0`}
                  >
                    {m.displayName.slice(0, 2).toUpperCase()}
                  </div>
                );
              })}
              {trip.members.length > 4 && (
                <div className="w-7 h-7 rounded-full bg-black/25 text-white border-2 border-white/30 flex items-center justify-center text-[10px] font-bold shrink-0">
                  +{trip.members.length - 4}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Action Hub — the "what can I do here?" surface (B2-2). Replaces
          the old icon-only pill row that hid feature discoverability
          (Tester 2: "I didn't know there was a vote feature"). Each card
          now surfaces live state — counts, what's pending, what's
          missing — and the Up-next card directs to the highest-leverage
          action right now. */}
      {/* B17 (audit fix): Overview now hosts ONLY the calm modules — hero,
          Up Next, action grid, recent activity, crew. The affiliate
          strips + Bookings rail that previously lived here were moved
          into Plan/Book mode (the single source of truth for "things to
          book") and the Wallet tab (the single source of truth for
          "things already booked"). This collapses the 4-entry-point
          confusion into a clean Plan → Book → Wallet loop. */}

      <FirstRunOnboarding tripId={trip.id} />

      <TripActionHub tripId={trip.id} stats={stats} />

      {/* ── Smart tools ─────────────────────────────────────────────
          B4: tightened tiles. The dramatic gradient/icon scale that
          made these tower over the Action Hub is dialed back so they
          read as a continuation of the dashboard, not a competing
          surface. */}
      <div className="grid sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setAiOpen(true)}
          className="group text-left rounded-2xl border border-primary/20 hover:border-primary/40 bg-gradient-to-br from-primary/5 to-violet-500/5 hover:shadow-md hover:shadow-primary/10 transition-all p-3 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">{t("itinerary.aiPlan")}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {trip.destination}
            </p>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0 rtl:rotate-180" />
        </button>

        <button
          type="button"
          onClick={() => setHotelOpen(true)}
          className="group text-left rounded-2xl border border-blue-500/20 hover:border-blue-500/40 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 hover:shadow-md hover:shadow-blue-500/10 transition-all p-3 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0">
            <Hotel className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">{t("itinerary.findAStay")}</p>
            <p className="text-[11px] text-muted-foreground truncate">
              {trip.destination}
            </p>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform shrink-0 rtl:rotate-180" />
        </button>
      </div>

      {/* ── Crew + invite ───────────────────────────────────────────
          B4: merged into one card. Two side-by-side cards (one for
          listing, one for inviting) was the redundancy testers
          flagged. Now: roster on top, invite link as a compact action
          row below — one card, one mental model. */}
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="flex items-center justify-between mb-3">
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

        {/* Roster — horizontal-scroll chips so the card doesn't grow
            unbounded with big groups. */}
        <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-none mb-3">
          {trip.members.map((member) => {
            const c = getMemberColor(member.id);
            return (
              <div
                key={member.id}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-background ps-1 pe-2.5 py-1"
                title={member.displayName}
              >
                <div className={`w-5 h-5 rounded-full ${c.bg} ${c.text} flex items-center justify-center text-[9px] font-bold shrink-0`}>
                  {member.displayName.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-[11px] font-medium truncate max-w-[110px]">
                  {member.displayName}
                </span>
                {member.role === "owner" && (
                  <span className="text-[9px] font-bold tracking-wider uppercase text-amber-600 dark:text-amber-400">
                    {t("trip.owner")}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Invite row */}
        {inviteUrl ? (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 ps-3 pe-1 py-1">
            <Link2 className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[11px] text-muted-foreground truncate font-mono flex-1">
              {inviteUrl.replace(/^https?:\/\//, "")}
            </span>
            <button
              type="button"
              onClick={copyInviteLink}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-gradient-to-r from-primary to-violet-600 text-white hover:opacity-90"
              }`}
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy invite"}
            </button>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground italic">No invite token set.</p>
        )}
      </div>

      {/* Panels */}
      <AiPlannerPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        tripId={trip.id}
        destination={trip.destination}
      />
      <HotelSearchPanel
        open={hotelOpen}
        onClose={() => setHotelOpen(false)}
        tripId={trip.id}
        destination={trip.destination}
      />
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

/**
 * B17 (audit fix #6): one-time onboarding strip that explains the
 * Plan → Book → Wallet loop so first-time users understand the mental
 * model without us writing docs. Three lines, dismissible. Persists
 * the dismissal per-user in localStorage so it never reappears.
 *
 * Currently preview-gated behind ?previewAffiliate=1 — flips on for
 * everyone once we sign the affiliate programs.
 */
function FirstRunOnboarding({ tripId }: { tripId: string }) {
  const t = useT();
  const searchParams = useSearchParams();
  const showPreview = searchParams?.get("previewAffiliate") === "1";
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
    <div className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-violet-500/5 to-fuchsia-500/5 p-4 overflow-hidden">
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
            <p className="text-[11px] text-muted-foreground">
              {t("onboarding.step1Body")}
            </p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0 mt-0.5">
            <CardIcon className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">{t("onboarding.step2Title")}</p>
            <p className="text-[11px] text-muted-foreground">
              {t("onboarding.step2Body")}
            </p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
            <WalletIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">
              <Link
                href={`/trips/${tripId}/wallet?previewAffiliate=1`}
                className="hover:underline"
              >
                {t("onboarding.step3Title")}
              </Link>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t("onboarding.step3Body")}
            </p>
          </div>
        </li>
      </ol>
    </div>
  );
}
