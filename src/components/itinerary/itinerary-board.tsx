"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { motion } from "motion/react";
import { parseISO, isToday } from "date-fns";
import { format } from "@/lib/i18n/date-fns";
import Link from "next/link";
import { Plus, Sparkle as Sparkles, CaretUp as ChevronUp, CaretDown as ChevronDown, ArrowSquareOut as ExternalLink, MagnifyingGlass as Search, Compass, Bed, Airplane as Plane, Car, ForkKnife as Utensils, Ticket, Question as HelpCircle, Trash as Trash2, Pencil, DotsSixVertical as GripVertical, MapPin, Clock, Note as StickyNote, Wallet, FileText, CaretRight as ChevronRight } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import dynamicImport from "next/dynamic";
import {
  DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { AddPlaceSearch } from "./add-place-search";
import { AddItemDialog } from "./add-item-dialog";
import { EditItemDialog } from "./edit-item-dialog";
import { AddDocumentDialog } from "@/components/documents/add-document-dialog";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ChipRail } from "@/components/ui/chip-rail";
import { DayChip } from "@/components/trips/day-chip";
import { getDayColor } from "@/lib/day-colors";
import { DocumentCard } from "@/components/documents/document-card";
import { PlanDaySheet } from "./plan-day-sheet";
import { AiPlannerPanel } from "@/components/trips/ai-planner-panel";
import { updateItemSortOrders, deleteItineraryItem, updateItemStatus } from "@/lib/actions/itinerary";
import { fmtAmount } from "@/lib/numerals";
import { inferLocalCurrency, currencySymbol } from "@/lib/country-currency";
import { useT, useLocale } from "@/components/i18n/locale-provider";
import { PlanModeSwitch } from "./plan-mode-switch";
import { BookMode } from "./book-mode";
import { convert, type RateBundle } from "@/lib/fx";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import type { InferSelectModel } from "drizzle-orm";
import type { itineraryItems } from "@/lib/db/schema";

const MapboxPlanMap = dynamicImport(
  () => import("@/components/map/mapbox-plan-map").then((m) => m.MapboxPlanMap),
  { ssr: false, loading: () => <MapPlaceholder /> },
);

type Item = InferSelectModel<typeof itineraryItems>;

interface Props {
  tripId: string;
  days: string[];
  items: Item[];
  currency: string;
  destination: string;
  destinationCenter: [number, number] | null;
  fxRates: RateBundle | null;
  userId: string;
  isOwner: boolean;
  crewSize?: number;
  /** §5: deep-link from the pre-start day circles (?day=<ISO>) focuses that day. */
  initialDay?: string | null;
  /** Phase 6 §6-B: booking meta keyed by anchor stop id. Sprint 5: legacy —
   *  anchors are retired; kept optional so old callers type-check. */
  bookingsByStop?: Record<string, { bookingType: string; confirmationNumber: string | null; pdfUrl: string | null; nights: number | null }>;
  /** Sprint 5 §3c: day-pinned documents render under each day's stops. */
  documents?: { id: string; title: string; type: string | null; url: string; dayDate: string | null }[];
}

const DAY_PALETTE = [
  { dot: "bg-blue-500",    ring: "ring-blue-500/30",    chip: "text-blue-600 dark:text-blue-400" },
  { dot: "bg-orange-500",  ring: "ring-orange-500/30",  chip: "text-orange-600 dark:text-orange-400" },
  { dot: "bg-amber-500",   ring: "ring-amber-500/30",   chip: "text-amber-600 dark:text-amber-400" },
  { dot: "bg-emerald-500", ring: "ring-emerald-500/30", chip: "text-emerald-600 dark:text-emerald-400" },
  { dot: "bg-violet-500",  ring: "ring-violet-500/30",  chip: "text-violet-600 dark:text-violet-400" },
  { dot: "bg-red-500",     ring: "ring-red-500/30",     chip: "text-red-600 dark:text-red-400" },
  { dot: "bg-cyan-500",    ring: "ring-cyan-500/30",    chip: "text-cyan-600 dark:text-cyan-400" },
  { dot: "bg-pink-500",    ring: "ring-pink-500/30",    chip: "text-pink-600 dark:text-pink-400" },
];

const TYPE_CONFIG = {
  activity:      { icon: Ticket,    text: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/12", label: "Activity" },
  accommodation: { icon: Bed,       text: "text-blue-600 dark:text-blue-400",     bg: "bg-blue-500/12",   label: "Stay" },
  transport:     { icon: Car,       text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/12", label: "Transport" },
  meal:          { icon: Utensils,  text: "text-green-600 dark:text-green-400",   bg: "bg-green-500/12",  label: "Meal" },
  other:         { icon: HelpCircle,text: "text-muted-foreground",                bg: "bg-muted/60",      label: "Other" },
} as const;

function MapPlaceholder() {
  return (
    <div className="absolute inset-0 bg-muted/30 flex items-center justify-center">
      <p className="text-xs text-muted-foreground animate-pulse">Loading map…</p>
    </div>
  );
}

/**
 * B7: Plan page. Mapbox covers the surface, day list lives in a
 * collapsible bottom sheet. Layout sizes to the available viewport
 * (between trip header + bottom nav) instead of `fixed inset-0` which
 * was breaking on mobile.
 *
 * Day list inside the sheet brings back the day-header + items-card
 * look the previous version had — only flattened slightly so it stays
 * inside the sheet without scroll thrash.
 */
export function ItineraryBoard({
  tripId,
  days,
  items: initialItems,
  currency,
  destination,
  destinationCenter,
  fxRates,
  userId,
  isOwner,
  crewSize = 1,
  initialDay = null,
  bookingsByStop = {},
  documents = [],
}: Props) {
  const t = useT();
  const { locale } = useLocale();
  // §10.1: basemap follows the app theme (dark-first; light on opt-in).
  const { resolvedTheme } = useTheme();
  const [items, setItems] = useState(initialItems);
  // Keep local state in sync with server revalidations: adding a place (or AI
  // Plan) calls a server action that revalidates this route, re-rendering us
  // with fresh initialItems. Without this the new item wouldn't show until a
  // full reload. React's "adjust state when a prop changes" pattern — runs in
  // render (a new server payload = a new array reference), no effect needed.
  const [syncedItems, setSyncedItems] = useState(initialItems);
  if (initialItems !== syncedItems) {
    setSyncedItems(initialItems);
    setItems(initialItems);
  }
  const router = useRouter();
  // B24: planMode removed — Book mode merged into the Bookings tab.
  // Sprint 8 Item 3: the floating FAB is gone; the nav's right circle
  // opens this action sheet instead, listing everything addable to a day.
  const [addActionsOpen, setAddActionsOpen] = useState(false);
  const [manualAdd, setManualAdd] = useState<{ day: string; type: string } | null>(null);
  const [docAddOpen, setDocAddOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [defaultAddDay, setDefaultAddDay] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [planDayOpen, setPlanDayOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focusedDay, setFocusedDay] = useState<string | null>(() => {
    if (initialDay && days.includes(initialDay)) return initialDay;
    // Design-audit Page 7: during the trip, Today is the default day.
    const todayIso = new Date().toISOString().slice(0, 10);
    if (days.includes(todayIso)) return todayIso;
    return days[0] ?? null;
  });
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  // B7c: start collapsed so the map dominates the surface (was opening
  // to ~55vh by default which made the map feel like a sub-feature).
  // User taps the sheet handle to expand.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [, startTransition] = useTransition();

  const localCurrency = inferLocalCurrency(destination);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function getItemsForDay(day: string) {
    // Sprint 5: booking anchors retired — every stop is a regular stop in
    // manual sort order. (Legacy stop_type values render as regular rows.)
    return items
      .filter((i) => i.dayDate === day)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const activeItem = items.find((i) => i.id === active.id);
    const overItem = items.find((i) => i.id === over.id);
    if (!activeItem || !overItem || activeItem.dayDate !== overItem.dayDate) return;

    const day = activeItem.dayDate;
    const dayItems = getItemsForDay(day);
    const oldIndex = dayItems.findIndex((i) => i.id === active.id);
    const newIndex = dayItems.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(dayItems, oldIndex, newIndex);
    const updates = reordered.map((item, idx) => ({ id: item.id, sortOrder: idx }));

    setItems((prev) => {
      const otherItems = prev.filter((i) => i.dayDate !== day);
      const updated = reordered.map((item, idx) => ({ ...item, sortOrder: idx }));
      return [...otherItems, ...updated];
    });

    startTransition(() => {
      updateItemSortOrders(updates, tripId);
    });
  }

  function handleMarkerClick(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    setFocusedDay(item.dayDate);
    setHighlightedItemId(itemId);
    setSheetOpen(true);
    setTimeout(() => setHighlightedItemId(null), 1800);
    requestAnimationFrame(() => {
      document.getElementById(`item-${itemId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function openAddFor(day: string | null) {
    setDefaultAddDay(day);
    setSearchOpen(true);
  }

  // Sprint 7 FIX-3 → Sprint 8 Item 3: the nav's right circle on the
  // itinerary opens the add-actions sheet (was: straight to place search).
  // Ref keeps the listener stable across focus changes.
  const focusedDayRef = useRef(focusedDay);
  focusedDayRef.current = focusedDay;
  useEffect(() => {
    const add = () => setAddActionsOpen(true);
    window.addEventListener("paxawa:addStop", add);
    return () => window.removeEventListener("paxawa:addStop", add);
  }, []);

  const mapItems = useMemo(
    () =>
      items
        .filter((i) => i.locationLat != null && i.locationLng != null)
        .map((i) => ({
          id: i.id,
          title: i.title,
          type: i.type,
          status: i.status,
          dayDate: i.dayDate,
          startTime: i.startTime ?? null,
          costEstimate: i.costEstimate ?? null,
          bookingUrl: i.bookingUrl ?? null,
          locationName: i.locationName ?? null,
          lat: i.locationLat!,
          lng: i.locationLng!,
          photoUrl: i.photoUrl ?? null,
          rating: i.rating ?? null,
          fsqCategory: i.fsqCategory ?? null,
        })),
    [items],
  );

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  // Container height: between trip header (3.5rem) and the bottom nav.
  // 100dvh handles iOS soft keyboard correctly. Bottom-nav is ~5.5rem
  // including its safe-area padding. Negative margins pull the canvas
  // edge-to-edge inside the trip page's padded main content.
  // §10.1 Theme Schism fix: per-page `dark` forcing removed. The app is
  // dark-first via next-themes on <html>; this surface follows the global
  // tokens so the light toggle flips it with every other route (basemap
  // included — see mapStyle below).
  // §10.9: the old -mx-4/-mx-6 negative margins compensated a padded <main>
  // that no longer exists — they were pulling the whole canvas (and the
  // desktop side panel with it) 24px under the sidebar rail, clipping
  // "Day 1" and the day chips at the left edge. TripShell's <main> is
  // unpadded now, so the board sits flush without any negative margin.
  const containerCls =
    "relative " +
    "h-[calc(100dvh-3.5rem-5.5rem)] sm:h-[calc(100dvh-3.5rem)] " +
    "overflow-hidden bg-background text-foreground";

  return (
    <div className={containerCls}>
      {/* B20: Map/Book mode switcher moved from top-center to BOTTOM-LEFT
          above the sheet handle. The day chip rail now owns the top
          stripe alone, and the bottom corners hold the mode toggle
          (left) and the Add-place FAB (right) — three corners, three
          jobs, no visual collision at the top of the canvas. */}
      {/* B21: Map/Book toggle moved into the bottom-sheet control strip
          (see header below). The previous floating-bottom pill felt
          static — it stayed glued to the canvas while the sheet's drag
          gesture moved the panel above it. Inside the sheet it moves
          WITH the sheet for a natural feel. Book mode renders the
          overlay with its own sticky bar carrying the same toggle so
          the user can swap back when the sheet is hidden underneath. */}

      {/* ── Map layer ─────────────────────────────────────────────── */}
      {/* B27: on lg+ the map yields 420px on the start edge for the
          persistent desktop side panel (rendered below). Mobile keeps
          the full-bleed map under the draggable bottom sheet. */}
      <div className="absolute inset-y-0 end-0 start-0 lg:start-[420px]">
        <MapboxPlanMap
          items={mapItems}
          destinationCenter={destinationCenter}
          focusedDay={focusedDay}
          highlightedItemId={highlightedItemId}
          onItemClick={handleMarkerClick}
          days={days}
          mapStyle={resolvedTheme === "light" ? "light-v11" : "dark-v11"}
        />
      </div>

      {/* ── Desktop persistent side panel (lg+) ────────────────────
          Replaces the draggable bottom sheet on lg+. Always visible,
          no sheetOpen state, no drag. Day chips at top, inline AI Plan
          + Add Place buttons, items list scrollable, per-day "+ Add"
          header for each day. The map is constrained to start-[420px]
          above so this panel doesn't sit ON TOP of the map but BESIDE
          it — that's the difference between feeling like a real desktop
          app and a phone overlay. */}
      <aside className="hidden lg:flex absolute inset-y-0 start-0 w-[420px] z-30 bg-card border-e border-border/60 flex-col">
        <div className="px-5 pt-5 pb-3 border-b border-border/40">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                {focusedDay
                  ? format(parseISO(focusedDay), "EEEE, MMMM d")
                  : t("itinerary.all")}
              </p>
              <p className="font-extrabold text-xl tracking-tight mt-0.5">
                {focusedDay
                  ? t("itinerary.dayN", { n: days.indexOf(focusedDay) + 1 })
                  : t("itinerary.allDays")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {focusedDay
                  ? t("itinerary.items", { count: getItemsForDay(focusedDay).length })
                  : t("itinerary.items", { count: items.length })}
              </p>
            </div>
          </div>

          {/* P0-3: exactly TWO action affordances — one AI entry + one
              manual Add. "Plan this day" and "AI Plan" are no longer
              siblings: the single AI button opens the planner, where
              "one day" vs "whole trip" is a choice inside the panel.
              Discover stays as a small icon shortcut (it's a separate
              destination, not an add/AI affordance). */}
          <button
            type="button"
            onClick={() => setPlanDayOpen(true)}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2.5 text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-4 h-4" />
            {t("itinerary.aiEntry")}
          </button>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => openAddFor(focusedDay)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-primary/5 text-foreground px-3 py-2 text-xs font-bold transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t("itinerary.addPlace")}
            </button>
            <Link
              href={`/trips/${tripId}/discover`}
              aria-label={t("cards.discover")}
              className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg ring-1 ring-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/15 transition-colors"
            >
              <Compass className="w-4 h-4" />
            </Link>
          </div>

          {/* Day chips — horizontal scroll if many days */}
          <div className="mt-3 -mx-1 px-1 overflow-x-auto scrollbar-none">
            <div className="inline-flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFocusedDay(null)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                  focusedDay === null
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("itinerary.all")}
              </button>
              {days.map((day, idx) => {
                const count = getItemsForDay(day).length;
                const active = focusedDay === day;
                const palette = DAY_PALETTE[idx % DAY_PALETTE.length];
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setFocusedDay(day)}
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${palette.dot}`} />
                    {/* §6-A: real calendar date, not "D1" — "Thu 18". */}
                    {format(parseISO(day), "EEE d")}
                    {count > 0 && (
                      <span className="opacity-70 tabular-nums">·{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Items list — scrollable */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {(focusedDay ? [focusedDay] : days).map((day) => {
              const dayItems = getItemsForDay(day);
              const dayIdx = days.indexOf(day);
              const palette = DAY_PALETTE[dayIdx % DAY_PALETTE.length];
              const today = isToday(parseISO(day));
              const showDayHeader = focusedDay == null;
              return (
                <div key={day} className="mb-6">
                  {showDayHeader && (
                    <div className="flex items-center gap-3 mb-3 px-1">
                      <div
                        className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border-2 shrink-0 ${
                          today
                            ? "border-primary bg-primary text-primary-foreground"
                            : `border-transparent ${palette.dot} text-white`
                        }`}
                      >
                        <span className="text-[10px] font-bold leading-none tracking-widest uppercase">
                          {format(parseISO(day), "EEE")}
                        </span>
                        <span className="text-base font-bold leading-tight tabular-nums">
                          {format(parseISO(day), "d")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">
                          {t("itinerary.dayN", { n: dayIdx + 1 })}
                          {today && (
                            <span className="ms-1.5 text-[10px] font-bold tracking-widest uppercase text-primary">
                              {t("itinerary.today")}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {format(parseISO(day), "MMMM d, yyyy")} · {t("itinerary.items", { count: dayItems.length })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAddFor(day)}
                        title={t("itinerary.addToThisDay")}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-card hover:border-primary/40 hover:text-primary px-3 py-1.5 text-xs font-bold tracking-wide text-muted-foreground transition-colors"
                      >
                        <Plus className="w-4 h-4" /> {t("itinerary.add")}
                      </button>
                    </div>
                  )}

                  <SortableContext
                    items={dayItems.map((i) => i.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="space-y-2.5">
                      {dayItems.map((item, idx) => (
                        <SortableItemRow
                          key={item.id}
                          item={item}
                          bookingMeta={bookingsByStop[String(item.id).split("#")[0]] ?? null}
                          number={idx + 1}
                          paletteDot={palette.dot}
                          currency={currency}
                          localCurrency={localCurrency}
                          fxRates={fxRates}
                          canManage={isOwner || item.createdBy === userId}
                          highlighted={highlightedItemId === item.id}
                          onMouseEnter={() => setHighlightedItemId(item.id)}
                          onMouseLeave={() =>
                            setHighlightedItemId((p) => (p === item.id ? null : p))
                          }
                          onEdit={() => setEditingItem(item)}
                          onDelete={() => {
                            const id = item.id;
                            setItems((p) => p.filter((i) => i.id !== id));
                            startTransition(async () => {
                              try {
                                await deleteItineraryItem(id, tripId);
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Failed to delete");
                              }
                            });
                          }}
                          onStatusCycle={() => {
                            const next =
                              item.status === "proposed"
                                ? "confirmed"
                                : item.status === "confirmed"
                                  ? "rejected"
                                  : "proposed";
                            setItems((p) =>
                              p.map((i) =>
                                i.id === item.id ? { ...i, status: next } : i,
                              ),
                            );
                            startTransition(() => {
                              updateItemStatus(item.id, tripId, next).catch(() =>
                                toast.error("Failed to update status"),
                              );
                            });
                          }}
                        />
                      ))}
                    </ul>
                  </SortableContext>

                  {/* Sprint 5 §3c: the day's pinned confirmations, right
                      under its stops — see the plan AND the booking. */}
                  {documents.filter((d) => d.dayDate === day).length > 0 && (
                    <div className="ms-2 mt-2 space-y-1.5">
                      {documents
                        .filter((d) => d.dayDate === day)
                        .map((d) => (
                          <DocumentCard key={d.id} doc={d} dayLabel={null} />
                        ))}
                    </div>
                  )}

                  {dayItems.length === 0 && (
                    <button
                      type="button"
                      onClick={() => openAddFor(day)}
                      className="ms-2 mt-1 w-[calc(100%-0.5rem)] rounded-xl border border-dashed border-border/60 hover:border-primary/30 hover:bg-accent/20 px-3 py-3 text-[11px] text-muted-foreground hover:text-foreground transition-colors text-center"
                    >
                      {t("itinerary.nothingPlanned")}
                    </button>
                  )}
                </div>
              );
            })}
          </DndContext>
        </div>
      </aside>

      {/* B21: day chip rail moved into the bottom-sheet control strip
          below. Top of canvas is now clean — map gets the full surface,
          no floating chrome competing with the trip topbar. */}

      {/* Sprint 8 Item 3: the floating + FAB is gone — the nav's right
          circle is the single Add entry; it opens the action sheet below
          (place, note, time block, expense, document, AI plan). */}

      {/* ── Bottom sheet (B11: motion-driven drag-to-expand) ────────
          Was a click-to-toggle button which made the sheet feel like a
          panel you "open and close" rather than a true sheet. Now the
          summary strip is the drag handle: pan up to expand, pan down
          to collapse. Click still works as a fallback for fat-finger
          users / non-touch devices. */}
      <motion.div
        className="absolute left-0 right-0 bottom-0 z-20 lg:hidden"
        animate={{ y: sheetOpen ? 0 : "calc(100% - 3.75rem)" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.1, bottom: 0.1 }}
        onDragEnd={(_, info) => {
          // > 50px down OR a fast downward flick → collapse
          if (info.offset.y > 50 || info.velocity.y > 500) setSheetOpen(false);
          // > 50px up OR a fast upward flick → expand
          else if (info.offset.y < -50 || info.velocity.y < -500) setSheetOpen(true);
        }}
      >
        <div className="mx-auto max-w-3xl bg-card/95 backdrop-blur-xl border-t border-border rounded-t-3xl shadow-2xl overflow-hidden">
          {/* B21: drag handle (small) — the previous double-strip header
              was busy. The drag handle is now just the slim pill at the
              top; tapping it still toggles the sheet. */}
          <button
            type="button"
            onClick={() => setSheetOpen((o) => !o)}
            className="w-full pt-2.5 pb-1.5 flex justify-center cursor-grab active:cursor-grabbing touch-none"
            aria-label={sheetOpen ? "Collapse" : "Expand"}
          >
            <span className="block w-10 h-1 rounded-full bg-muted-foreground/30" />
          </button>

          {/* B23: three rows instead of one cramped row. Each control
              gets proper breathing room: Map/Book toggle gets a wide
              labeled pill, day chips own their own line, and Add is an
              inline tappable button next to the day title. The previous
              one-row layout squished icon-only Map/Book + chips + +FAB
              into ~360px on mobile — felt tight and the icons had no
              labels so the toggle was opaque. */}

          {/* B24: Map/Book mode toggle removed. The Plan tab is now purely
              the map + day sheet. Booking lives in the new Bookings tab
              (renamed from Wallet) which holds both 'to book' suggestions
              and already-booked tickets. Cleaner mental model: Plan =
              what you're doing, Bookings = what you're spending on. */}

          {/* Day chips — Sprint 8 Items 2+4: the unified DayChip (planning
              tokens at LIVE size, day-color bottom border) in a ChipRail
              whose trailing fade signals there's more to scroll. */}
          <ChipRail className="flex items-center gap-1.5 px-3 pb-2" fadeColor="var(--card)">
            <DayChip
              label={t("itinerary.all")}
              active={focusedDay === null}
              onClick={() => setFocusedDay(null)}
            />
            {days.map((day, idx) => (
              <DayChip
                key={day}
                active={focusedDay === day}
                dayColor={getDayColor(idx)}
                count={getItemsForDay(day).length}
                onClick={() => setFocusedDay(day)}
                /* §6-A: real calendar date, not "D1" — "Thu 18". */
                label={format(parseISO(day), "EEE d")}
              />
            ))}
          </ChipRail>

          {/* Row 3: day title (tap to expand sheet) — Add controls moved
              to a floating + FAB at bottom-right which opens a picker
              offering AI Plan or manual Add. */}
          <button
            type="button"
            onClick={() => setSheetOpen((o) => !o)}
            className="w-full px-4 pb-3 flex items-center justify-between gap-3 text-left hover:bg-accent/20 transition-colors"
          >
            <div className="min-w-0">
              <p className="font-extrabold text-base truncate">
                {focusedDay
                  ? `${t("itinerary.dayN", { n: days.indexOf(focusedDay) + 1 })} · ${format(parseISO(focusedDay), "EEE, MMM d")}`
                  : t("itinerary.all")}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {focusedDay
                  ? t("itinerary.items", { count: getItemsForDay(focusedDay).length })
                  : t("itinerary.items", { count: items.length })}
              </p>
            </div>
            <span className="shrink-0 text-muted-foreground">
              {sheetOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </span>
          </button>

          {/* Scrollable list — trimmed from 55vh to 45vh so map gets
              the larger share of the viewport when sheet is expanded. */}
          <div className="max-h-[45vh] overflow-y-auto px-3 sm:px-4 pb-[calc(env(safe-area-inset-bottom,0)+1rem)]">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {(focusedDay ? [focusedDay] : days).map((day) => {
                const dayItems = getItemsForDay(day);
                const dayIdx = days.indexOf(day);
                const palette = DAY_PALETTE[dayIdx % DAY_PALETTE.length];
                const today = isToday(parseISO(day));
                // B25-r2: when only one day is in view the sheet's pinned
                // header already shows "Day N · day-of-week, date · X
                // items" — repeating the same info as a richer card here
                // was the duplication seen in the screenshot. Hide it in
                // single-day mode. The bottom-right FAB picker still owns
                // adding, so we don't need the per-day Add button either.
                const showDayHeader = focusedDay == null;
                return (
                  <div key={day} className="mb-6">
                    {showDayHeader && (
                      <div className="flex items-center gap-3 mb-3 px-1">
                        <div
                          className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border-2 shrink-0 ${
                            today
                              ? "border-primary bg-primary text-primary-foreground"
                              : `border-transparent ${palette.dot} text-white`
                          }`}
                        >
                          <span className="text-[10px] font-bold leading-none tracking-widest uppercase">
                            {format(parseISO(day), "EEE")}
                          </span>
                          <span className="text-base font-bold leading-tight tabular-nums">
                            {format(parseISO(day), "d")}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm">
                            {t("itinerary.dayN", { n: dayIdx + 1 })}
                            {today && (
                              <span className="ms-1.5 text-[10px] font-bold tracking-widest uppercase text-primary">
                                {t("itinerary.today")}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {format(parseISO(day), "MMMM d, yyyy")} · {t("itinerary.items", { count: dayItems.length })}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openAddFor(day)}
                          title={t("itinerary.addToThisDay")}
                          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-card hover:border-primary/40 hover:text-primary px-3 py-1.5 text-xs font-bold tracking-wide text-muted-foreground transition-colors"
                        >
                          <Plus className="w-4 h-4" /> {t("itinerary.add")}
                        </button>
                      </div>
                    )}

                    <SortableContext
                      items={dayItems.map((i) => i.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ul className="space-y-2.5">
                        {dayItems.map((item, idx) => (
                          <SortableItemRow
                            key={item.id}
                            item={item}
                            bookingMeta={bookingsByStop[String(item.id).split("#")[0]] ?? null}
                            number={idx + 1}
                            paletteDot={palette.dot}
                            currency={currency}
                            localCurrency={localCurrency}
                            fxRates={fxRates}
                            canManage={isOwner || item.createdBy === userId}
                            highlighted={highlightedItemId === item.id}
                            onMouseEnter={() => setHighlightedItemId(item.id)}
                            onMouseLeave={() =>
                              setHighlightedItemId((p) => (p === item.id ? null : p))
                            }
                            onEdit={() => setEditingItem(item)}
                            onDelete={() => {
                              const id = item.id;
                              setItems((p) => p.filter((i) => i.id !== id));
                              startTransition(async () => {
                                try {
                                  await deleteItineraryItem(id, tripId);
                                } catch (err) {
                                  toast.error(err instanceof Error ? err.message : "Failed to delete");
                                  // Re-fetch on failure to recover
                                }
                              });
                            }}
                            onStatusCycle={() => {
                              const next =
                                item.status === "proposed"
                                  ? "confirmed"
                                  : item.status === "confirmed"
                                    ? "rejected"
                                    : "proposed";
                              setItems((p) =>
                                p.map((i) => (i.id === item.id ? { ...i, status: next } : i)),
                              );
                              startTransition(() => {
                                updateItemStatus(item.id, tripId, next).catch(() =>
                                  toast.error("Failed to update status"),
                                );
                              });
                            }}
                          />
                        ))}
                      </ul>
                    </SortableContext>

                  {/* Sprint 5 §3c: the day's pinned confirmations, right
                      under its stops — see the plan AND the booking. */}
                  {documents.filter((d) => d.dayDate === day).length > 0 && (
                    <div className="ms-2 mt-2 space-y-1.5">
                      {documents
                        .filter((d) => d.dayDate === day)
                        .map((d) => (
                          <DocumentCard key={d.id} doc={d} dayLabel={null} />
                        ))}
                    </div>
                  )}

                    {dayItems.length === 0 && (
                      <button
                        type="button"
                        onClick={() => openAddFor(day)}
                        className="ms-2 mt-1 w-[calc(100%-0.5rem)] rounded-xl border border-dashed border-border/60 hover:border-primary/30 hover:bg-accent/20 px-3 py-3 text-[11px] text-muted-foreground hover:text-foreground transition-colors text-center"
                      >
                        Nothing planned · tap to add
                      </button>
                    )}
                  </div>
                );
              })}

              <DragOverlay>
                {activeItem && (
                  <div className="rounded-xl bg-card border border-primary/40 shadow-2xl px-3 py-2">
                    <p className="text-sm font-bold">{activeItem.title}</p>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </motion.div>

      {/* Sheets / dialogs */}
      {/* Sprint 8 Item 3: everything addable to the focused day, one sheet.
          Opened by the nav's right circle (paxawa:addStop). */}
      <BottomSheet
        open={addActionsOpen}
        onClose={() => setAddActionsOpen(false)}
        title={t("itinerary.addToDay")}
        subtitle={
          (focusedDay ?? days[0])
            ? format(parseISO(focusedDay ?? days[0]), "EEEE, MMM d")
            : undefined
        }
        size="sm"
      >
        <div className="divide-y divide-border/60">
          <AddActionRow
            icon={MapPin}
            label={t("itinerary.addPlace")}
            onClick={() => {
              setAddActionsOpen(false);
              openAddFor(focusedDay ?? days[0] ?? null);
            }}
          />
          {(focusedDay ?? days[0]) && (
            <AddActionRow
              icon={StickyNote}
              label={t("itinerary.addNote")}
              onClick={() => {
                setAddActionsOpen(false);
                setManualAdd({ day: focusedDay ?? days[0], type: "other" });
              }}
            />
          )}
          {(focusedDay ?? days[0]) && (
            <AddActionRow
              icon={Clock}
              label={t("itinerary.addTimeBlock")}
              onClick={() => {
                setAddActionsOpen(false);
                setManualAdd({ day: focusedDay ?? days[0], type: "activity" });
              }}
            />
          )}
          <AddActionRow
            icon={Wallet}
            label={t("itinerary.logExpenseDay")}
            onClick={() => {
              setAddActionsOpen(false);
              router.push(`/trips/${tripId}/money?add=expense`);
            }}
          />
          <AddActionRow
            icon={FileText}
            label={t("nav.addDocument")}
            onClick={() => {
              setAddActionsOpen(false);
              setDocAddOpen(true);
            }}
          />
          {/* The FAB was the only mobile entry to the AI day planner — it
              moves here rather than silently disappearing. */}
          <AddActionRow
            icon={Sparkles}
            label={t("itinerary.aiEntry")}
            onClick={() => {
              setAddActionsOpen(false);
              setPlanDayOpen(true);
            }}
          />
        </div>
      </BottomSheet>

      {manualAdd && (
        <AddItemDialog
          tripId={tripId}
          dayDate={manualAdd.day}
          sortOrder={getItemsForDay(manualAdd.day).length}
          defaultValues={{ type: manualAdd.type }}
          onClose={() => setManualAdd(null)}
          onAdded={(item) => {
            setItems((prev) => [...prev, item]);
            setManualAdd(null);
          }}
        />
      )}

      <AddDocumentDialog tripId={tripId} open={docAddOpen} onClose={() => setDocAddOpen(false)} />

      <AddPlaceSearch
        open={searchOpen}
        onClose={() => {
          setSearchOpen(false);
          setDefaultAddDay(null);
        }}
        tripId={tripId}
        destination={destination}
        destinationCenter={destinationCenter}
        days={days}
        defaultDay={defaultAddDay}
      />

      {editingItem && (
        <EditItemDialog
          item={editingItem}
          tripId={tripId}
          onClose={() => setEditingItem(null)}
          onUpdated={(updated) => {
            setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            setEditingItem(null);
          }}
        />
      )}

      {/* Lazy-mount the AI planner — same pattern as trip-overview;
          it carries the questionnaire state + Anthropic client init
          and shouldn't run on every Plan view. */}
      {aiOpen && (
        <AiPlannerPanel
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          tripId={tripId}
          destination={destination}
        />
      )}

      {/* P0-3: the single AI entry. Opens on a scope choice — "Plan one
          day" (the real-place day builder) vs "Plan the whole trip"
          (hands off to the multi-day vibe wizard below). */}
      {planDayOpen && (
        <PlanDaySheet
          open={planDayOpen}
          onClose={() => setPlanDayOpen(false)}
          tripId={tripId}
          days={days}
          initialDay={focusedDay}
          crewSize={crewSize}
          isOwner={isOwner}
          onChooseWholeTrip={() => {
            setPlanDayOpen(false);
            setAiOpen(true);
          }}
        />
      )}
    </div>
  );
}

/* Sprint 8 Item 3: one row of the add-actions sheet — same anatomy as the
   nav's + menu rows so both sheets read as the same control. */
function AddActionRow({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 h-14 px-1 text-start active:bg-muted/40 transition-colors"
    >
      <span className="w-9 h-9 rounded-full bg-primary/12 text-primary flex items-center justify-center shrink-0">
        <Icon className="w-4.5 h-4.5" />
      </span>
      <span className="flex-1 font-semibold text-[15px]">{label}</span>
      <ChevronRight className="w-4 h-4 text-muted-foreground rtl:rotate-180" />
    </button>
  );
}

/* ─── Sortable item row ──────────────────────────────────────────────── */

function SortableItemRow({
  item,
  number,
  paletteDot,
  currency,
  localCurrency,
  fxRates,
  canManage,
  highlighted,
  onMouseEnter,
  onMouseLeave,
  onEdit,
  onDelete,
  onStatusCycle,
  bookingMeta = null,
}: {
  item: Item;
  number: number;
  paletteDot: string;
  currency: string;
  localCurrency: string | null;
  fxRates: RateBundle | null;
  canManage: boolean;
  highlighted: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusCycle: () => void;
  bookingMeta?: { bookingType: string; confirmationNumber: string | null; pdfUrl: string | null; nights: number | null } | null;
}) {
  // Sprint 5: booking anchors retired — legacy anchor rows behave like
  // regular stops (draggable, deletable).
  const isAnchor = false;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled: isAnchor });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const TypeCfg = TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.other;
  const TypeIcon = TypeCfg.icon;

  // Fix 3: horizontal swipe-left to reveal a delete zone. Reordering is
  // handle-only (dnd-kit listeners live on the grip button), so a horizontal
  // pointer drag on the row body never activates the vertical DnD sensor.
  const [dx, setDx] = useState(0);
  const swipeStartX = useRef<number | null>(null);
  function onSwipeDown(e: React.PointerEvent) {
    swipeStartX.current = e.clientX;
  }
  function onSwipeMove(e: React.PointerEvent) {
    if (swipeStartX.current == null) return;
    const d = e.clientX - swipeStartX.current;
    if (d < 0) setDx(Math.max(d, -88));
  }
  function onSwipeUp() {
    swipeStartX.current = null;
    setDx((cur) => (cur < -56 ? -72 : 0));
  }

  const localPrice =
    item.costEstimate != null && localCurrency && localCurrency !== currency && fxRates
      ? convert(item.costEstimate, currency, localCurrency, fxRates)
      : null;

  const directionsUrl =
    item.locationLat != null && item.locationLng != null
      ? `https://www.google.com/maps/dir/?api=1&destination=${item.locationLat},${item.locationLng}${
          item.locationName ? `&destination_place_id=${encodeURIComponent(item.locationName)}` : ""
        }`
      : null;

  /* B25-r3: card is now a clean 3-column flex row:
   *   [ number + drag handle ]  |  [ content ]  |  [ directions ]
   * Was: a floating numbered chip OUTSIDE the card's left edge (sat in
   * the gap between the timeline border and the card creating a stair-
   * step look in the screenshot); the drag handle was inline at the
   * start of the content column making the title appear offset; the
   * directions link was a tiny w-3 icon crammed between the type pill
   * and the edit/delete buttons.
   *
   * Now the number lives INSIDE the card as a left-edge badge column,
   * vertically centered with the row, with the drag handle directly
   * underneath it. The directions link is a real right-edge action
   * column, separated by a divider, big enough to tap (w-5). Edit /
   * delete are pinned next to it but stay hover-only on desktop.
   */
  return (
    <li
      ref={setNodeRef}
      style={style}
      id={`item-${item.id}`}
      className={`relative overflow-hidden rounded-2xl ${isDragging ? "opacity-40" : ""}`}
    >
      {/* Delete zone revealed under the row on swipe-left — never on anchors. */}
      {canManage && !isAnchor && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete"
          className="absolute inset-y-0 end-0 w-[72px] flex items-center justify-center bg-destructive text-white"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}
      <div
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onPointerDown={canManage && !isAnchor ? onSwipeDown : undefined}
        onPointerMove={canManage && !isAnchor ? onSwipeMove : undefined}
        onPointerUp={canManage && !isAnchor ? onSwipeUp : undefined}
        onPointerCancel={canManage && !isAnchor ? onSwipeUp : undefined}
        style={{
          transform: `translateX(${dx}px)`,
          transition: swipeStartX.current == null ? "transform 150ms ease" : "none",
        }}
        className={`group relative flex items-stretch ring-1 bg-card shadow-sm hover:shadow-md transition-[box-shadow] touch-pan-y ${
          highlighted ? "ring-primary/60 shadow-md shadow-primary/20" : "ring-border/60 hover:ring-border"
        }`}
      >
      {isAnchor && (
        <span aria-hidden className="absolute inset-y-0 start-0 w-[3px] bg-primary" />
      )}
      <div className="flex flex-col items-center justify-center gap-2 px-2.5 py-3 border-e border-border/40 shrink-0">
        <div
          className={`w-7 h-7 ${paletteDot} text-white rounded-full flex items-center justify-center text-xs font-extrabold`}
        >
          {number}
        </div>
        {!isAnchor && (
          <button
            {...attributes}
            {...listeners}
            className="text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing p-0.5"
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 min-w-0 p-3.5 flex flex-col gap-2">
        <div className="flex items-start gap-2">
          {isAnchor ? (
            <span aria-hidden className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 bg-primary" />
          ) : (
          <button
            type="button"
            onClick={onStatusCycle}
            title={
              item.status === "confirmed"
                ? "Locked in"
                : item.status === "rejected"
                  ? "Skipped"
                  : "Suggested · tap to vote"
            }
            aria-label={
              item.status === "confirmed"
                ? "Locked in"
                : item.status === "rejected"
                  ? "Skipped"
                  : "Suggested · tap to vote"
            }
            className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${
              item.status === "confirmed"
                ? "bg-success"
                : item.status === "rejected"
                  ? "bg-foreground/35"
                  : "bg-[#FFD60A]"
            }`}
          />
          )}
          <p
            className={`flex-1 min-w-0 font-bold text-sm leading-snug ${
              item.status === "rejected" ? "line-through text-muted-foreground" : ""
            }`}
          >
            {item.title}
          </p>
          <span
            className={`shrink-0 inline-flex items-center gap-1 rounded-full ${TypeCfg.bg} ${TypeCfg.text} px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase`}
          >
            <TypeIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{TypeCfg.label}</span>
          </span>
        </div>

        {(item.startTime || item.rating != null || item.costEstimate != null || item.locationName || bookingMeta) && (
          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-xs text-muted-foreground">
            {item.startTime && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock className="w-4 h-4" /> {item.startTime.slice(0, 5)}
              </span>
            )}
            {/* §6-B: confirmation # (tap-hold to copy) + [PDF] chip. */}
            {bookingMeta?.confirmationNumber && (
              <button
                type="button"
                className="tabular-nums font-semibold"
                onContextMenu={(e) => {
                  e.preventDefault();
                  navigator.clipboard?.writeText(bookingMeta.confirmationNumber!);
                  toast("Confirmation copied");
                }}
              >
                #{bookingMeta.confirmationNumber}
              </button>
            )}
            {isAnchor && item.notes?.startsWith("Night ") && (
              <span className="font-semibold">{item.notes}</span>
            )}
            {bookingMeta?.pdfUrl && (
              <a
                href={bookingMeta.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-lg bg-muted px-1.5 py-0.5 text-[11px] font-bold text-foreground"
              >
                PDF
              </a>
            )}
            {item.rating != null && (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                ★ {item.rating.toFixed(1)}
              </span>
            )}
            {item.locationName && (
              <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
                <MapPin className="w-4 h-4" /> {item.locationName}
              </span>
            )}
            {item.costEstimate != null && (
              /* §11-E: <bdi> isolates Arabic currency marks (ر.س) so digits
                 and symbol never render scrambled in an LTR context. */
              <span className="inline-flex items-center gap-1 tabular-nums font-bold text-foreground">
                <bdi>{currencySymbol(currency)}</bdi>{fmtAmount(item.costEstimate)}
                {localPrice != null && (
                  <span className="opacity-60 font-normal">
                    · <bdi>{currencySymbol(localCurrency!)}</bdi>{fmtAmount(localPrice)}
                  </span>
                )}
              </span>
            )}
          </div>
        )}

        {item.topTip && (
          <p className="text-xs italic text-muted-foreground line-clamp-1">
            💡 {item.topTip}
          </p>
        )}
      </div>

      {(directionsUrl || canManage) && (
        <div className="flex flex-col items-center justify-center gap-1 px-1.5 border-s border-border/40 shrink-0">
          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in Google Maps"
              className="p-2 rounded-lg hover:bg-muted text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          )}
          {/* Edit stays hover-only on desktop. Delete is swipe-left (the red
              zone revealed behind the row) — no always-visible trash icon, so
              it works on touch without a permanent destructive control. */}
          {canManage && !isAnchor && (
            <button
              type="button"
              onClick={onEdit}
              title="Edit"
              className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
      </div>
    </li>
  );
}
