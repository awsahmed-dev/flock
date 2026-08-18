"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretRight as ChevronRight, Trash as Trash2, NavigationArrow as Navigation, Check, Chat as MessageSquare, Wallet, Airplane as Plane, Bed as BedDouble, FileText, MapTrifold as MapIcon, Image as ImageIcon, ArrowSquareOut as ExternalLink, Link as LinkIcon } from "@phosphor-icons/react/dist/ssr";
import { type CrewMember } from "@/components/trips/share-trip-sheet";
import { BudgetSheet } from "@/components/trips/budget-sheet";
import { format as dfFormat } from "@/lib/i18n/date-fns";
import { dayMoment } from "@/lib/trip-moment";
import { useSheetDrag } from "@/lib/use-sheet-drag";
import { Ticket } from "@/components/trips/cockpit/ticket";
import { Horizon, type HorizonMark } from "@/components/trips/cockpit/horizon";
import { ForkKnife, Camera, Bus, Moon, Sun, Compass } from "@phosphor-icons/react/dist/ssr";
import { format as isoFmt } from "date-fns";
import { parseDateOnly } from "@/lib/date-only";
import type { PlanMapItem } from "@/components/map/mapbox-plan-map";
import { deleteItineraryItem, setStopCompleted, createItineraryItemFromGooglePlace } from "@/lib/actions/itinerary";
import { enqueue } from "@/lib/offline-queue";
import { useT, useLocale } from "@/components/i18n/locale-provider";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import type { CockpitAnchor, TeaserPlace } from "@/components/trips/cockpit/types";
import { getDayColor } from "@/lib/day-colors";
import { ChipRail } from "@/components/ui/chip-rail";
import { DayChip } from "@/components/trips/day-chip";
import { DocumentCard } from "@/components/documents/document-card";
import { DocumentViewer } from "@/components/documents/document-viewer";
import { isFileDoc } from "@/lib/doc-file";

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
  /** step 4: lets the deck know a hearted place is already on the plan */
  googlePlaceId?: string | null;
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
  centerZoom,
  days,
  items,
  budget,
  crew = [],
  endDate,
  teaser = [],
  anchors = [],
  todayWeather = null,
  presence = null,
  documents = [],
  todayIso,
}: {
  tripId: string;
  tripName: string;
  center: [number, number] | null;
  centerZoom?: number;
  days: string[];
  items: NowItem[];
  budget: { total: number | null; spent: number; currency: string };
  crew?: CrewMember[];
  endDate?: string;
  teaser?: TeaserPlace[];
  anchors?: CockpitAnchor[];
  /** follow-up: today's weather line (high + when rain starts) */
  todayWeather?: { tempMax: number; key: string; rainFrom: string | null; sunset: string | null } | null;
  /** follow-up: last stop another crew member checked off today */
  presence?: { name: string; place: string; at: string } | null;
  /** Sprint 4 FIX-5b: day-pinned documents — a boarding pass surfaces on
   *  the day it's needed, not four taps deep in Pack. */
  documents?: { id: string; title: string; type: string; url: string; dayDate: string | null }[];
  /** fix/tz: today in the traveller's zone, resolved once on the server. */
  todayIso: string;
}) {
  const t = useT();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { resolvedTheme } = useTheme();

  // fix/tz: supplied by the server in the traveller's zone. Computing it here
  // meant the cockpit picked a different default day than the nav did, and the
  // UP NEXT card / Navigate + Done buttons / day-progress line all failed to
  // render whenever the server insisted the trip was live and the client
  // disagreed.
  const defaultDay = days.includes(todayIso) ? todayIso : days[0] ?? todayIso;
  const [selectedDay, setSelectedDay] = useState(defaultDay);
  // Step 5: open to HALF only when something is imminent (≤ 2h) — the map
  // keeps the screen otherwise. Decided once, from props, at mount.
  const [detent, setDetent] = useState<Detent>(() => {
    const d = dayMoment(
      items.filter((i) => i.dayDate === todayIso).map((i) => ({ id: i.id, startTime: i.startTime, done: i.completedAt != null })),
      isoFmt(new Date(), "HH:mm"),
    );
    return d.total > 0 && d.minutesToNext != null && d.minutesToNext <= 120 ? "half" : "peek";
  });
  // Step 5: the peek is CONTENT-SIZED — as tall as the ticket + today-line
  // need, never a fixed 172px that clipped Navigate/Done (audit headline).
  const peekRef = useRef<HTMLDivElement | null>(null);
  const [peekPx, setPeekPx] = useState<number>(PEEK_PX + 60);
  // Video round 3: "it should not be showing [blank] like this" — FULL was
  // always 85vh even when the sheet held one ticket and a chip row. The
  // sheet is now content-sized: FULL = the content, capped at 85vh; HALF
  // never exceeds FULL.
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [contentPx, setContentPx] = useState<number>(0);
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const measure = () => setContentPx(Math.ceil(el.getBoundingClientRect().height));
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  useEffect(() => {
    const el = peekRef.current;
    if (!el) return;
    const measure = () => setPeekPx(Math.max(PEEK_PX, Math.ceil(el.getBoundingClientRect().height)) + 40);
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);
  // Sprint 8 Item 1: uploaded day-docs open the in-app viewer.
  const [docViewerIdx, setDocViewerIdx] = useState<number | null>(null);
  // Free-day one-tap add (video round 3).
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(() => new Set());
  // Truth = the plan itself: a place is "on today" iff a stop with its
  // placeId exists today. The optimistic set only bridges the refresh; once
  // the plan says otherwise (deleted), it clears — "I deleted it and it still
  // says added" (video round 4).
  const onTodayIds = useMemo(
    () => new Set(items.filter((i) => i.dayDate === todayIso && i.googlePlaceId).map((i) => i.googlePlaceId as string)),
    [items, todayIso],
  );
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reconciles optimistic set with the plan
    setAddedIds((prev) => {
      const next = new Set([...prev].filter((id) => onTodayIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [onTodayIds]);
  const isOnToday = (placeId: string) => onTodayIds.has(placeId) || addedIds.has(placeId);
  function addToToday(p: TeaserPlace) {
    if (!p.coords) return;
    setAddingId(p.placeId);
    startTransition(async () => {
      try {
        await createItineraryItemFromGooglePlace({
          tripId,
          dayDate: todayIso,
          place: {
            placeId: p.placeId, name: p.name, category: p.category ?? "other", placeTypes: p.placeTypes ?? [],
            rating: p.rating, userRatingsTotal: p.userRatingsTotal ?? null, priceLevel: p.priceLevel ?? null,
            coords: p.coords as [number, number], address: p.address ?? null, photoRef: p.photoRef,
            hoursSummary: p.hoursSummary ?? null, topTip: p.topTip ?? null,
          },
        });
        setAddedIds((prev) => new Set(prev).add(p.placeId));
        toast.success(t("now.addedToTodayToast", { name: p.name }));
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      } finally {
        setAddingId(null);
      }
    });
  }
  const fileDocs = documents.filter((d) => isFileDoc(d.url));
  const openDocViewer = (docId: string) => {
    const i = fileDocs.findIndex((f) => f.id === docId);
    if (i >= 0) setDocViewerIdx(i);
  };
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
  // Step 2 of the Now redesign: ONE time-of-day clock for today (lib/trip-moment
  // dayMoment). It picks UP NEXT (auto-advancing past stops > 5 min gone) and —
  // the fix for the audit's Finding 1 — decides the evening recap: it fires
  // when everything is done, or when it is late AND nothing timed is still
  // ahead. It can no longer declare the day over at 21:00 with a 23:10 flight
  // outstanding; the itinerary asserts, the clock only suggests.
  const today = useMemo(() => {
    const nowHm = isoFmt(new Date(nowTick), "HH:mm");
    return dayMoment(
      todayItems.map((i) => ({ id: i.id, startTime: i.startTime, done: isDone(i), anchor: isAnchor(i) })),
      nowHm,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayItems, nowTick, optimisticDone]);
  const upNext = useMemo(() => todayItems.find((i) => i.id === today.nextId) ?? null, [todayItems, today.nextId]);
  // Step 5: open to HALF only when something is imminent (≤ 2h) — the map
  // keeps the screen otherwise. Once, on mount.


  const doneCount = todayItems.filter((i) => isDone(i)).length;
  const regularToday = todayItems.filter((i) => !isAnchor(i));
  const allDoneToday = today.allDone;
  const isTravelDay = anchors.some((a) => a.dayDate === todayIso && a.stopType === "booking_flight");
  const isLastDay = endDate != null && todayIso === endDate;
  const eveningRecap = today.eveningRecap;

  // Step 5: TODAY as a horizon — the stops are the marks. The axis spans the
  // day's stops (first − 1h → last + 1h, and always includes now), min 6h,
  // so marks spread instead of bunching at a fixed 06:00.
  const nowHm = isoFmt(new Date(nowTick), "HH:mm");
  const toMin = (hm: string) => { const [h, m] = hm.slice(0, 5).split(":").map(Number); return h * 60 + m; };
  const timedMins = regularToday.filter((i) => i.startTime).map((i) => toMin(i.startTime!));
  const axisLo = Math.min(...timedMins, toMin(nowHm)) - 60;
  const axisHiRaw = Math.max(...timedMins, toMin(nowHm)) + 60;
  const axisHi = Math.max(axisHiRaw, axisLo + 360);
  const clockPos = (hm: string | null) => (hm ? Math.max(0, Math.min(100, Math.round(((toMin(hm) - axisLo) / (axisHi - axisLo)) * 100))) : null);
  const typeIcon = (type: string) => (type === "meal" ? ForkKnife : type === "transport" ? Bus : type === "accommodation" ? BedDouble : type === "activity" ? Camera : MapIcon);
  const todayMarks: HorizonMark[] = regularToday
    .filter((i) => i.startTime)
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""))
    .map((i) => ({
      at: clockPos(i.startTime) ?? 0,
      label: i.startTime!.slice(0, 5),
      icon: typeIcon(i.type),
      state: isDone(i) ? "done" : i.id === today.nextId ? "now" : (i.startTime!.slice(0, 5) < nowHm ? "due" : "later"),
    }));
  const flightToday = anchors.find((a) => a.dayDate === todayIso && a.stopType === "booking_flight");
  const leaveBy = (() => {
    const it = flightToday ? items.find((i) => i.id === flightToday.id) : null;
    if (!it?.startTime) return null;
    const [h, m] = it.startTime.slice(0, 5).split(":").map(Number);
    const mins = h * 60 + m - 180;
    if (mins <= 0) return null;
    return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  })();

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
  const [dragH, setDragH] = useState<number | null>(null);

  const CHROME_PX = 28 + 24; // pill row + bottom breathing room
  const detentPx = (d: Detent, vh: number) => {
    const fullPx = contentPx > 0 ? Math.min(FULL_FRAC * vh, Math.max(peekPx, contentPx + CHROME_PX)) : FULL_FRAC * vh;
    if (d === "peek") return peekPx;
    if (d === "half") return Math.min(fullPx, Math.max(peekPx, HALF_FRAC * vh));
    return fullPx;
  };

  // Shared touch-safe drag: the pill AND the whole peek block (ticket +
  // today-line) are grab surfaces — a finger anywhere on the top of the
  // sheet moves it, immediately, no long-press.
  const dragStartH = useRef(0);
  const dragStartScroll = useRef(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const { zoneProps: sheetZone } = useSheetDrag({
    onStart: () => {
      dragStartH.current = detentPx(detent, window.innerHeight);
      dragStartScroll.current = scrollerRef.current?.scrollTop ?? 0;
    },
    onMove: (dy) => {
      const vh = window.innerHeight;
      const want = dragStartH.current - dy;
      const max = detentPx("full", vh);
      setDragH(Math.min(max, Math.max(peekPx, want)));
      // Past full, keep the finger's motion: the excess scrolls the list, so
      // a swipe up on the ticket at FULL still reads as "show me more".
      if (scrollerRef.current) {
        scrollerRef.current.scrollTop = want > max ? dragStartScroll.current + (want - max) : dragStartScroll.current;
      }
    },
    onEnd: ({ dy, vy, moved, target }) => {
      const vh = window.innerHeight;
      if (!moved) {
        // A tap on the pill row cycles peek ↔ half; taps elsewhere are the
        // element's own click (ticket, horizon mark).
        if (target instanceof HTMLElement && target.closest("[data-sheet-pill]")) {
          setDetent((cur) => (cur === "peek" ? "half" : "peek"));
        }
        setDragH(null);
        return;
      }
      // Fling: project the finger's velocity ~150ms ahead, then snap to the
      // nearest detent — a quick flick reaches the next stop, a slow drag
      // settles where it is.
      const h = Math.min(detentPx("full", vh), Math.max(peekPx, dragStartH.current - dy - vy * 0.15));
      const candidates: Detent[] = ["peek", "half", "full"];
      let best: Detent = "peek";
      let bestDist = Infinity;
      for (const c of candidates) {
        const dist = Math.abs(detentPx(c, vh) - h);
        if (dist < bestDist) { bestDist = dist; best = c; }
      }
      setDetent(best);
      setDragH(null);
    },
  });

  const fitPadding = useMemo(() => {
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    return { top: 24, bottom: Math.round(vh * HALF_FRAC) + 60 + 24, left: 24, right: 24 };
  }, []);

  const money = (n: number) => `${budget.currency} ${Math.round(n).toLocaleString()}`;
  const budgetPct = budget.total && budget.total > 0 ? Math.min(100, Math.round((budget.spent / budget.total) * 100)) : 0;

  const sheetHeight = (() => {
    if (dragH != null) return `${dragH}px`;
    if (detent === "peek") return `${peekPx}px`;
    if (typeof window === "undefined" || contentPx === 0) return detent === "half" ? "55svh" : "85svh";
    return `${detentPx(detent, window.innerHeight)}px`;
  })();

  return (
    <div
      className="fixed bottom-0 start-0 end-0 bg-background text-foreground overflow-hidden"
      style={{ top: "calc(56px + env(safe-area-inset-top))" }}
    >
      {/* Map — fills the viewport behind everything, themed. */}
      <div className="absolute inset-0">
        <MapboxPlanMap
          items={mapItems}
          destinationCenter={center}
          destinationZoom={centerZoom}
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
        <MapIcon size={16} /> {t("nav.map")}
      </button>

      {/* ── Bottom sheet — 3 detents. ───────────────────────────────────── */}
      <div
        className={`absolute inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] z-30 flex flex-col rounded-t-[20px] border-t border-border ${
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
          data-sheet-pill
          className="shrink-0 pt-3 pb-2 flex justify-center cursor-grab"
          {...sheetZone}
        >
          <div className="w-10 h-1 rounded-full bg-foreground/25 pointer-events-none" />
        </div>

        {/* Sprint 8 Item 5: half detent used to be overflow-hidden like peek,
            so the stop list was cut off with no way to scroll. Only peek (a
            fixed-height summary) suppresses scroll now; min-h-0 keeps the
            flex child from refusing to shrink below its content height. */}
        <div
          ref={scrollerRef}
          className={
            detent === "peek" && dragH == null
              ? "flex-1 min-h-0 overflow-hidden px-4"
              : "flex-1 min-h-0 overflow-y-auto px-4"
          }
          style={{ paddingBottom: "16px" }}
        >
          <div ref={contentRef}>
          {/* Step 5: the peek is ticket + today-line, measured for height. */}
          <div ref={peekRef} className="cursor-grab" {...sheetZone}>
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

          {/* THE TICKET — up next (wayfind) or, on the last day with a flight,
              departure tonight (horizon). GO navigates; Done is the small
              secondary under it and the row swipe. */}
          {selectedDay === todayIso && upNext ? (
            <div className="flex flex-col gap-2">
              <Ticket
                hue={isLastDay && flightToday ? "horizon" : "wayfind"}
                kicker={
                  isLastDay && flightToday
                    ? (leaveBy ? t("now.departureTonightBy", { time: leaveBy }) : t("now.finalDay"))
                    : isTravelDay ? t("now.gettingThere")
                    : `${t("now.upNext")}${upNext.startTime ? ` · ${upNext.startTime.slice(0, 5)}` : ""}${today.minutesToNext != null && today.minutesToNext > 0 ? ` · ${t("now.inMinutes", { count: today.minutesToNext })}` : ""}`
                }
                title={upNext.title}
                sub={upNext.locationName}
                icon={isLastDay && flightToday ? Plane : Navigation}
                onClick={() => (upNext.lat != null ? navigateTo(upNext) : markDone(upNext))}
                go={t("cockpit.tk.go")}
              />
              <button
                type="button"
                onClick={() => markDone(upNext)}
                className="self-start inline-flex items-center gap-1.5 h-9 px-3 rounded-full border border-border text-[13px] font-bold text-foreground"
              >
                <Check size={16} weight="bold" /> {t("now.markDone")}
              </button>
              {todayMarks.length > 0 && (
                <Horizon
                  title={isLastDay ? `${t("now.today")} · ${t("now.finalDay")}` : t("now.todayDayN", { n: days.indexOf(todayIso) + 1 })}
                  nowLabel={nowHm}
                  progress={clockPos(nowHm) ?? 0}
                  marks={todayMarks}
                  endIcon={isLastDay && flightToday ? Plane : Moon}
                  className="!py-2"
                />
              )}
              {leaveBy && isLastDay && (
                <p className="text-[13px] text-muted-foreground px-1">✈ {t("now.leaveBy", { time: leaveBy })}</p>
              )}
              {/* ONE context line: weather (rain from …) → link to the plan; and
                  crew presence when someone else checked off a stop today. */}
              {todayWeather && (
                <Link href={`/trips/${tripId}/itinerary?day=${todayIso}`} className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3.5 py-2.5 text-[13px]">
                  <Sun size={16} weight="fill" className="shrink-0" style={{ color: "var(--clr-wayfind)" }} />
                  <span className="flex-1 truncate">
                    {todayWeather.tempMax}° · {t(todayWeather.key)}
                    {todayWeather.rainFrom ? ` — ${t("now.rainFrom", { time: todayWeather.rainFrom })}` : todayWeather.sunset ? ` · ${t("now.sunsetAt", { time: todayWeather.sunset })}` : ""}
                  </span>
                  <span className="font-bold shrink-0" style={{ color: "var(--clr-wayfind)" }}>{t("now.plan")}</span>
                </Link>
              )}
              {presence && (
                <p className="text-[13px] text-muted-foreground px-1 truncate">
                  <span className="font-semibold text-foreground">{presence.name}</span> · {t("now.presenceLine", { place: presence.place, time: isoFmt(new Date(presence.at), "HH:mm") })}
                </p>
              )}
            </div>
          ) : selectedDay === todayIso && regularToday.length === 0 ? (
            /* Free day (§3-C empty state): the same ticket language — a
               brand ticket into Discover, with the crew's shortlist under it.
               (Was a bare "Free day." line over an empty sheet — the "weird"
               live page on a trip with nothing planned today.) */
            <div className="flex flex-col gap-2">
              <Ticket
                hue="brand"
                kicker={t("now.todayDayN", { n: days.indexOf(todayIso) + 1 })}
                title={t("now.freeDay")}
                sub={items.length > 0 ? t("now.freeDaySub", { count: items.length }) : t("now.freeDaySubEmpty")}
                icon={Compass}
                href={`/trips/${tripId}/discover`}
                go={t("cockpit.tk.go")}
              />
              {teaser.length > 0 ? (
                /* Video round 3: the three thumbnails read as decoration. This
                   is a recommendation — "today you could visit" — so it is a
                   labelled block with room, and each card adds itself to
                   today in one tap. */
                <div className="mt-4">
                  <p className="text-[12px] font-bold uppercase text-tertiary" style={{ letterSpacing: 1.2 }}>{t("now.freeDayIdeasTitle")}</p>
                  <p className="text-[13px] text-muted-foreground mt-0.5">{t("now.freeDayIdeas")}</p>
                  <div className="flex gap-2.5 mt-3 overflow-x-auto scrollbar-none -mx-4 px-4">
                    {teaser.map((p) => (
                      <div key={p.placeId} className="shrink-0 w-[152px] rounded-2xl overflow-hidden bg-card border border-border">
                        <Link href={`/trips/${tripId}/discover`} className="block relative aspect-[4/3] bg-muted">
                          {p.photoRef && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/api/discover/photo?ref=${encodeURIComponent(p.photoRef)}&w=320`}
                              alt={p.name}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          )}
                          {p.hearts > 0 && (
                            <span className="absolute top-1.5 start-1.5 rounded-full bg-black/50 backdrop-blur px-1.5 py-0.5 text-[10px] font-bold text-white">♥ {p.hearts}</span>
                          )}
                        </Link>
                        <div className="p-2">
                          <p className="text-[13px] font-bold leading-tight line-clamp-1">{p.name}</p>
                          <p className="text-[12px] text-muted-foreground mt-0.5">{p.rating ? `★ ${p.rating}` : "\u00a0"}</p>
                          <button
                            type="button"
                            disabled={!p.coords || addingId === p.placeId || isOnToday(p.placeId)}
                            onClick={() => addToToday(p)}
                            className="mt-2 w-full h-9 rounded-xl text-[13px] font-bold border border-border disabled:opacity-60"
                            style={isOnToday(p.placeId) ? { color: "var(--clr-moss)" } : { color: "var(--clr-brand)" }}
                          >
                            {isOnToday(p.placeId) ? `✓ ${t("now.addedToToday")}` : addingId === p.placeId ? "…" : `+ ${t("now.addToToday")}`}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
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

          </div>

          {/* HALF+ content — video round 4: the lower half "looked like two
              screens merged". It is now ONE visual language with the top:
                • an "Ahead" card — day chips inside, then that day's schedule
                  (or an empty row with an Add), documents under it;
                • a 3-tile action strip — money / log expense / huddle —
                  equal tiles, icon over label. */}
          <div className={detent === "peek" && dragH == null ? "hidden" : "block"}>
            <section className="mt-5 rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-3.5 pt-3">
                <p className="text-[12px] font-bold uppercase text-tertiary" style={{ letterSpacing: 1.2 }}>{t("now.ahead")}</p>
                {selectedDay === todayIso && regularToday.length > 0 && (
                  <p className="text-[12px] text-muted-foreground tabular-nums">{t("now.dayProgress", { done: doneCount, total: regularToday.length })}</p>
                )}
              </div>
              <ChipRail className="flex gap-2 px-3.5 py-2.5" fadeColor="var(--card)">
                {days.filter((d) => d >= todayIso).map((d) => {
                  const isToday = d === todayIso;
                  return (
                    <DayChip
                      key={d}
                      chipRef={isToday ? todayPillRef : undefined}
                      active={d === selectedDay}
                      dayColor={getDayColor(days.indexOf(d))}
                      onClick={() => setSelectedDay(d)}
                      label={isToday ? t("now.today") : dfFormat(parseDateOnly(d), "EEE d MMM")}
                    />
                  );
                })}
              </ChipRail>
              <div className="border-t border-border/60 px-3 py-3">
                {dayItems.length === 0 ? (
                  <div className="flex items-center justify-between gap-3 px-1">
                    <p className="text-[13px] text-muted-foreground">{t("now.noStops")}</p>
                    <Link
                      href={`/trips/${tripId}/itinerary?day=${selectedDay}`}
                      className="shrink-0 h-9 px-3.5 rounded-full text-[13px] font-bold inline-flex items-center gap-1"
                      style={{ background: "color-mix(in srgb, var(--clr-brand) 12%, transparent)", color: "var(--clr-brand)" }}
                    >
                      + {t("now.plan")}
                    </Link>
                  </div>
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
                {documents.filter((d) => d.dayDate === selectedDay).length > 0 && (
                  <div className="mt-3">
                    <p className="text-[12px] font-bold uppercase text-tertiary mb-2 px-1" style={{ letterSpacing: 1.2 }}>
                      {t("now.docsForDay")}
                    </p>
                    <ul className="space-y-2">
                      {documents
                        .filter((d) => d.dayDate === selectedDay)
                        .map((d) => (
                          <li key={d.id}>
                            <DocumentCard doc={d} dayLabel={null} onOpen={() => openDocViewer(d.id)} />
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>

            {/* Action strip — three equal tiles. */}
            <div className="grid grid-cols-3 gap-2 mt-3">
              <button
                type="button"
                onClick={() => setBudgetOpen(true)}
                className="rounded-2xl border border-border bg-card px-2 py-3 flex flex-col items-center justify-center gap-1.5 text-center min-h-[84px]"
              >
                <Wallet size={20} weight="fill" style={{ color: "var(--clr-moss)" }} />
                <span className="text-[13px] font-bold tabular-nums leading-tight">{money(budget.spent)}</span>
                <span className="text-[12px] text-muted-foreground leading-tight">
                  {budget.total != null ? `${budgetPct}% ${t("now.ofBudget")}` : t("now.setBudget")}
                </span>
              </button>
              <Link href={`/trips/${tripId}/money?add=expense`} className="rounded-2xl border border-border bg-card px-2 py-3 flex flex-col items-center justify-center gap-1.5 text-center min-h-[84px]">
                <Wallet size={20} />
                <span className="text-[13px] font-bold leading-tight">{t("now.logExpense")}</span>
              </Link>
              <Link href={`/trips/${tripId}/huddle`} className="rounded-2xl border border-border bg-card px-2 py-3 flex flex-col items-center justify-center gap-1.5 text-center min-h-[84px]">
                <MessageSquare size={20} />
                <span className="text-[13px] font-bold leading-tight">{t("nav.huddle")}</span>
              </Link>
            </div>
          </div>
          </div>
        </div>
      </div>

      <BudgetSheet open={budgetOpen} onClose={() => setBudgetOpen(false)} tripId={tripId} currency={budget.currency} total={budget.total} />

      {docViewerIdx != null && fileDocs[docViewerIdx] && (
        <DocumentViewer docs={fileDocs} initialIndex={docViewerIdx} onClose={() => setDocViewerIdx(null)} />
      )}
    </div>
  );
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
  const { isRtl } = useLocale();
  const startX = useRef<number | null>(null);

  function down(e: React.PointerEvent) {
    if (anchor) return; // §6-B: no swipe actions on booking anchors.
    startX.current = e.clientX;
  }
  function move(e: React.PointerEvent) {
    if (startX.current == null) return;
    // RTL: logical delta — "toward start" (done) stays positive, "toward
    // end" (delete) stays negative, whichever physical side that is.
    const d = (e.clientX - startX.current) * (isRtl ? -1 : 1);
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
            className="absolute inset-y-0 end-0 w-[72px] flex items-center justify-center bg-destructive text-primary-foreground"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          {/* Left-side done zone (revealed by swipe-right). */}
          <span className="absolute inset-y-0 start-0 w-[72px] flex items-center justify-center bg-success text-primary-foreground" aria-hidden>
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
          transform: `translateX(${dx * (isRtl ? -1 : 1)}px)`,
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
            className={`shrink-0 w-7 h-7 rounded-full text-primary-foreground text-xs font-extrabold flex items-center justify-center ${
              done ? "bg-success" : ""
            }`}
            style={done ? undefined : { background: "var(--clr-wayfind)" }}
          >
            {done ? <Check size={16} strokeWidth={3} /> : index}
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
            className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-muted px-1.5 py-1 text-[12px] font-bold"
            onClick={(e) => e.stopPropagation()}
          >
            <FileText size={16} /> PDF
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
