import {
  Calendar,
  Vote,
  Wallet,
  Backpack,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import { fmtAmount } from "@/lib/numerals";

/**
 * Single source of truth for the Overview's "Up Next" smart router
 * (P1-3). This used to live inside `trip-action-hub.tsx` alongside a
 * second, near-duplicate inline implementation in the Overview. The
 * action-hub component was orphaned (never rendered — only its
 * `pickSuggestion` helper + `ActionHubStats` type were imported), so it
 * was deleted and the shared logic now lives here, imported by the one
 * surface that uses it.
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
  /** How many people are on this trip. Drives copy decisions like hiding
   *  "Settle a debate" on solo trips where voting makes no sense. */
  memberCount: number;
}

export interface Suggestion {
  title: string;
  body: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  urgent: boolean;
}

// B15-i: pickSuggestion accepts the translator so the smart-suggestion
// title + body follow the active locale. The function isn't a React
// component so it can't call useT() itself.
export function pickSuggestion(
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
