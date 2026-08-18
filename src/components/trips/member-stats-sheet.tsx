"use client";

import { SheetGrip, useDismissDrag } from "@/components/ui/sheet-grip";
import { useEffect, useState } from "react";
import { X, Calendar, Wallet, MapPin, Backpack, CircleNotch as Loader2, Crown } from "@phosphor-icons/react/dist/ssr";
import { UserAvatar } from "@/components/ui/user-avatar";
import { fmtAmount as fmt } from "@/lib/numerals";
import { format } from "@/lib/i18n/date-fns";
import { parseISO } from "date-fns";
import { useT } from "@/components/i18n/locale-provider";
import { getMemberStats } from "@/lib/actions/member-stats";

/**
 * B22: tappable-crew mini-profile drawer. Open from any crew chip on
 * the trip overview; shows a roll-up of what that member has done so
 * far in this trip — items added, expenses paid, packing items, net
 * balance, role + joined date.
 *
 * Loads lazily: while the server action is in flight we render a small
 * skeleton. Cached per (tripId, userId) for the session so re-opening
 * the same member is instant.
 */
interface Props {
  open: boolean;
  onClose: () => void;
  tripId: string;
  member: {
    userId: string;
    displayName: string;
    avatarUrl?: string | null;
    role: "owner" | "member";
  } | null;
}

interface CachedStats {
  itemsAdded: number;
  expensesPaid: number;
  paidTotal: number;
  paidCurrency: string;
  netBalance: number | null;
  packingAdded: number;
  joinedAt: string;
}

const statsCache = new Map<string, CachedStats>();

export function MemberStatsSheet({ open, onClose, tripId, member }: Props) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<CachedStats | null>(null);

  useEffect(() => {
    if (!open || !member) {
      setStats(null);
      return;
    }
    const key = `${tripId}:${member.userId}`;
    const cached = statsCache.get(key);
    if (cached) {
      setStats(cached);
      return;
    }
    setLoading(true);
    let cancelled = false;
    (async () => {
      try {
        const result = await getMemberStats(tripId, member.userId);
        if (cancelled) return;
        if (result) {
          const next: CachedStats = {
            itemsAdded: result.itemsAdded,
            expensesPaid: result.expensesPaid,
            paidTotal: result.paidTotal,
            paidCurrency: result.paidCurrency,
            netBalance: result.netBalance,
            packingAdded: result.packingAdded,
            joinedAt: result.joinedAt,
          };
          statsCache.set(key, next);
          setStats(next);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, tripId, member]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const { gripProps, sheetStyle } = useDismissDrag(onClose);
  if (!open || !member) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={sheetStyle}
        className="bg-background w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[85vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),1rem)] animate-in slide-in-from-bottom duration-200"
      >
        {/* Header — the track */}
        <div {...gripProps} className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-4 pb-2">
        <SheetGrip className="sm:hidden pt-2 pb-1" />
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center"
            aria-label={t("common.close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        </div>

        {/* Identity block */}
        <div className="flex flex-col items-center gap-3 px-6 py-4">
          <UserAvatar
            name={member.displayName}
            avatarUrl={member.avatarUrl}
            seed={member.userId}
            size="xl"
          />
          <div className="text-center">
            <p className="font-extrabold text-lg leading-tight">
              {member.displayName}
            </p>
            <p className="text-[12px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
              {member.role === "owner" && (
                <Crown className="w-4 h-4 text-amber-500" />
              )}
              {member.role === "owner"
                ? t("memberStats.owner")
                : t("memberStats.member")}
              {stats?.joinedAt && (
                <>
                  {" · "}
                  {t("memberStats.joinedOn", {
                    date: format(parseISO(stats.joinedAt), "d MMM yyyy"),
                  })}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : stats ? (
          <div className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <StatTile
                icon={MapPin}
                label={t("memberStats.itemsAdded")}
                value={String(stats.itemsAdded)}
                tone="blue"
              />
              <StatTile
                icon={Wallet}
                label={t("memberStats.expensesPaid")}
                value={
                  stats.expensesPaid === 0
                    ? "0"
                    : `${stats.expensesPaid} · ${stats.paidCurrency} ${fmt(stats.paidTotal)}`
                }
                tone="emerald"
              />
              <StatTile
                icon={Backpack}
                label={t("memberStats.packingAdded")}
                value={String(stats.packingAdded)}
                tone="amber"
              />
              <StatTile
                icon={Calendar}
                label={t("memberStats.balance")}
                value={
                  stats.netBalance === null
                    ? "—"
                    : stats.netBalance > 0.005
                      ? `+${stats.paidCurrency} ${fmt(stats.netBalance)}`
                      : stats.netBalance < -0.005
                        ? `-${stats.paidCurrency} ${fmt(-stats.netBalance)}`
                        : t("memberStats.settled")
                }
                tone={
                  stats.netBalance === null || Math.abs(stats.netBalance) < 0.005
                    ? "slate"
                    : stats.netBalance > 0
                      ? "emerald"
                      : "rose"
                }
              />
            </div>

            {/* Plain-English summary */}
            <p className="text-[12px] text-muted-foreground text-center px-2 leading-relaxed">
              {t("memberStats.summary", {
                items: stats.itemsAdded,
                expenses: stats.expensesPaid,
              })}
            </p>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground py-6">
            {t("memberStats.loadFailed")}
          </p>
        )}
      </div>
    </div>
  );
}

const TONE_COLORS = {
  blue: { bg: "bg-blue-500/15", text: "text-blue-600 dark:text-blue-400" },
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400" },
  amber: { bg: "bg-amber-500/15", text: "text-amber-600 dark:text-amber-400" },
  rose: { bg: "bg-rose-500/15", text: "text-rose-600 dark:text-rose-400" },
  slate: { bg: "bg-slate-500/15", text: "text-slate-500" },
};

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: keyof typeof TONE_COLORS;
}) {
  const c = TONE_COLORS[tone];
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-7 h-7 rounded-lg ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${c.text}`} />
        </div>
        <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="font-extrabold text-sm tabular-nums truncate">{value}</p>
    </div>
  );
}
