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
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

/**
 * The "Tools" hub — the foyer to every secondary trip surface. NOT a
 * kitchen-sink page that inlines the tools: each tile is a focused door
 * (icon + label + one live status line) that routes to the tool's own
 * existing page. Replaces the flat sidebar list of secondary destinations
 * and is the desktop twin of the mobile Tools sheet.
 *
 * Stats are pre-computed server-side (single fast batch, mirrors the
 * Overview action-hub) and passed in so each tile earns its place by
 * *summarizing* before it routes.
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
}

export function ToolsHub({ tripId, isOwner, shareToken, stats }: Props) {
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
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {t("tools.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("tools.subtitle")}
        </p>
      </div>

      {/* Tile grid — single-job doors, one live stat each. */}
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
  const { icon: Icon, label, status, accent, badge, href, download, onClick } =
    tile;

  const inner = (
    <div
      className={cn(
        "group h-full flex items-center gap-3.5 rounded-2xl ring-1 bg-card p-4 transition-all min-h-[64px]",
        accent
          ? "ring-primary/40 hover:ring-primary/70 bg-primary/[0.03]"
          : "ring-border/60 hover:ring-border hover:bg-muted/30",
        wide && "sm:py-4",
      )}
    >
      <div
        className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors",
          accent ? "bg-primary/12 text-primary" : "bg-muted/60 text-foreground",
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
      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 rtl:rotate-180" />
    </div>
  );

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
