"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight, Trash2, Navigation, Check, MessageSquare, Wallet,
  Plane, BedDouble, FileText, Map as MapIcon,
  Image as ImageIcon, ExternalLink, Link as LinkIcon,
} from "lucide-react";
import { type CrewMember } from "@/components/trips/share-trip-sheet";
import { BudgetSheet } from "@/components/trips/budget-sheet";
import { format as dfFormat } from "@/lib/i18n/date-fns";
import { format as isoFmt } from "date-fns";
import { parseDateOnly } from "@/lib/date-only";
import type { PlanMapItem } from "@/components/map/mapbox-plan-map";
import { deleteItineraryItem, setStopCompleted } from "@/lib/actions/itinerary";
import { enqueue } from "@/lib/offline-queue";
import { useT } from "@/components/i18n/locale-provider";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import type { CockpitAnchor, TeaserPlace } from "@/components/trips/cockpit/types";
import { getDayColor } from "@/lib/day-colors";
import { Progress } from "@/components/animate-ui/components/radix/progress";

const MapboxPlanMap = dynamic(
  () => import("@/components/map/mapbox-plan-map").then((m) => m.MapboxPlanMap),
  // §3-C: map fades in from a surface skeleton — NEVER a black void.
  { ssr: false, loading: () => <div className="absolute inset-0 bg-muted animate-pulse" /> },
);

// §3-C sheet detents: peek 112px above nav / half 55% / full 92%.
const PEEK_PX = 112;
const HALF_FRAC = 0.55;
// Phase 7 §3-A: full detent caps at 85% — at least ~80px of map always
// visible. The user must always feel "I'm on a map".
const FULL_FRAC = 0.85;
type Detent = "peek" | "half" | "full";

export interface NowItem {
  id: string;
  dayDate: string;
  title: string;
  type: string;
  startTime: string | null;
  locationName: string | null;
  lat: number | null;
  lng: number | null;
  status: string;
  /** Phase 6 §6: 'regular' | 'booking_flight' | 'booking_stay' | 'booking_other'. */
  stopType?: string;
  /** Phase 6 §3-C: ISO timestamp when checked off, null when not done. */
  completedAt?: string | null;
  photoUrl?: string | null;
}

/**
 * Phase 6 §3-C — NOW in LIVE phase: the map cockpit. Full-bleed themed
 * Mapbox under a 3-detent sheet headlined by the UpNext card ([Navigate]
 * + [Done ✓]). Swipe right = done, swipe left = delete (never on booking
 * anchors). Time-aware sheet modes: travel day, last day, day complete,
 * free day.
 */
export function NowCockpit({
  tripId,
  tripName,
  center,
  days,
  items,
  budget,
  crew = [],
  endDate,
  teaser = [],
  anchors = [],
  documents = [],
}: {
  tripId: string;
  tripName: string;
  center: [number, number] | null;
  days: string[];
  items: NowItem[];
  budget: { total: number | null; spent: number; currency: string };
  crew?: CrewMember[];
  endDate?: string;
  teaser?: TeaserPlace[];
  anchors?: CockpitAnchor[];
  /** Sprint 4 FIX-5b: day-pinned documents — a boarding pass surfaces on
   *  the day it's needed, not four taps deep in Pack. */
  documents?: { id: string; title: string; type: string; url: string; dayDate: string | null }[];
}) {
  const t = useT();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { resolvedTheme } = useTheme();

  const todayIso = useMemo(() => isoFmt(new Date(), "yyyy-MM-dd"), []);
  const defaultDay = days.includes(todayIso) ? todayIso : days[0] ?? todayIso;
  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const [detent, setDetent] = useState<Detent>("peek");
  // §3-A map chip: remembers the detent to restore after a map-full view.
  const lastDetentRef = useRef<Detent>("half");
  const [optimisticDeleted, setOptimisticDeleted] = useState<Set<string>>(new Set());
  const [optimisticDone, setOptimisticDone] = useState<Map<string, boolean>>(new Map());
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [recapDismissed, setRecapDismissed] = useState(false);

  const todayPillRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      todayPillRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior, inline: "start", block: "nearest" });
    });
    return () => cancelAnimationFrame(id);
  }, [selectedDay]);

  useEffect(() => {
    // Phase 7 §2/§3-A: the nav's left circle (map icon) toggles map-full view.
    const toggleMap = () =>
      setDetent((cur) => {
        if (cur === "peek") return lastDetentRef.current === "peek" ? "half" : lastDetentRef.current;
        lastDetentRef.current = cur;
        return "peek";
      });
    // Sprint 4 FIX-2: paxawa:shareTrip retired — the + menu opens the crew
    // sheet via paxawa:openCrewSheet (trip-shell) in every phase.
    window.addEventListener("paxawa:toggleMapView", toggleMap);
    return () => {
      window.removeEventListener("paxawa:toggleMapView", toggleMap);
    };
  }, []);

  const isDone = (i: NowItem) => optimisticDone.get(i.id) ?? i.completedAt != null;
  // Sprint 5: booking anchors retired — every stop is a regular stop.
  const isAnchor = (_i: NowItem) => false;

  const dayItems = useMemo(
    () =>
      items
        .filter((i) => i.dayDate === selectedDay && !optimisticDeleted.has(i.id))
        // §6-B: anchors pinned on top, then by time.
        .sort((a, b) => {
          const aa = isAnchor(a) ? 0 : 1;
          const bb = isAnchor(b) ? 0 : 1;
          if (aa !== bb) return aa - bb;
          return (a.startTime ?? "99").localeCompare(b.startTime ?? "99");
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, selectedDay, optimisticDeleted],
  );

  const todayItems = useMemo(
    () => items.filter((i) => i.dayDate === todayIso && !optimisticDeleted.has(i.id)),
    [items, todayIso, optimisticDeleted],
  );

  // §3-C UP NEXT: the next uncompleted stop today; auto-advances past
  // stops whose scheduled time is > 5 min gone (checked each minute).
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const upNext = useMemo(() => {
    const remaining = todayItems
      .filter((i) => !isDone(i) && !isAnchor(i))
      .sort((a, b) => (a.startTime ?? "99").localeCompare(b.startTime ?? "99"));
    if (remaining.length === 0) return null;
    const nowHm = isoFmt(new Date(nowTick), "HH:mm");
    // Auto-advance: skip stops > 5 min past their scheduled time.
    const upcoming = remaining.find((i) => !i.startTime || i.startTime.slice(0, 5) >= nowHm || minutesPast(i.startTime, nowHm) <= 5);
    return upcoming ?? remaining[remaining.length - 1];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayItems, nowTick, optimisticDone]);

  const doneCount = todayItems.filter((i) => isDone(i)).length;
  const regularToday = todayItems.filter((i) => !isAnchor(i));
  const allDoneToday = regularToday.length > 0 && regularToday.every((i) => isDone(i));
  const isTravelDay = anchors.some((a) => a.dayDate === todayIso && a.stopType === "booking_flight");
  const isLastDay = endDate != null && todayIso === endDate;
  const eveningRecap = allDoneToday || new Date(nowTick).getHours() >= 21;

  const mapItems = useMemo<PlanMapItem[]>(
    () =>
      items
        .filter((i) => i.lat != null && i.lng != null && !optimisticDeleted.has(i.id))
        .map((i) => ({
          id: i.id,
          title: i.title,
          type: i.type,
          status: isDone(i) ? "confirmed" : "proposed",
          dayDate: i.dayDate,
          startTime: i.startTime,
          costEstimate: null,
          bookingUrl: null,
          locationName: i.locationName,
          lat: i.lat as number,
          lng: i.lng as number,
          photoUrl: null,
          rating: null,
          fsqCategory: i.type,
        })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, optimisticDeleted, optimisticDone],
  );

  function remove(itemId: string) {
    setOptimisticDeleted((prev) => new Set(prev).add(itemId));
    // §0 rule 11: every delete gets a 3s undo window.
    let undone = false;
    toast(t("now.stopRemoved"), {
      duration: 3000,
      action: {
        label: t("common.undo"),
        onClick: () => {
          undone = true;
          setOptimisticDeleted((prev) => {
            const n = new Set(prev);
            n.delete(itemId);
            return n;
          });
        },
      },
      onAutoClose: () => {
        if (undone) return;
        startTransition(async () => {
          try {
            await deleteItineraryItem(itemId, tripId);
            router.refresh();
          } catch {
            setOptimisticDeleted((prev) => {
              const n = new Set(prev);
              n.delete(itemId);
              return n;
            });
          }
        });
      },
    });
  }

  function markDone(item: NowItem, done = true) {
    setOptimisticDone((prev) => new Map(prev).set(item.id, done));
    if (navigator.vibrate) navigator.vibrate(8);
    // §10-B: offline check-offs queue in the outbox and sync on reconnect.
    if (!navigator.onLine) {
      void enqueue({ type: "checkoff", payload: { itemId: item.id, tripId, done } });
      toast(t("offline.queued"));
      return;
    }
    startTransition(() => {
      setStopCompleted(item.id, tripId, done).catch(() => {
        setOptimisticDone((prev) => new Map(prev).set(item.id, !done));
        toast.error(t("common.failed"));
      });
    });
  }

  function navigateTo(item: NowItem) {
    if (item.lat == null || item.lng == null) return;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}&travelmode=transit`,
      "_blank",
      "noopener",
    );
  }

  // ── 3-detent draggable sheet ───────────────────────────────────────────
  const sheetDrag = useRef<{ startY: number; startH: number; moved: boolean } | null>(null);
  const [dragH, setDragH] = useState<number | null>(null);

  const detentPx = (d: Detent, vh: number) =>
    d === "peek" ? PEEK_PX + 60 : d === "half" ? HALF_FRAC * vh : FULL_FRAC * vh;

  function onHandleDown(e: React.PointerEvent) {
    const vh = window.innerHeight;
    sheetDrag.current = { startY: e.clientY, startH: detentPx(detent, vh), moved: false };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onHandleMove(e: React.PointerEvent) {
    const d = sheetDrag.current;
    if (!d) return;
    const vh = window.innerHeight;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 4) d.moved = true;
    setDragH(Math.min(FULL_FRAC * vh, Math.max(PEEK_PX + 60, d.startH - dy)));
  }
  function onHandleUp(e: React.PointerEvent) {
    const d = sheetDrag.current;
    sheetDrag.current = null;
    if (!d) return;
    const vh = window.innerHeight;
    if (!d.moved) {
      // Tap cycles peek → half → peek.
      setDetent((cur) => (cur === "peek" ? "half" : "peek"));
      setDragH(null);
      return;
    }
    const h = Math.min(FULL_FRAC * vh, Math.max(PEEK_PX + 60, d.startH - (e.clientY - d.startY)));
    // Snap to the nearest detent (velocity fling approximated by distance).
    const candidates: Detent[] = ["peek", "half", "full"];
    let best: Detent = "peek";
    let bestDist = Infinity;
    for (const c of candidates) {
      const dist = Math.abs(detentPx(c, vh) - h);
      if (dist < bestDist) { bestDist = dist; best = c; }
    }
    setDetent(best);
    setDragH(null);
  }

  const fitPadding = useMemo(() => {
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    return { top: 24, bottom: Math.round(vh * HALF_FRAC) + 60 + 24, left: 24, right: 24 };
  }, []);

  const money = (n: number) => `${budget.currency} ${Math.round(n).toLocaleString()}`;
  const budgetPct = budget.total && budget.total > 0 ? Math.min(100, Math.round((budget.spent / budget.total) * 100)) : 0;

  const sheetHeight = (() => {
    if (dragH != null) return `${dragH}px`;
    if (detent === "peek") return `${PEEK_PX + 60}px`;
    if (detent === "half") return "55svh";
    return "85svh";
  })();

  return (
    <div
      className="fixed bottom-0 start-0 end-0 xl:start-[280px] bg-background text-foreground overflow-hidden"
      style={{ top: "calc(56px + env(safe-area-inset-top))" }}
    >
      {/* Map — fills the viewport behind everything, themed. */}
      <div className="absolute inset-0">
        <MapboxPlanMap
          items={mapItems}
          destinationCenter={center}
          focusedDay={selectedDay}
          highlightedItemId={null}
          days={days}
          showRoutes
          numbered
          mapStyle={resolvedTheme === "light" ? "light-v11" : "dark-v11"}
          fitPadding={fitPadding}
          showNav={false}
        />
      </div>

      {/* Phase 7 §4: the standard trip header lives in TripShell now — the
          cockpit's own floating header is gone. §3-A: a lone [⊞ Map] glass
          chip floats top-right over the map; tap snaps the sheet to peek so
          the map fills the screen, tap again restores the last detent. */}
      <button
        type="button"
        onClick={() => {
          setDetent((cur) => {
            if (cur === "peek") return lastDetentRef.current === "peek" ? "half" : lastDetentRef.current;
            lastDetentRef.current = cur;
            return "peek";
          });
        }}
        className="xl:hidden absolute top-3 end-3 z-20 inline-flex items-center gap-1.5 rounded-full px-3 h-9 text-[13px] font-bold text-foreground"
        style={{
          background: "var(--sheet-bg)",
          backdropFilter: "blur(10px) saturate(180%)",
          WebkitBackdropFilter: "blur(10px) saturate(180%)",
          border: "1px solid var(--border)",
          pointerEvents: "auto",
        }}
      >
        <MapIcon size={15} /> {t("nav.map")}
      </button>

      {/* ── Bottom sheet — 3 detents. ───────────────────────────────────── */}
      <div
        className={`absolute inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] xl:bottom-0 z-30 flex flex-col rounded-t-[20px] border-t border-border ${
          dragH == null ? "transition-[height] duration-300 ease-out" : ""
        }`}
        style={{
          height: sheetHeight,
          background: "var(--sheet-bg)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        {/* Drag handle. */}
        <div
          className="shrink-0 pt-3 pb-1 flex justify-center cursor-grab touch-none"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
        >
          <div className="w-9 h-1 rounded-full bg-foreground/20" />
        </div>

        <div
          className={detent === "full" ? "flex-1 overflow-y-auto px-4" : "flex-1 overflow-hidden px-4"}
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
        >
          {/* Special banners. */}
          {isLastDay && selectedDay === todayIso && (
            <div className="mb-2 rounded-xl bg-card border border-border px-3 py-2 text-[13px] font-semibold">
              {t("now.finalDay")} 🌅
            </div>
          )}
          {eveningRecap && !recapDismissed && selectedDay === todayIso && regularToday.length > 0 && (
            <div className="mb-2 rounded-2xl bg-card border border-border px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[15px] font-bold">
                  {t("now.dayDone", { n: days.indexOf(todayIso) + 1 })} 🌆
                </p>
                <button type="button" onClick={() => setRecapDismissed(true)} className="text-muted-foreground text-[13px]">
                  ✕
                </button>
              </div>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {t("now.dayDoneStats", { done: doneCount, total: regularToday.length, spent: money(budget.spent) })}
              </p>
            </div>
          )}

          {/* UP NEXT (peek content). */}
          {selectedDay === todayIso && upNext ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-tertiary">
                {isTravelDay ? t("now.gettingThere") : `${t("now.upNext")}${upNext.startTime ? ` · ${upNext.startTime.slice(0, 5)}` : ""}`}
              </p>
              <p className="text-[17px] font-bold text-foreground mt-0.5 truncate">{upNext.title}</p>
              {upNext.locationName && (
                <p className="text-[15px] text-muted-foreground truncate">{upNext.locationName}</p>
              )}
              <div className="flex gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={() => navigateTo(upNext)}
                  disabled={upNext.lat == null}
                  className="flex-1 h-12 rounded-2xl text-white font-bold text-[14px] flex items-center justify-center gap-1.5 disabled:opacity-50"
                  style={{ background: "var(--clr-wayfind)" }}
                >
                  <Navigation size={16} /> {t("now.navigate")}
                </button>
                <button
                  type="button"
                  onClick={() => markDone(upNext)}
                  className="flex-1 h-12 rounded-2xl border border-border text-foreground font-bold text-[14px] flex items-center justify-center gap-1.5"
                >
                  <Check size={16} /> {t("now.done")}
                </button>
              </div>
            </div>
          ) : selectedDay === todayIso && regularToday.length === 0 ? (
            /* Free day (§3-C empty state): Discover sales moment. */
            <div>
              <p className="text-[17px] font-bold">{t("now.freeDay")}</p>
              {teaser.length > 0 ? (
                <>
                  <p className="text-[13px] text-muted-foreground mt-0.5">{t("now.freeDayIdeas")}</p>
                  <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-none">
                    {teaser.map((p) => (
                      <Link
                        key={p.placeId}
                        href={`/trips/${tripId}/discover`}
                        className="shrink-0 w-32 rounded-xl overflow-hidden bg-card border border-border"
                      >
                        <div className="relative aspect-[4/3] bg-muted">
                          {p.photoRef && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/api/discover/photo?ref=${encodeURIComponent(p.photoRef)}&w=256`}
                              alt={p.name}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <p className="p-1.5 text-[12px] font-bold line-clamp-1">{p.name}</p>
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <Link href={`/trips/${tripId}/discover`} className="inline-block mt-1 text-[14px] font-bold text-primary">
                  {t("now.openNearby")} →
                </Link>
              )}
            </div>
          ) : selectedDay === todayIso && allDoneToday ? (
            <div>
              <p className="text-[17px] font-bold">{t("now.planDone")} ✓</p>
              <Link href={`/trips/${tripId}/discover`} className="inline-block mt-1 text-[14px] font-bold text-primary">
                {t("now.nearbyIdeas")} →
              </Link>
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              {(selectedDay === todayIso ? t("now.today") : dfFormat(parseDateOnly(selectedDay), "EEE d MMM"))} ·{" "}
              {t("now.stops", { count: dayItems.length })}
            </p>
          )}

          {/* HALF+ content: spend strip, day progress, stop rows. */}
          <div className={detent === "peek" && dragH == null ? "hidden" : "block"}>
            <button type="button" onClick={() => setBudgetOpen(true)} className="w-full text-start mt-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">
                  {t("now.spent")} <span className="font-bold text-foreground tabular-nums">{money(budget.spent)}</span>
                </span>
                {budget.total != null ? (
                  <span className="text-muted-foreground tabular-nums">{budgetPct}% {t("now.ofBudget")}</span>
                ) : (
                  <span className="text-primary font-semibold">{t("now.setBudget")}</span>
                )}
              </div>
              {/* Brief E: spring-animated fill on value change. */}
              <Progress
                value={budgetPct}
                className="h-1 bg-foreground/10"
                style={{ "--progress-foreground": "var(--clr-moss)" } as React.CSSProperties}
              />
            </button>

            {selectedDay === todayIso && regularToday.length > 0 && (
              <p className="mt-3 text-[13px] text-muted-foreground">
                {t("now.dayProgress", { done: doneCount, total: regularToday.length })}
              </p>
            )}

            {/* Day rail (full detent spec, shown from half for usefulness). */}
            <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 py-3">
              {days.map((d) => {
                const active = d === selectedDay;
                const isToday = d === todayIso;
                return (
                  <button
                    key={d}
                    ref={isToday ? todayPillRef : undefined}
                    type="button"
                    onClick={() => setSelectedDay(d)}
                    className={`shrink-0 h-11 min-w-[84px] px-4 rounded-full text-sm font-bold transition-colors ${
                      active ? "text-white" : "bg-foreground/10 text-muted-foreground"
                    }`}
                    style={{
                      // FIX 5: each chip carries its day's map color.
                      borderBottom: `3px solid ${getDayColor(days.indexOf(d))}`,
                      ...(active ? { background: "var(--clr-wayfind)" } : {}),
                    }}
                  >
                    {isToday ? t("now.today") : dfFormat(parseDateOnly(d), "EEE d MMM")}
                  </button>
                );
              })}
            </div>

            {/* Item list. */}
            {dayItems.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">{t("now.noStops")}</div>
            ) : (
              <ul className="space-y-2">
                {dayItems.map((item, idx) => (
                  <StopRow
                    key={item.id}
                    item={item}
                    index={idx + 1}
                    done={isDone(item)}
                    anchor={isAnchor(item)}
                    anchorMeta={anchors.find((a) => a.id === item.id) ?? null}
                    onDelete={() => remove(item.id)}
                    onToggleDone={() => markDone(item, !isDone(item))}
                    onNavigate={() => navigateTo(item)}
                    t={t}
                  />
                ))}
              </ul>
            )}

            {/* Sprint 4 FIX-5b: documents pinned to this day. */}
            {documents.filter((d) => d.dayDate === selectedDay).length > 0 && (
              <div className="mt-4">
                <p className="text-[12px] font-bold uppercase text-tertiary mb-2" style={{ letterSpacing: 1.2 }}>
                  {t("now.docsForDay")}
                </p>
                <ul className="space-y-2">
                  {documents
                    .filter((d) => d.dayDate === selectedDay)
                    .map((d) => (
                      <li key={d.id}>
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 rounded-2xl bg-card border border-border px-3 h-14"
                        >
                          <span className="w-9 h-9 rounded-xl bg-primary/12 text-primary flex items-center justify-center shrink-0">
                            {d.type === "image" ? <ImageIcon size={16} /> : d.type === "pdf" ? <FileText size={16} /> : <LinkIcon size={16} />}
                          </span>
                          <span className="flex-1 min-w-0 text-[14px] font-semibold truncate">{d.title}</span>
                          <ExternalLink size={14} className="text-tertiary shrink-0" />
                        </a>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* Quick actions (full detent). */}
            <div className="flex gap-2 mt-4">
              <Link href={`/trips/${tripId}/money/expense-camera`} className="flex-1 h-11 rounded-2xl border border-border flex items-center justify-center gap-1.5 text-[13px] font-bold">
                <Wallet size={15} /> {t("now.logExpense")}
              </Link>
              <Link href={`/trips/${tripId}/huddle`} className="flex-1 h-11 rounded-2xl border border-border flex items-center justify-center gap-1.5 text-[13px] font-bold">
                <MessageSquare size={15} /> {t("nav.huddle")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <BudgetSheet open={budgetOpen} onClose={() => setBudgetOpen(false)} tripId={tripId} currency={budget.currency} total={budget.total} />
    </div>
  );
}

function minutesPast(scheduled: string, nowHm: string): number {
  const [sh, sm] = scheduled.slice(0, 5).split(":").map(Number);
  const [nh, nm] = nowHm.split(":").map(Number);
  return nh * 60 + nm - (sh * 60 + sm);
}

/* ── Stop row: swipe right = done, swipe left = delete (never on anchors) ── */

function StopRow({
  item, index, done, anchor, anchorMeta, onDelete, onToggleDone, onNavigate, t,
}: {
  item: NowItem;
  index: number;
  done: boolean;
  anchor: boolean;
  anchorMeta: CockpitAnchor | null;
  onDelete: () => void;
  onToggleDone: () => void;
  onNavigate: () => void;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);

  function down(e: React.PointerEvent) {
    if (anchor) return; // §6-B: no swipe actions on booking anchors.
    startX.current = e.clientX;
  }
  function move(e: React.PointerEvent) {
    if (startX.current == null) return;
    const d = e.clientX - startX.current;
    setDx(Math.max(-88, Math.min(88, d)));
  }
  function up() {
    if (startX.current == null) return;
    startX.current = null;
    setDx((cur) => {
      if (cur > 56) {
        onToggleDone(); // swipe right → Done ✓
        return 0;
      }
      return cur < -56 ? -72 : 0;
    });
  }

  const AnchorIcon = anchorMeta?.stopType === "booking_stay" ? BedDouble : Plane;

  return (
    <li className="relative overflow-hidden rounded-xl">
      {!anchor && (
        <>
          {/* Right-side delete zone (revealed by swipe-left). */}
          <button
            type="button"
            onClick={onDelete}
            aria-label={t("common.remove")}
            className="absolute inset-y-0 end-0 w-[72px] flex items-center justify-center bg-destructive text-white"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          {/* Left-side done zone (revealed by swipe-right). */}
          <span className="absolute inset-y-0 start-0 w-[72px] flex items-center justify-center bg-success text-white" aria-hidden>
            <Check className="w-5 h-5" />
          </span>
        </>
      )}
      <div
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="relative flex items-center gap-3 h-[72px] px-3 bg-card touch-pan-y"
        style={{
          transform: `translateX(${dx}px)`,
          transition: startX.current == null ? "transform 150ms ease" : "none",
          ...(anchor
            ? { borderInlineStart: "3px solid var(--clr-horizon)", background: "var(--clr-horizon-dim)" }
            : undefined),
        }}
      >
        {anchor ? (
          <AnchorIcon size={20} className="text-primary shrink-0" />
        ) : (
          <button
            type="button"
            onClick={onToggleDone}
            aria-label={done ? t("now.done") : t("now.markDone")}
            className={`shrink-0 w-7 h-7 rounded-full text-white text-xs font-extrabold flex items-center justify-center ${
              done ? "bg-success" : ""
            }`}
            style={done ? undefined : { background: "var(--clr-wayfind)" }}
          >
            {done ? <Check size={14} strokeWidth={3} /> : index}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-[15px] truncate ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
            {item.title}
          </p>
          <p className="text-[12px] text-muted-foreground truncate tabular-nums">
            {anchorMeta?.confirmationNumber
              ? `${item.startTime ? item.startTime.slice(0, 5) + " · " : ""}#${anchorMeta.confirmationNumber}`
              : item.startTime
                ? item.startTime.slice(0, 5)
                : item.locationName || item.type}
          </p>
        </div>
        {anchorMeta?.pdfUrl && (
          <a
            href={anchorMeta.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-muted px-1.5 py-1 text-[11px] font-bold"
            onClick={(e) => e.stopPropagation()}
          >
            <FileText size={12} /> PDF
          </a>
        )}
        {!anchor && item.lat != null && (
          <button
            type="button"
            onClick={onNavigate}
            aria-label={t("now.navigate")}
            className="shrink-0 w-11 h-11 flex items-center justify-center text-muted-foreground"
          >
            <Navigation size={18} />
          </button>
        )}
        {anchor && <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0 rtl:rotate-180" />}
      </div>
    </li>
  );
}
