"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { parseISO } from "date-fns";
import { format } from "@/lib/i18n/date-fns";
import {
  Sparkles, Coffee, Landmark, Utensils, Ticket, UtensilsCrossed,
  Loader2, X, Star, Plus, Compass, Users,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { SidePanel } from "@/components/ui/side-panel";
import { planDay, sendPlannedDayToCrew, type PlannedSlot, type DaySlot } from "@/lib/actions/plan-day";
import { createItineraryItemsFromGooglePlaces } from "@/lib/actions/itinerary";
import { useT } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

const SLOT_META: Record<DaySlot, { icon: typeof Coffee; key: string }> = {
  breakfast: { icon: Coffee, key: "planDay.slotBreakfast" },
  morning: { icon: Landmark, key: "planDay.slotMorning" },
  lunch: { icon: Utensils, key: "planDay.slotLunch" },
  afternoon: { icon: Ticket, key: "planDay.slotAfternoon" },
  dinner: { icon: UtensilsCrossed, key: "planDay.slotDinner" },
};

interface Props {
  open: boolean;
  onClose: () => void;
  tripId: string;
  days: string[];
  initialDay: string | null;
  /** Crew size + role drive the "Send to crew → decision cards" path. */
  crewSize?: number;
  isOwner?: boolean;
}

/**
 * Paxawa v2 — "✨ Plan this day". Pick a day, the engine assembles a real-place
 * sequence (breakfast → sight → lunch → activity → dinner), you drop anything
 * you don't want, then add the whole day in one tap. Every card is a real place
 * with its pin/photo/rating — AI curates, never invents.
 */
export function PlanDaySheet({ open, onClose, tripId, days, initialDay, crewSize = 1, isOwner = false }: Props) {
  const t = useT();
  const router = useRouter();
  const [day, setDay] = useState<string>(initialDay ?? days[0] ?? "");
  const [slots, setSlots] = useState<PlannedSlot[] | null>(null);
  const [dropped, setDropped] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [isAdding, startAdd] = useTransition();
  const [isSending, startSend] = useTransition();
  const hasCrew = crewSize >= 2;

  const build = useCallback(
    async (forDay: string) => {
      if (!forDay) return;
      setLoading(true);
      setSlots(null);
      setDropped(new Set());
      try {
        const res = await planDay({ tripId, dayDate: forDay });
        setSlots(res.slots);
      } catch {
        setSlots([]);
        toast.error(t("planDay.addError"));
      } finally {
        setLoading(false);
      }
    },
    [tripId, t],
  );

  // (Re)build whenever the sheet opens or the chosen day changes.
  useEffect(() => {
    if (open && day) build(day);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, day]);

  // Sync the chosen day when the trigger passes a new initialDay.
  useEffect(() => {
    if (open && initialDay) setDay(initialDay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialDay]);

  const kept = (slots ?? []).filter((s) => !dropped.has(s.place.placeId));

  function handleAdd() {
    if (kept.length === 0) return;
    startAdd(async () => {
      try {
        await createItineraryItemsFromGooglePlaces({
          tripId,
          dayDate: day,
          places: kept.map((s) => ({ ...s.place, startTime: s.time })),
        });
        const n = days.indexOf(day) + 1;
        toast.success(t("planDay.added", { count: kept.length, day: t("itinerary.dayN", { n }) }));
        router.refresh();
        onClose();
      } catch {
        toast.error(t("planDay.addError"));
      }
    });
  }

  function handleSendCrew() {
    if (kept.length === 0) return;
    startSend(async () => {
      try {
        const res = await sendPlannedDayToCrew({
          tripId,
          dayDate: day,
          places: kept.map((s) => s.place),
          mode: isOwner ? "ask" : "suggest",
        });
        if (res.created > 0) {
          toast.success(t("planDay.sentToCrew", { count: res.created }));
          router.refresh();
          onClose();
        } else {
          toast(t("planDay.allAlreadyOpen"));
        }
      } catch {
        toast.error(t("planDay.addError"));
      }
    });
  }

  return (
    <SidePanel
      open={open}
      onClose={onClose}
      title={t("planDay.title")}
      subtitle={t("planDay.subtitle")}
      icon={<Sparkles className="w-5 h-5" />}
      accentGradient="from-primary to-violet-600"
      width="md"
    >
      <div className="flex flex-col gap-4">
        {/* Day picker */}
        {days.length > 1 && (
          <div className="-mx-1 px-1 overflow-x-auto scrollbar-none">
            <div className="inline-flex items-center gap-1.5">
              {days.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDay(d)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all",
                    d === day
                      ? "bg-foreground text-background"
                      : "bg-muted/50 text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t("itinerary.dayN", { n: i + 1 })}
                  <span className="opacity-60 ms-1">{format(parseISO(d), "MMM d")}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm font-medium">{t("planDay.building")}</p>
          </div>
        )}

        {!loading && slots && slots.length === 0 && (
          <div className="rounded-2xl ring-1 ring-border/60 bg-card px-5 py-10 text-center">
            <p className="font-bold">{t("planDay.empty")}</p>
            <Link
              href={`/trips/${tripId}/discover`}
              onClick={onClose}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-bold hover:opacity-90 transition-opacity"
            >
              <Compass className="w-4 h-4" />
              {t("planDay.emptyCta")}
            </Link>
          </div>
        )}

        {!loading && slots && slots.length > 0 && (
          <ol className="relative space-y-1">
            {/* Connecting spine */}
            <span className="absolute start-[15px] top-2 bottom-2 w-px bg-border/70" aria-hidden />
            {slots.map((s) => {
              const meta = SLOT_META[s.slot];
              const Icon = meta.icon;
              const isDropped = dropped.has(s.place.placeId);
              const photo = s.place.photoRef
                ? `/api/discover/photo?ref=${encodeURIComponent(s.place.photoRef)}&w=200`
                : null;
              const price =
                s.place.priceLevel != null && s.place.priceLevel > 0
                  ? "$".repeat(s.place.priceLevel)
                  : null;
              return (
                <li key={s.place.placeId} className="relative ps-9">
                  {/* Slot marker */}
                  <span className="absolute start-0 top-3 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary ring-4 ring-background">
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="mb-0.5 flex items-baseline gap-2">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                      {t(meta.key)}
                    </span>
                    <span className="text-[11px] tabular-nums text-muted-foreground/70">{s.time}</span>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-2xl ring-1 bg-card p-2.5 transition-all",
                      isDropped
                        ? "opacity-40 ring-border/40"
                        : "ring-border/60 shadow-sm",
                    )}
                  >
                    <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photo} alt={s.place.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground/40">
                          {s.place.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("font-bold text-sm leading-snug line-clamp-1", isDropped && "line-through")}>
                        {s.place.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-x-2 text-xs text-muted-foreground">
                        {s.place.rating != null && (
                          <span className="inline-flex items-center gap-1 font-bold text-foreground">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            {s.place.rating.toFixed(1)}
                          </span>
                        )}
                        {price && <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{price}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setDropped((prev) => {
                          const next = new Set(prev);
                          if (next.has(s.place.placeId)) next.delete(s.place.placeId);
                          else next.add(s.place.placeId);
                          return next;
                        })
                      }
                      aria-label={isDropped ? t("planDay.restore") : t("planDay.drop")}
                      className={cn(
                        "shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                        isDropped
                          ? "bg-primary/10 text-primary hover:bg-primary/15"
                          : "text-muted-foreground/60 hover:text-foreground hover:bg-muted",
                      )}
                    >
                      {isDropped ? <Plus className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {/* Actions — add directly, or (with a crew) send as decision cards. */}
        {!loading && slots && slots.length > 0 && (
          <div className="sticky bottom-0 flex flex-col gap-2 pt-1 pb-1 bg-gradient-to-t from-background via-background to-transparent">
            <button
              type="button"
              onClick={handleAdd}
              disabled={kept.length === 0 || isAdding || isSending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-violet-600 text-white px-4 py-3 text-sm font-bold shadow-md shadow-primary/20 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {t("planDay.add", { count: kept.length })}
            </button>
            {hasCrew && (
              <button
                type="button"
                onClick={handleSendCrew}
                disabled={kept.length === 0 || isAdding || isSending}
                className="inline-flex items-center justify-center gap-2 rounded-xl ring-1 ring-border/70 bg-card hover:bg-muted/60 px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-50"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4 text-primary" />}
                {t("planDay.sendToCrew")}
              </button>
            )}
          </div>
        )}
      </div>
    </SidePanel>
  );
}
