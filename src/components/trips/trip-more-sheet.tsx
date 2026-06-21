"use client";

import {
  X,
  MessageSquare,
  CreditCard,
  Gavel,
  Users,
  Share2,
  Settings,
  Calendar,
  Map as MapIcon,
  FileText,
  Image as ImageIcon,
  Check,
  ChevronRight,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useT } from "@/components/i18n/locale-provider";
import { clearAllItineraryItems } from "@/lib/actions/itinerary";

/**
 * B20: trip-scoped "More" sheet. Opens from the ⋯ icon in the trip-shell
 * top-right header. Holds secondary trip surfaces that don't deserve a
 * bottom-nav slot — chat, votes, crew, share invite, trip settings,
 * future photos/documents/calendar.
 *
 * Bottom sheet on mobile (slides up, dismissable by tapping outside),
 * centered modal on desktop. Each row is icon + title + tiny meta/badge.
 *
 * Account-scoped things (profile, notifications, language, sign out)
 * stay in the user-avatar dropdown — that's a clean taxonomy.
 */
interface Props {
  open: boolean;
  onClose: () => void;
  tripId: string;
  isOwner: boolean;
  shareToken: string | null;
  onCrewOpen: () => void;
  onChatOpen: () => void;
  badges?: {
    chat?: number;
    decisions?: number;
  };
}

interface RowProps {
  icon: LucideIcon;
  label: string;
  meta?: string;
  badge?: number;
  href?: string;
  onClick?: () => void;
  tone?: "default" | "danger";
}

export function TripMoreSheet({
  open,
  onClose,
  tripId,
  isOwner,
  shareToken,
  onCrewOpen,
  onChatOpen,
  badges = {},
}: Props) {
  const t = useT();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [confirmClear, setConfirmClear] = useState(false);

  function handleClearPlan() {
    if (!confirmClear) {
      // First tap → arm the destructive intent. UI shifts to a red
      // "Tap again to confirm" state so the user can't fat-finger it.
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4_000);
      return;
    }
    startTransition(async () => {
      try {
        await clearAllItineraryItems(tripId);
        toast.success(t("more.planCleared"));
        setConfirmClear(false);
        onClose();
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("more.clearFailed"));
        setConfirmClear(false);
      }
    });
  }

  // ESC to close
  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

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

  // Open chat/crew via the parent — those have existing dedicated UIs we
  // don't want to duplicate. Closing the sheet first feels right because
  // the user is moving on to another surface.
  function openChat() {
    onClose();
    onChatOpen();
  }
  function openCrew() {
    onClose();
    onCrewOpen();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-background w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[85vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),1rem)] animate-in slide-in-from-bottom duration-200"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
              {t("more.section")}
            </p>
            <p className="font-extrabold text-sm">{t("more.title")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center"
            aria-label={t("common.close")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Trip-scoped rows */}
        <div className="p-2 space-y-1">
          <Row
            icon={MessageSquare}
            label={t("more.chat")}
            meta={t("more.chatMeta")}
            badge={badges.chat}
            onClick={openChat}
          />
          <Row
            icon={CreditCard}
            label={t("more.bookings")}
            href={`/trips/${tripId}/wallet`}
            onClick={onClose}
          />
          <Row
            icon={Gavel}
            label={t("more.decisions")}
            meta={t("more.decisionsMeta")}
            badge={badges.decisions}
            href={`/trips/${tripId}/decisions`}
            onClick={onClose}
          />
          <Row
            icon={Users}
            label={t("more.crew")}
            meta={t("more.crewMeta")}
            onClick={openCrew}
          />
          <Row
            icon={Share2}
            label={t("more.share")}
            meta={
              copied ? t("common.copied") : t("more.shareMeta")
            }
            onClick={copyInvite}
            // Inline tick on copy
            badge={copied ? -1 : undefined}
          />
        </div>

        {/* Future surfaces — shown muted so users know they exist but
            aren't ready yet. Wired as they ship. */}
        <div className="px-4 py-1 mt-1">
          <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            {t("more.comingSoon")}
          </p>
        </div>
        <div className="p-2 space-y-1 opacity-60">
          <Row
            icon={ImageIcon}
            label={t("more.photos")}
            meta={t("more.photosMeta")}
          />
          <Row
            icon={FileText}
            label={t("more.docs")}
            meta={t("more.docsMeta")}
            href={`/trips/${tripId}/pack?view=docs`}
            onClick={onClose}
          />
          <Row
            icon={Calendar}
            label={t("more.calendar")}
            meta={t("more.calendarMeta")}
            href={`/api/trips/${tripId}/calendar.ics`}
          />
          <Row
            icon={MapIcon}
            label={t("more.fullMap")}
            meta={t("more.fullMapMeta")}
            href={`/trips/${tripId}/itinerary`}
            onClick={onClose}
          />
        </div>

        {/* Owner-only zone */}
        {isOwner && (
          <>
            <div className="px-4 py-1 mt-1">
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                {t("more.ownerSection")}
              </p>
            </div>
            <div className="p-2 space-y-1">
              <Row
                icon={Settings}
                label={t("more.tripSettings")}
                meta={t("more.tripSettingsMeta")}
                href={`/trips/${tripId}/settings`}
                onClick={onClose}
              />
              {/* B20: destructive bulk action with a two-tap arming gate.
                  Sits at the bottom of the owner section so it isn't the
                  first thing a tester sees. */}
              <Row
                icon={Trash2}
                label={
                  isPending
                    ? t("more.clearingPlan")
                    : confirmClear
                      ? t("more.clearConfirm")
                      : t("more.clearPlan")
                }
                meta={
                  confirmClear
                    ? t("more.clearWarning")
                    : t("more.clearPlanMeta")
                }
                onClick={handleClearPlan}
                tone="danger"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, meta, badge, href, onClick, tone }: RowProps) {
  const isDanger = tone === "danger";
  const inner = (
    <div
      className={`group flex items-center gap-3 rounded-2xl border ${
        isDanger
          ? "border-destructive/30 hover:border-destructive/60 bg-destructive/5 hover:bg-destructive/10"
          : "border-transparent hover:border-border hover:bg-muted/40"
      } p-3 transition-colors cursor-pointer ${isDanger ? "text-destructive" : ""}`}
    >
      <div className={`w-9 h-9 rounded-xl ${isDanger ? "bg-destructive/15" : "bg-muted/60"} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${isDanger ? "text-destructive" : "text-foreground"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm truncate">{label}</p>
        {meta && (
          <p className="text-[11px] text-muted-foreground truncate">{meta}</p>
        )}
      </div>
      {badge === -1 ? (
        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
      ) : badge && badge > 0 ? (
        <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-black shrink-0">
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
        onClick={onClick}
        prefetch={href.startsWith("/trips") ? true : undefined}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className="w-full text-start">
      {inner}
    </button>
  );
}
