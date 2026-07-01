"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  ChevronLeft,
  UserPlus,
  Trash2,
} from "lucide-react";
import { ShareTripSheet, type CrewMember } from "@/components/trips/share-trip-sheet";
import { BudgetSheet } from "@/components/trips/budget-sheet";
import { format as dfFormat } from "@/lib/i18n/date-fns";
import { format as isoFmt } from "date-fns";
import { parseDateOnly } from "@/lib/date-only";
import type { PlanMapItem } from "@/components/map/mapbox-plan-map";
import { deleteItineraryItem } from "@/lib/actions/itinerary";
import { useT } from "@/components/i18n/locale-provider";

const MapboxPlanMap = dynamic(
  () => import("@/components/map/mapbox-plan-map").then((m) => m.MapboxPlanMap),
  { ssr: false, loading: () => <div className="absolute inset-0 bg-[#0a0a0a]" /> },
);

// Sheet snap points as a fraction of the viewport height.
const REST_FRAC = 0.45;
const FULL_FRAC = 0.92;

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
}

/**
 * NOW screen (redesign brief Screen C) — the active-trip cockpit. Full-screen
 * dark Mapbox map with today's purple numbered route, under a draggable glass
 * bottom sheet (45%↔92%). Dark by default. Sheet blur is inline because the
 * build strips backdrop-filter from stylesheets.
 */
export function NowCockpit({
  tripId,
  tripName,
  center,
  days,
  items,
  budget,
  crew = [],
}: {
  tripId: string;
  tripName: string;
  center: [number, number] | null;
  days: string[];
  items: NowItem[];
  budget: { total: number | null; spent: number; currency: string };
  crew?: CrewMember[];
}) {
  const t = useT();
  const router = useRouter();
  const [, startTransition] = useTransition();

  // ISO key must use Western digits to match the server's `days` list (the
  // localized formatter would emit Arabic-Indic digits in the ar locale).
  const todayIso = useMemo(() => isoFmt(new Date(), "yyyy-MM-dd"), []);
  const defaultDay = days.includes(todayIso) ? todayIso : days[0] ?? todayIso;
  const [selectedDay, setSelectedDay] = useState(defaultDay);
  const [expanded, setExpanded] = useState(false);
  const [optimisticDeleted, setOptimisticDeleted] = useState<Set<string>>(new Set());
  const [shareOpen, setShareOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);

  // §6-E / Fix 8: on load, scroll the day selector so "Today" is the first
  // visible pill (the trip's start date is often 13 pills back). Deferred with
  // setTimeout(0) so it runs AFTER the pills have laid out.
  const todayPillRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const id = setTimeout(() => {
      todayPillRef.current?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const dayItems = useMemo(
    () => items.filter((i) => i.dayDate === selectedDay && !optimisticDeleted.has(i.id)),
    [items, selectedDay, optimisticDeleted],
  );

  // Map adapter — only the selected day's pins, purple + numbered + routed.
  const mapItems = useMemo<PlanMapItem[]>(
    () =>
      items
        .filter((i) => i.lat != null && i.lng != null && !optimisticDeleted.has(i.id))
        .map((i) => ({
          id: i.id,
          title: i.title,
          type: i.type,
          status: i.status === "confirmed" ? "confirmed" : "proposed",
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
    [items, optimisticDeleted],
  );

  function remove(itemId: string) {
    setOptimisticDeleted((prev) => new Set(prev).add(itemId));
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
  }

  // ── Draggable sheet ──────────────────────────────────────────────────────
  // Fix 4: true touch drag. pointermove sets the sheet height live; on release
  // it snaps to the resting (45svh) or expanded (92svh) state by drag direction
  // and distance (a 20%-of-viewport threshold). A tap (no movement) toggles.
  const sheetDrag = useRef<{ startY: number; startH: number; moved: boolean } | null>(null);
  const [dragH, setDragH] = useState<number | null>(null);

  function onHandleDown(e: React.PointerEvent) {
    const vh = window.innerHeight;
    sheetDrag.current = {
      startY: e.clientY,
      startH: (expanded ? FULL_FRAC : REST_FRAC) * vh,
      moved: false,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onHandleMove(e: React.PointerEvent) {
    const d = sheetDrag.current;
    if (!d) return;
    const vh = window.innerHeight;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 4) d.moved = true;
    // Dragging up (negative dy) grows the sheet; clamp between the two snaps.
    const next = Math.min(FULL_FRAC * vh, Math.max(REST_FRAC * vh, d.startH - dy));
    setDragH(next);
  }
  function onHandleUp(e: React.PointerEvent) {
    const d = sheetDrag.current;
    sheetDrag.current = null;
    if (!d) return;
    const dy = e.clientY - d.startY; // + dragged down, − dragged up
    const threshold = 0.2 * window.innerHeight;
    if (!d.moved) setExpanded((x) => !x);
    else if (dy < -threshold) setExpanded(true);
    else if (dy > threshold) setExpanded(false);
    setDragH(null);
  }

  // Fit today's route into the strip visible above the resting sheet (Fix 5).
  const fitPadding = useMemo(() => {
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const restSheet = Math.round(vh * REST_FRAC);
    // Occluded bottom = resting sheet + the 60px mobile tab bar; +24 breathing.
    return { top: 24, bottom: restSheet + 60 + 24, left: 24, right: 24 };
  }, []);

  const budgetPct =
    budget.total && budget.total > 0
      ? Math.min(100, Math.round((budget.spent / budget.total) * 100))
      : 0;
  const remaining = budget.total != null ? Math.max(0, budget.total - budget.spent) : null;
  const money = (n: number) => `${budget.currency} ${Math.round(n).toLocaleString()}`;

  const budgetBar = (
    <>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-white/60">
          {t("now.spent")} <span className="font-bold text-white tabular-nums">{money(budget.spent)}</span>
        </span>
        {budget.total != null ? (
          <span className="text-white/60 tabular-nums">
            {money(budget.total)}
            {remaining != null && <span className="text-emerald-400"> · {money(remaining)} {t("now.left")}</span>}
          </span>
        ) : (
          <span className="text-primary font-semibold">{t("now.setBudget")}</span>
        )}
      </div>
      <div className="h-1 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${budgetPct}%` }} />
      </div>
    </>
  );

  return (
    <div className="dark fixed top-0 bottom-0 start-0 end-0 xl:start-[280px] bg-[#0a0a0a] text-[#f5f5f7] overflow-hidden">
      {/* Map — fills the viewport behind everything. */}
      <div className="absolute inset-0">
        <MapboxPlanMap
          items={mapItems}
          destinationCenter={center}
          focusedDay={selectedDay}
          highlightedItemId={null}
          days={days}
          showRoutes
          numbered
          pinColor="#6b5ce7"
          mapStyle="dark-v11"
          fitPadding={fitPadding}
          showNav={false}
        />
      </div>

      {/* §1-A floating header — mobile only; overlays the map with a top-down
          gradient so white text stays readable without a solid bar. Back →
          dashboard, trip name (truncated), and the §7 share button. */}
      <div
        className="xl:hidden absolute top-0 inset-x-0 z-40 flex items-center gap-1.5 h-[52px] px-2 pointer-events-none"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)",
        }}
      >
        <Link
          href="/dashboard"
          aria-label={t("nav.allTrips")}
          className="pointer-events-auto shrink-0 w-11 h-11 flex items-center justify-center text-white active:opacity-70"
        >
          <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
        </Link>
        <p className="pointer-events-none flex-1 min-w-0 truncate font-bold text-white text-[15px]">
          {tripName}
        </p>
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          aria-label={t("share.title")}
          className="pointer-events-auto shrink-0 w-11 h-11 flex items-center justify-center text-white active:opacity-70"
        >
          <UserPlus className="w-6 h-6" />
        </button>
      </div>

      {/* §2-B: the floating "Add to today" / "AI fill gaps" pill row was removed —
          both actions move into the dynamic bottom nav's [+] sheet (§9). The map
          is now unobstructed between the top header and the bottom sheet. */}

      {/* Bottom sheet — sits above the mobile tab bar (60px); flush on desktop. */}
      <div
        className={`absolute inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] xl:bottom-0 z-30 flex flex-col rounded-t-3xl border-t border-white/10 ${
          dragH == null ? "transition-[height] duration-300 ease-out" : ""
        }`}
        style={{
          height: dragH != null ? `${dragH}px` : expanded ? "92svh" : "45svh",
          background: "rgba(10,10,10,0.92)",
          backdropFilter: "blur(40px)",
          WebkitBackdropFilter: "blur(40px)",
        }}
      >
        {/* Handle — drag to resize, tap to toggle. */}
        <div
          className="shrink-0 pt-3 pb-1 flex justify-center cursor-grab touch-none"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
        >
          <div className="w-9 h-1 rounded-full bg-white/20" />
        </div>

        <div
          className="flex-1 overflow-y-auto px-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 80px)" }}
        >
          {/* Budget bar — §2-D: with no budget yet, tapping opens the set-budget
              sheet; once set, tapping opens the full expenses view. */}
          {budget.total != null ? (
            <Link href={`/trips/${tripId}/expenses`} className="block pt-2 pb-3">
              {budgetBar}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setBudgetOpen(true)}
              className="block w-full text-start pt-2 pb-3"
            >
              {budgetBar}
            </button>
          )}

          {/* Day selector */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 py-1">
            {days.map((d) => {
              const active = d === selectedDay;
              const isToday = d === todayIso;
              return (
                <button
                  key={d}
                  ref={isToday ? todayPillRef : undefined}
                  type="button"
                  onClick={() => setSelectedDay(d)}
                  className="shrink-0 h-11 min-w-[84px] px-4 rounded-full text-sm font-bold transition-colors"
                  style={
                    active
                      ? { background: "#6B5CE7", color: "#ffffff" }
                      : { background: "rgba(255,255,255,0.08)", color: "#AEAEB2" }
                  }
                >
                  {isToday ? t("now.today") : dfFormat(parseDateOnly(d), "EEE d MMM")}
                </button>
              );
            })}
          </div>

          {/* Section label */}
          <p className="mt-4 mb-2 type-caption text-white/50">
            {(selectedDay === todayIso ? t("now.today") : dfFormat(parseDateOnly(selectedDay), "EEE d MMM")).toUpperCase()}
            {" · "}
            {t("now.stops", { count: dayItems.length })}
          </p>

          {/* Item list */}
          {dayItems.length === 0 ? (
            <div className="min-h-[26svh] flex items-center justify-center text-center text-white/40 text-sm">{t("now.noStops")}</div>
          ) : (
            <ul className="space-y-2">
              {dayItems.map((item, idx) => (
                <ItemRow key={item.id} item={item} index={idx + 1} onDelete={() => remove(item.id)} t={t} />
              ))}
            </ul>
          )}
        </div>

        {/* §2-A: quick-access row removed — Log expense / Chat / Full map move
            into the dynamic bottom nav ([+] sheet + Tools speed-dial, §9). */}
      </div>

      <ShareTripSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        tripId={tripId}
        tripName={tripName}
        crew={crew}
      />
      <BudgetSheet
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        tripId={tripId}
        currency={budget.currency}
        total={budget.total}
      />
    </div>
  );
}

/* Swipe-left to reveal delete (brief BUG 5 — no always-visible trash). */
function ItemRow({
  item,
  index,
  onDelete,
  t,
}: {
  item: NowItem;
  index: number;
  onDelete: () => void;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);
  const booked = item.status === "confirmed";

  function down(e: React.PointerEvent) {
    startX.current = e.clientX;
  }
  function move(e: React.PointerEvent) {
    if (startX.current == null) return;
    const d = e.clientX - startX.current;
    if (d < 0) setDx(Math.max(d, -88));
  }
  function up() {
    startX.current = null;
    setDx((cur) => (cur < -56 ? -72 : 0));
  }

  return (
    <li className="relative overflow-hidden rounded-xl">
      {/* Delete action revealed under the row */}
      <button
        type="button"
        onClick={onDelete}
        aria-label={t("common.remove")}
        className="absolute inset-y-0 end-0 w-[72px] flex items-center justify-center bg-destructive text-white"
      >
        <Trash2 className="w-5 h-5" />
      </button>
      <div
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="relative flex items-center gap-3 h-[72px] px-3 bg-[#1c1c1e] touch-pan-y"
        style={{ transform: `translateX(${dx}px)`, transition: startX.current == null ? "transform 150ms ease" : "none" }}
      >
        <span className="shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs font-extrabold flex items-center justify-center">
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] text-white truncate">{item.title}</p>
          <p className="text-[12px] text-white/50 truncate">
            {item.startTime ? item.startTime.slice(0, 5) : item.locationName || item.type}
          </p>
        </div>
        {booked && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
        <ChevronRight className="w-4 h-4 text-white/30 shrink-0 rtl:rotate-180" />
      </div>
    </li>
  );
}
