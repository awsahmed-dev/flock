"use client";

import Link from "next/link";
import {
  Calendar,
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
}

interface Props {
  tripId: string;
  stats: ActionHubStats;
}

export function TripActionHub({ tripId, stats }: Props) {
  const suggestion = pickSuggestion(tripId, stats);

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
                Up next
              </span>
              {suggestion.urgent && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-2.5 h-2.5" />
                  Needs you
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
          <ArrowRight className="w-4 h-4 text-primary shrink-0 mt-2 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>

      {/* Action grid — 2x2 on mobile, 4 wide on desktop. Each card opens
          the corresponding tab. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <ActionCard
          href={`/trips/${tripId}/itinerary`}
          icon={Calendar}
          color="blue"
          label="Plan"
          headline={
            stats.itineraryCount === 0
              ? "Empty"
              : `${stats.itineraryCount} item${stats.itineraryCount !== 1 ? "s" : ""}`
          }
          subline={
            stats.itineraryCount === 0
              ? "Start with AI"
              : stats.daysWithItems < stats.totalDays
                ? `${stats.totalDays - stats.daysWithItems} day${stats.totalDays - stats.daysWithItems !== 1 ? "s" : ""} empty`
                : "All days covered"
          }
          warn={stats.itineraryCount === 0}
        />
        <ActionCard
          href={`/trips/${tripId}/votes`}
          icon={Vote}
          color="violet"
          label="Decide"
          headline={
            stats.votesOpen > 0
              ? `${stats.votesOpen} open`
              : stats.votesResolved > 0
                ? `${stats.votesResolved} resolved`
                : "No votes"
          }
          subline={
            stats.votesOpen > 0
              ? "Needs your vote"
              : stats.votesResolved > 0
                ? "All decided"
                : "Settle a debate"
          }
          urgent={stats.votesOpen > 0}
        />
        <ActionCard
          href={`/trips/${tripId}/expenses`}
          icon={Wallet}
          color="emerald"
          label="Money"
          headline={
            stats.expensesCount === 0
              ? "No expenses"
              : `${stats.currency} ${fmtAmount(stats.totalSpent)}`
          }
          subline={
            stats.expensesCount === 0
              ? "Log your first"
              : stats.myUnsettled > 0
                ? `You owe ${stats.currency} ${fmtAmount(stats.myUnsettled)}`
                : "You're settled"
          }
          urgent={stats.myUnsettled > 0}
        />
        <ActionCard
          href={`/trips/${tripId}/pack?view=packing`}
          icon={Backpack}
          color="amber"
          label="Pack"
          headline={
            stats.packingTotal === 0
              ? "Empty list"
              : `${stats.packingPacked}/${stats.packingTotal}`
          }
          subline={
            stats.packingTotal === 0
              ? "Start with suggestions"
              : stats.packingPacked >= stats.packingTotal
                ? "All packed"
                : `${Math.round((stats.packingPacked / stats.packingTotal) * 100)}% packed`
          }
          warn={stats.packingTotal === 0}
        />
      </div>

      {/* Secondary row — chat + documents */}
      <div className="grid grid-cols-2 gap-2.5">
        <ActionCard
          href={`/trips/${tripId}/chat`}
          icon={MessageSquare}
          color="fuchsia"
          label="Chat"
          headline="Talk"
          subline="AI watches for actions"
          compact
        />
        <ActionCard
          href={`/trips/${tripId}/pack?view=docs`}
          icon={FileText}
          color="slate"
          label="Docs"
          headline={
            stats.documentsCount === 0
              ? "Empty"
              : `${stats.documentsCount} file${stats.documentsCount !== 1 ? "s" : ""}`
          }
          subline={
            stats.documentsCount === 0 ? "Visa, bookings, photos" : "Files + photos"
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
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "violet" | "emerald" | "amber" | "fuchsia" | "slate";
  label: string;
  headline: string;
  subline: string;
  warn?: boolean;
  urgent?: boolean;
  compact?: boolean;
}) {
  const colors = ACTION_COLORS[color];
  return (
    <Link
      href={href}
      className={`group block rounded-2xl border ${
        urgent
          ? "border-amber-500/40 bg-amber-500/[0.04]"
          : "border-border bg-card hover:border-foreground/15"
      } ${compact ? "p-3" : "p-4"} transition-colors`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div
          className={`w-7 h-7 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}
        >
          <Icon className={`w-3.5 h-3.5 ${colors.icon}`} />
        </div>
        <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
          {label}
        </span>
        {urgent && (
          <span className="ml-auto inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        )}
      </div>
      <p
        className={`font-bold ${compact ? "text-sm" : "text-base"} tracking-tight leading-snug truncate ${
          warn ? "text-muted-foreground" : "text-foreground"
        }`}
      >
        {headline}
      </p>
      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
        {subline}
      </p>
    </Link>
  );
}

const ACTION_COLORS: Record<
  string,
  { bg: string; icon: string }
> = {
  blue: { bg: "bg-blue-500/15", icon: "text-blue-600 dark:text-blue-400" },
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

function pickSuggestion(tripId: string, s: ActionHubStats): Suggestion {
  // Priority order:
  //   1. Open votes → cast yours
  //   2. Unsettled balance → check what you owe
  //   3. Empty itinerary → draft with AI
  //   4. Itinerary has gaps → fill empty days
  //   5. Empty packing → start with suggestions
  //   6. Default — chat with the crew

  if (s.votesOpen > 0) {
    return {
      title: `${s.votesOpen} vote${s.votesOpen !== 1 ? "s" : ""} need your input`,
      body: "Cast your vote so the group can move on.",
      href: `/trips/${tripId}/votes`,
      icon: Vote,
      urgent: true,
    };
  }
  if (s.myUnsettled > 0) {
    return {
      title: `You owe ${s.currency} ${fmtAmount(s.myUnsettled)}`,
      body: "Check the splits and settle when you can.",
      href: `/trips/${tripId}/expenses`,
      icon: Wallet,
      urgent: true,
    };
  }
  if (s.itineraryCount === 0) {
    return {
      title: "Your itinerary is empty",
      body: "Let AI draft a day-by-day plan in seconds.",
      href: `/trips/${tripId}/itinerary`,
      icon: Sparkles,
      urgent: false,
    };
  }
  if (s.daysWithItems < s.totalDays) {
    const empty = s.totalDays - s.daysWithItems;
    return {
      title: `${empty} day${empty !== 1 ? "s" : ""} still empty`,
      body: "Drop in activities or let AI fill the gaps.",
      href: `/trips/${tripId}/itinerary`,
      icon: Calendar,
      urgent: false,
    };
  }
  if (s.packingTotal === 0) {
    return {
      title: "Start your packing list",
      body: "Seed with suggestions, then customize by member.",
      href: `/trips/${tripId}/pack?view=packing`,
      icon: Backpack,
      urgent: false,
    };
  }
  return {
    title: "Everything's in order",
    body: "Hop into chat to keep the crew in the loop.",
    href: `/trips/${tripId}/chat`,
    icon: MessageSquare,
    urgent: false,
  };
}
