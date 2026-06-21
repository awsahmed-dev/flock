"use client";

import Link from "next/link";
import {
  Calendar,
  Compass,
  Vote,
  Wallet,
  Backpack,
  FileText,
  MessageSquare,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { fmtAmount } from "@/lib/numerals";
import { useT } from "@/components/i18n/locale-provider";
import { useSearchParams } from "next/navigation";
import { CreditCard } from "lucide-react";

/**
 * Trip Action Hub — rebuild of the trip overview's "what can I do here?"
 * surface (B2-2).
 *
 * Replaces the previous pill row (icon + label only) with full-bleed action
 * cards that show live state — total counts, what's pending, what's
 * missing. Tester 2 said "I didn't know there was a vote feature" because
 * the old layout showed nothing about what was inside.
 *
 * The first card is a "Smart Suggestion" — picks the most-urgent action
 * from the trip state and links straight to it.
 */

export interface ActionHubStats {
  itineraryCount: number;
  /** Number of trip days with at least one item — drives the "Day N is empty"
   *  call-out. */
  daysWithItems: number;
  totalDays: number;
  votesOpen: number;
  votesResolved: number;
  expensesCount: number;
  currency: string;
  totalSpent: number;
  myUnsettled: number;
  packingPacked: number;
  packingTotal: number;
  documentsCount: number;
  /** B22: how many people are on this trip. Drives copy decisions like
   *  hiding "Settle a debate" on solo trips where voting makes no sense. */
  memberCount: number;
}

interface Props {
  tripId: string;
  stats: ActionHubStats;
}

export function TripActionHub({ tripId, stats }: Props) {
  const t = useT();
  const searchParams = useSearchParams();
  // B17 (audit fix #2): promote Wallet to the action grid so it's a
  // first-class object alongside Plan/Decide/Money/Pack. Preview-gated
  // for now; ships to everyone once the booking flow is fully wired.
  // B18: Wallet ships to everyone. Preview gate removed.
  const showWallet = true;
  void searchParams;
  const suggestion = pickSuggestion(tripId, stats, t);

  return (
    <div className="space-y-3">
      {/* Smart suggestion — directs the user to the highest-leverage thing. */}
      <Link
        href={suggestion.href}
        className="group block relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-violet-500/8 to-fuchsia-500/8 p-4 hover:from-primary/15 hover:via-violet-500/12 hover:to-fuchsia-500/12 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <suggestion.icon className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold tracking-widest uppercase text-primary">
                {t("common.upNext")}
              </span>
              {suggestion.urgent && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-2.5 h-2.5" />
                  {t("common.needsYou")}
                </span>
              )}
            </div>
            <p className="font-bold text-sm leading-snug truncate">
              {suggestion.title}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {suggestion.body}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-2 group-hover:translate-x-0.5 transition-transform rtl:rotate-180" />
        </div>
      </Link>

      {/* Action grid — 2 cols on mobile, 3 on lg (~1280px content area),
          5 on xl when the wallet card is enabled. lg-grid-cols-5 jammed
          5 cards into ~900px each = 180px-wide cards that read like
          phone tiles. */}
      <div className={`grid grid-cols-2 lg:grid-cols-3 ${showWallet ? "xl:grid-cols-5" : "xl:grid-cols-4"} gap-3 lg:gap-4`}>
        <ActionCard
          href={`/trips/${tripId}/itinerary`}
          icon={Calendar}
          color="blue"
          label={t("cards.plan")}
          headline={
            stats.itineraryCount === 0
              ? t("cards.planStartWithAi")
              : t("cards.planItems", { count: stats.itineraryCount })
          }
          subline=""
          warn={stats.itineraryCount === 0}
          progress={
            stats.totalDays > 0
              ? Math.round((stats.daysWithItems / stats.totalDays) * 100)
              : undefined
          }
        />
        <ActionCard
          href={`/trips/${tripId}/discover`}
          icon={Compass}
          color="cyan"
          label={t("cards.discover")}
          headline={t("cards.discoverHeadline")}
          subline=""
        />
        <ActionCard
          href={`/trips/${tripId}/decisions`}
          icon={Vote}
          color="violet"
          label={t("cards.decide")}
          headline={
            stats.votesOpen > 0
              ? t("cards.decideOpen", { count: stats.votesOpen })
              : stats.memberCount > 1
                ? t("cards.decideNoVotes")
                : t("cards.decideSoloEmpty")
          }
          subline={
            stats.votesOpen > 0
              ? t("cards.decideNeedsYourVote")
              : ""
          }
          urgent={stats.votesOpen > 0}
        />
        <ActionCard
          href={`/trips/${tripId}/expenses`}
          icon={Wallet}
          color="emerald"
          label={t("cards.money")}
          headline={
            stats.expensesCount === 0
              ? t("cards.moneyLogYourFirst")
              : stats.myUnsettled > 0
                ? `${t("expenses.youOwe")} ${stats.currency} ${fmtAmount(stats.myUnsettled)}`
                : `${stats.currency} ${fmtAmount(stats.totalSpent)}`
          }
          subline=""
          urgent={stats.myUnsettled > 0}
          progress={moneyProgress(stats)}
        />
        <ActionCard
          href={`/trips/${tripId}/pack?view=packing`}
          icon={Backpack}
          color="amber"
          label={t("cards.pack")}
          headline={
            stats.packingTotal === 0
              ? t("cards.planEmpty")
              : t("cards.packCount", { packed: stats.packingPacked, total: stats.packingTotal })
          }
          subline=""
          warn={stats.packingTotal === 0}
          progress={
            stats.packingTotal > 0
              ? Math.round((stats.packingPacked / stats.packingTotal) * 100)
              : undefined
          }
        />
        {showWallet && (
          <ActionCard
            href={`/trips/${tripId}/wallet`}
            icon={CreditCard}
            color="fuchsia"
            label={t("cards.wallet")}
            headline={t("cards.walletSubline")}
            subline=""
          />
        )}
      </div>

      {/* Secondary row — chat + documents */}
      <div className="grid grid-cols-2 gap-2.5">
        <ActionCard
          href={`/trips/${tripId}/chat`}
          icon={MessageSquare}
          color="fuchsia"
          label={t("actionHub.chatLabel")}
          headline={t("actionHub.chatHeadline")}
          subline={t("actionHub.chatSubline")}
          compact
        />
        <ActionCard
          href={`/trips/${tripId}/pack?view=docs`}
          icon={FileText}
          color="slate"
          label={t("actionHub.docsLabel")}
          headline={
            stats.documentsCount === 0
              ? t("actionHub.docsEmpty")
              : t("actionHub.docsCount", { count: stats.documentsCount })
          }
          subline={
            stats.documentsCount === 0
              ? t("actionHub.docsEmptySubline")
              : t("actionHub.docsSubline")
          }
          compact
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

function ActionCard({
  href,
  icon: Icon,
  color,
  label,
  headline,
  subline,
  warn,
  urgent,
  compact,
  progress,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "violet" | "emerald" | "amber" | "fuchsia" | "slate" | "cyan";
  label: string;
  headline: string;
  subline: string;
  warn?: boolean;
  urgent?: boolean;
  compact?: boolean;
  /** 0–100 percentage shown as a tiny tracker bar at the bottom of the
   *  card. Used by Pack (packed %), Money (budget spend %), Plan
   *  (days-with-items %) to replace dead text with a visual signal. */
  progress?: number;
}) {
  const colors = ACTION_COLORS[color];
  return (
    <Link
      href={href}
      className={`group block rounded-2xl ring-1 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
        urgent
          ? "ring-amber-500/40 bg-amber-500/[0.04]"
          : "ring-border/60 bg-card hover:ring-border"
      } ${compact ? "p-3" : "p-3.5"} transition-all duration-200`}
    >
      <div className="flex items-center gap-2 mb-1">
        <div
          className={`w-6 h-6 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}
        >
          <Icon className={`w-3 h-3 ${colors.icon}`} />
        </div>
        <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
          {label}
        </span>
        {urgent && (
          <span className="ms-auto inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        )}
      </div>
      <p
        className={`font-bold ${compact ? "text-[13px]" : "text-sm"} tracking-tight leading-tight truncate ${
          warn ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {headline}
      </p>
      {/* B18: removed the dedicated subline row — the action grid now
          renders as a 2-line card (label + headline) plus an optional
          progress tracker bar. Subline content (e.g. "Days empty",
          "% packed") is collapsed into the headline string itself. */}
      {progress !== undefined && (
        <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${TRACKER_BAR[color]} transition-all duration-500`}
            style={{ width: `${Math.max(2, Math.min(100, progress))}%` }}
          />
        </div>
      )}
      {progress === undefined && subline && (
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
          {subline}
        </p>
      )}
    </Link>
  );
}

/** Money tracker: total spent vs the per-trip budget cap. If the trip
 *  has no budget set, fall back to a "completeness" signal (expensesCount
 *  → diminishing returns up to 80%). */
function moneyProgress(stats: ActionHubStats): number | undefined {
  // We don't have budgetTotal on stats; for now use a soft signal based
  // on expensesCount so the bar still feels alive. Once we wire budget
  // into stats, replace with (totalSpent / budgetTotal) * 100.
  if (stats.expensesCount === 0) return undefined;
  // Asymptotic toward 100% so the bar grows with usage.
  return Math.min(100, Math.round(60 + Math.min(40, stats.expensesCount * 4)));
}

const TRACKER_BAR: Record<string, string> = {
  blue: "from-blue-400 to-indigo-500",
  cyan: "from-cyan-400 to-blue-500",
  violet: "from-violet-400 to-purple-500",
  emerald: "from-emerald-400 to-teal-500",
  amber: "from-amber-400 to-orange-500",
  fuchsia: "from-fuchsia-400 to-pink-500",
  slate: "from-slate-400 to-slate-500",
};

const ACTION_COLORS: Record<
  string,
  { bg: string; icon: string }
> = {
  blue: { bg: "bg-blue-500/15", icon: "text-blue-600 dark:text-blue-400" },
  cyan: { bg: "bg-cyan-500/15", icon: "text-cyan-600 dark:text-cyan-400" },
  violet: {
    bg: "bg-violet-500/15",
    icon: "text-violet-600 dark:text-violet-400",
  },
  emerald: {
    bg: "bg-emerald-500/15",
    icon: "text-emerald-600 dark:text-emerald-400",
  },
  amber: {
    bg: "bg-amber-500/15",
    icon: "text-amber-600 dark:text-amber-400",
  },
  fuchsia: {
    bg: "bg-fuchsia-500/15",
    icon: "text-fuchsia-600 dark:text-fuchsia-400",
  },
  slate: { bg: "bg-slate-500/15", icon: "text-slate-500" },
};

/* ─── Smart suggestion picker ─────────────────────────────────────────── */

interface Suggestion {
  title: string;
  body: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  urgent: boolean;
}

// B15-i: pickSuggestion accepts the translator so the smart-suggestion
// title + body follow the active locale. The function isn't a React
// component so it can't call useT() itself.
function pickSuggestion(
  tripId: string,
  s: ActionHubStats,
  t: (k: string, p?: Record<string, string | number>) => string,
): Suggestion {
  // Priority order:
  //   1. Open votes → cast yours
  //   2. Unsettled balance → check what you owe
  //   3. Empty itinerary → draft with AI
  //   4. Itinerary has gaps → fill empty days
  //   5. Empty packing → start with suggestions
  //   6. Default — chat with the crew

  if (s.votesOpen > 0) {
    return {
      title: t("actionHub.sgVotesOpenTitle", { count: s.votesOpen }),
      body: t("actionHub.sgVotesOpenBody"),
      href: `/trips/${tripId}/decisions`,
      icon: Vote,
      urgent: true,
    };
  }
  if (s.myUnsettled > 0) {
    return {
      title: t("actionHub.sgUnsettledTitle", {
        currency: s.currency,
        amount: fmtAmount(s.myUnsettled),
      }),
      body: t("actionHub.sgUnsettledBody"),
      href: `/trips/${tripId}/expenses`,
      icon: Wallet,
      urgent: true,
    };
  }
  if (s.itineraryCount === 0) {
    return {
      title: t("actionHub.sgItineraryEmptyTitle"),
      body: t("actionHub.sgItineraryEmptyBody"),
      href: `/trips/${tripId}/itinerary`,
      icon: Sparkles,
      urgent: false,
    };
  }
  if (s.daysWithItems < s.totalDays) {
    const empty = s.totalDays - s.daysWithItems;
    return {
      title: t("actionHub.sgDaysEmptyTitle", { count: empty }),
      body: t("actionHub.sgDaysEmptyBody"),
      href: `/trips/${tripId}/itinerary`,
      icon: Calendar,
      urgent: false,
    };
  }
  if (s.packingTotal === 0) {
    return {
      title: t("actionHub.sgPackingEmptyTitle"),
      body: t("actionHub.sgPackingEmptyBody"),
      href: `/trips/${tripId}/pack?view=packing`,
      icon: Backpack,
      urgent: false,
    };
  }
  return {
    title: t("actionHub.sgAllDoneTitle"),
    body: t("actionHub.sgAllDoneBody"),
    href: `/trips/${tripId}/chat`,
    icon: MessageSquare,
    urgent: false,
  };
}
