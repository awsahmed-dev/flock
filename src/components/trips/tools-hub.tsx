"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Ticket,
  Backpack,
  Users,
  Gavel,
  CalendarPlus,
  Share2,
  Settings,
  Image as ImageIcon,
  ChevronRight,
  MapPin,
  Calendar,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "@/lib/i18n/date-fns";
import { parseDateOnly } from "@/lib/date-only";
import { useT } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

/**
 * The "Tools" hub — the trip operations hub, ONE real page on BOTH
 * breakpoints (founder decision: the old mobile "More" sheet is retired,
 * desktop and mobile open the SAME /tools page). NOT a kitchen-sink page
 * that inlines the tools: each tile is a focused door (icon + label + one
 * live status line) that routes to the tool's own existing page.
 *
 * Layout: a centered, content-width column (max-w-3xl) so on desktop it
 * isn't 85% whitespace; a 1-col stack on phones (< sm) and a 2-col grid
 * from sm up. A trip-context header anchors it as a deliberate hub, not an
 * empty menu.
 *
 * Stats are pre-computed server-side (single fast batch, mirrors the
 * Overview action-hub) and passed in so each tile earns its place by
 * *summarizing* before it routes.
 *
 * Canonical item list (ONE destination per item on every breakpoint):
 *   Bookings · Pack · Crew(→/members) · Decisions(→chat) · Add to calendar ·
 *   Share invite · Trip settings (owner-only). Photos is a disabled
 *   coming-soon tile. Chat is CORE nav (not here); the owner "Clear plan"
 *   destructive action lives on Trip settings (its natural home), not loose
 *   in the hub.
 */
export interface ToolsHubStats {
  /** Accommodation + transport itinerary items — the things you book. */
  bookablesCount: number;
  packingPacked: number;
  packingTotal: number;
  documentsCount: number;
  memberCount: number;
  /** Open decisions the current user hasn't voted on yet. */
  decisionsNeedingVote: number;
}

interface Props {
  tripId: string;
  tripName: string;
  destination: string;
  startDate: string;
  endDate: string;
  isOwner: boolean;
  shareToken: string | null;
  stats: ToolsHubStats;
}

interface Tile {
  icon: LucideIcon;
  label: string;
  status: string;
  /** Accent tile (e.g. Bookings with gaps, votes waiting). */
  accent?: boolean;
  badge?: number;
  href?: string;
  /** Download link (calendar .ics). */
  download?: boolean;
  onClick?: () => void;
  /** Genuinely-not-ready surface — rendered non-interactive + muted. */
  comingSoon?: boolean;
}

export function ToolsHub({
  tripId,
  tripName,
  destination,
  startDate,
  endDate,
  isOwner,
  shareToken,
  stats,
}: Props) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const inviteUrl =
    typeof window !== "undefined" && shareToken
      ? `${window.location.origin}/invite/${shareToken}`
      : null;

  async function copyInvite() {
    if (!inviteUrl) {
      toast.error(t("trip.shareNotReady"));
      return;
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success(t("common.copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("trip.copyFailed"));
    }
  }

  const dateRange = `${format(parseDateOnly(startDate), "d MMM")} – ${format(parseDateOnly(endDate), "d MMM yyyy")}`;

  const tiles: Tile[] = [
    {
      icon: Ticket,
      label: t("tools.bookings"),
      status:
        stats.bookablesCount > 0
          ? t("tools.bookingsStatus", { count: stats.bookablesCount })
          : t("tools.bookingsStatusAll"),
      accent: stats.bookablesCount > 0,
      href: `/trips/${tripId}/wallet`,
    },
    {
      icon: Backpack,
      label: t("tools.pack"),
      status:
        stats.packingTotal > 0
          ? t("tools.packStatus", {
              packed: stats.packingPacked,
              total: stats.packingTotal,
              docs: stats.documentsCount,
            })
          : t("tools.packStatusEmpty"),
      href: `/trips/${tripId}/pack`,
    },
    {
      icon: Users,
      label: t("tools.crew"),
      status: t("tools.crewStatus", { count: stats.memberCount }),
      // ONE destination everywhere: Crew → the members page (no side-panel
      // split between breakpoints anymore).
      href: `/trips/${tripId}/members`,
    },
    {
      icon: Gavel,
      label: t("tools.decisions"),
      // Decisions folded into Chat — the tile routes to chat (the lens).
      status:
        stats.decisionsNeedingVote > 0
          ? t("tools.decisionsStatusOpen", { count: stats.decisionsNeedingVote })
          : t("tools.decisionsStatus"),
      accent: stats.decisionsNeedingVote > 0,
      badge: stats.decisionsNeedingVote,
      href: `/trips/${tripId}/chat`,
    },
    {
      icon: CalendarPlus,
      label: t("tools.calendar"),
      status: t("tools.calendarStatus"),
      href: `/api/trips/${tripId}/calendar.ics`,
      download: true,
    },
    {
      icon: Share2,
      label: t("tools.share"),
      status: copied ? t("tools.shareStatusCopied") : t("tools.shareStatus"),
      onClick: copyInvite,
    },
    {
      icon: ImageIcon,
      label: t("tools.photos"),
      status: t("tools.photosStatus"),
      comingSoon: true,
    },
  ];

  return (
    // Centered content-width column so the hub reads as deliberate, not 85%
    // whitespace on desktop. The page chrome already centers within the
    // shell's max-w-7xl; this caps the hub at a comfortable reading width.
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* Header + trip context — anchors the hub as the trip operations
          surface, not a bare link list. */}
      <div className="space-y-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {t("tools.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("tools.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />
            <span className="font-bold text-foreground truncate">{tripName}</span>
          </span>
          <span>·</span>
          <span className="truncate">{destination}</span>
          <span>·</span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {dateRange}
          </span>
        </div>
      </div>

      {/* Tile grid — single-job doors, one live stat each. 1-col stack on
          phones, 2-col from sm up. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <ToolTile key={tile.label} tile={tile} />
        ))}
      </div>

      {/* Owner-only — set apart in its own row. */}
      {isOwner && (
        <div className="space-y-2">
          <p className="text-[11px] font-extrabold tracking-widest uppercase text-muted-foreground">
            {t("tools.ownerSection")}
          </p>
          <ToolTile
            tile={{
              icon: Settings,
              label: t("tools.settings"),
              status: t("tools.settingsStatus"),
              href: `/trips/${tripId}/settings`,
            }}
            wide
          />
        </div>
      )}
    </div>
  );
}

function ToolTile({ tile, wide }: { tile: Tile; wide?: boolean }) {
  const {
    icon: Icon,
    label,
    status,
    accent,
    badge,
    href,
    download,
    onClick,
    comingSoon,
  } = tile;

  const inner = (
    <div
      className={cn(
        "group h-full flex items-center gap-3.5 rounded-2xl ring-1 bg-card p-4 transition-all min-h-[64px]",
        comingSoon
          ? "ring-border/40 opacity-60"
          : accent
            ? "ring-primary/40 hover:ring-primary/70 bg-primary/[0.03]"
            : "ring-border/60 hover:ring-border hover:bg-muted/30",
        wide && "sm:py-4",
      )}
    >
      <div
        className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors",
          accent && !comingSoon
            ? "bg-primary/12 text-primary"
            : "bg-muted/60 text-foreground",
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate">{label}</p>
        <p className="text-[12px] text-muted-foreground truncate mt-0.5">
          {status}
        </p>
      </div>
      {badge && badge > 0 ? (
        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-destructive text-white text-[10px] font-black shrink-0">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
      {!comingSoon && (
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 rtl:rotate-180" />
      )}
    </div>
  );

  // Coming-soon tiles never navigate — non-interactive so a muted row can't
  // silently route nowhere.
  if (comingSoon) {
    return (
      <div className="block h-full select-none cursor-default" aria-disabled>
        {inner}
      </div>
    );
  }

  if (href) {
    return (
      <Link
        href={href}
        download={download || undefined}
        prefetch={href.startsWith("/trips") ? true : undefined}
        className="block h-full"
      >
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className="block w-full h-full text-start">
      {inner}
    </button>
  );
}
