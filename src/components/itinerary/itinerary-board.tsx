"use client";

import { useMemo, useState, useTransition } from "react";
import { motion } from "motion/react";
import { parseISO, isToday } from "date-fns";
import { format } from "@/lib/i18n/date-fns";
import {
  Plus, Sparkles, Hotel, ChevronUp, ChevronDown, ExternalLink, Search,
  Bed, Plane, Car, Utensils, Ticket, HelpCircle, Trash2, Pencil, GripVertical, MapPin, Clock,
} from "lucide-react";
import dynamicImport from "next/dynamic";
import {
  DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { AddPlaceSearch } from "./add-place-search";
import { EditItemDialog } from "./edit-item-dialog";
import { AiPlannerPanel } from "@/components/trips/ai-planner-panel";
import { HotelSearchPanel } from "@/components/hotels/hotel-search-panel";
import { updateItemSortOrders, deleteItineraryItem, updateItemStatus } from "@/lib/actions/itinerary";
import { fmtAmount } from "@/lib/numerals";
import { inferLocalCurrency, currencySymbol } from "@/lib/country-currency";
import { useT } from "@/components/i18n/locale-provider";
import { convert, type RateBundle } from "@/lib/fx";
import { toast } from "sonner";
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
  activity:      { icon: Ticket,    text: "text-violet-600 dark:text-violet-400", label: "Activity" },
  accommodation: { icon: Bed,       text: "text-blue-600 dark:text-blue-400",     label: "Stay" },
  transport:     { icon: Car,       text: "text-orange-600 dark:text-orange-400", label: "Transport" },
  meal:          { icon: Utensils,  text: "text-green-600 dark:text-green-400",   label: "Meal" },
  other:         { icon: HelpCircle,text: "text-muted-foreground",                label: "Other" },
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
}: Props) {
  const t = useT();
  const [items, setItems] = useState(initialItems);
  const [searchOpen, setSearchOpen] = useState(false);
  const [defaultAddDay, setDefaultAddDay] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [hotelOpen, setHotelOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focusedDay, setFocusedDay] = useState<string | null>(days[0] ?? null);
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
  const containerCls =
    "relative -mx-4 sm:-mx-6 lg:-mx-6 -mt-4 sm:-mt-6 " +
    "h-[calc(100dvh-3.5rem-5.5rem)] sm:h-[calc(100dvh-3.5rem)] " +
    "overflow-hidden";

  return (
    <div className={containerCls}>
      {/* ── Map layer ─────────────────────────────────────────────── */}
      <div className="absolute inset-0">
        <MapboxPlanMap
          items={mapItems}
          destinationCenter={destinationCenter}
          focusedDay={focusedDay}
          highlightedItemId={highlightedItemId}
          onItemClick={handleMarkerClick}
          days={days}
        />
      </div>

      {/* ── Day chip rail (always visible at top of map) ─────────── */}
      <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-4 z-20 flex items-center gap-2 overflow-x-auto scrollbar-none pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-card/95 backdrop-blur-md border border-border shadow-lg p-1 max-w-full overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setFocusedDay(null)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${
              focusedDay === null
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
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
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${palette.dot}`} />
                D{idx + 1}
                {count > 0 && <span className="opacity-70 tabular-nums">·{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Add FAB ───────────────────────────────────────────────
          B12: was sitting low-right above the sheet handle, covering
          part of the day-list peek. Moved to top-right of the map
          area (just under the AI/Hotels chips that were already up
          there) so the entire sheet column is unobstructed. Smaller,
          icon-led, label still readable but doesn't fight the list. */}
      <button
        type="button"
        onClick={() => openAddFor(focusedDay)}
        className="absolute z-30 right-4 sm:right-6 top-16 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-violet-600 text-white ps-2.5 pe-3 py-2 text-xs font-bold shadow-lg shadow-primary/30 hover:opacity-90 transition-opacity"
        title={t("itinerary.addToItinerary")}
      >
        <Plus className="w-3.5 h-3.5" />
        {t("itinerary.addPlace")}
      </button>

      {/* ── Bottom sheet (B11: motion-driven drag-to-expand) ────────
          Was a click-to-toggle button which made the sheet feel like a
          panel you "open and close" rather than a true sheet. Now the
          summary strip is the drag handle: pan up to expand, pan down
          to collapse. Click still works as a fallback for fat-finger
          users / non-touch devices. */}
      <motion.div
        className="absolute left-0 right-0 bottom-0 z-20"
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
          {/* Handle + summary header — drag target. Tap still works. */}
          <button
            type="button"
            onClick={() => setSheetOpen((o) => !o)}
            className="w-full px-5 pt-2.5 pb-2 flex flex-col items-stretch text-left hover:bg-accent/20 transition-colors cursor-grab active:cursor-grabbing touch-none"
          >
            <div className="flex justify-center mb-1">
              <span className="block w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">
                  {focusedDay
                    ? `${t("itinerary.dayN", { n: days.indexOf(focusedDay) + 1 })} · ${format(parseISO(focusedDay), "EEE, MMM d")}`
                    : t("itinerary.all")}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {focusedDay
                    ? t("itinerary.items", { count: getItemsForDay(focusedDay).length })
                    : t("itinerary.items", { count: items.length })}
                </p>
              </div>
              <span className="shrink-0 text-muted-foreground">
                {sheetOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </span>
            </div>
          </button>

          {/* B7b: AI + Hotels live here now (out of the map corner where
              they collided with the chip rail). Inline action row sits
              right under the sheet's title strip — discoverable, never in
              the way. */}
          <div className="px-4 pb-2 flex items-center gap-2 border-b border-border/40">
            <button
              type="button"
              onClick={() => setAiOpen(true)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20 hover:border-primary/40 text-primary px-3 py-1.5 text-[11px] font-bold transition-colors"
            >
              <Sparkles className="w-3 h-3" /> {t("itinerary.aiPlan")}
            </button>
            <button
              type="button"
              onClick={() => setHotelOpen(true)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 text-blue-600 dark:text-blue-400 px-3 py-1.5 text-[11px] font-bold transition-colors"
            >
              <Hotel className="w-3 h-3" /> {t("itinerary.findAStay")}
            </button>
          </div>

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
                return (
                  <div key={day} className="mb-4">
                    {/* Day header — restores the richer card style */}
                    <div className="flex items-center gap-3 mb-2.5 px-1">
                      <div
                        className={`flex flex-col items-center justify-center w-11 h-11 rounded-xl border-2 shrink-0 ${
                          today
                            ? "border-primary bg-primary text-primary-foreground"
                            : `border-transparent ${palette.dot} text-white`
                        }`}
                      >
                        <span className="text-[9px] font-bold leading-none tracking-widest uppercase">
                          {format(parseISO(day), "EEE")}
                        </span>
                        <span className="text-base font-bold leading-tight tabular-nums">
                          {format(parseISO(day), "d")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">
                          Day {dayIdx + 1}{" "}
                          {today && (
                            <span className="ms-1.5 text-[9px] font-bold tracking-widest uppercase text-primary">
                              today
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {format(parseISO(day), "MMMM d, yyyy")} · {dayItems.length} item
                          {dayItems.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAddFor(day)}
                        title="Add to this day"
                        className="shrink-0 inline-flex items-center gap-1 rounded-full border border-border bg-card hover:border-primary/40 hover:text-primary px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase text-muted-foreground transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>

                    {/* Items */}
                    <SortableContext
                      items={dayItems.map((i) => i.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ul className="space-y-2 ms-2 ps-3 border-l-2 border-border/40">
                        {dayItems.map((item, idx) => (
                          <SortableItemRow
                            key={item.id}
                            item={item}
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

      <AiPlannerPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        tripId={tripId}
        destination={destination}
      />

      <HotelSearchPanel
        open={hotelOpen}
        onClose={() => setHotelOpen(false)}
        tripId={tripId}
        destination={destination}
      />
    </div>
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
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const TypeCfg = TYPE_CONFIG[item.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.other;
  const TypeIcon = TypeCfg.icon;

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

  return (
    <li
      ref={setNodeRef}
      style={style}
      id={`item-${item.id}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`group relative rounded-xl border bg-card transition-all ${
        isDragging ? "opacity-40" : ""
      } ${highlighted ? "border-primary/60 shadow-md shadow-primary/20" : "border-border hover:border-foreground/20"}`}
    >
      {/* Numbered marker chip — matches the map pin */}
      <div
        className={`absolute -left-[1.65rem] top-3 w-6 h-6 ${paletteDot} text-white rounded-full flex items-center justify-center text-[10px] font-extrabold shadow ring-2 ring-card`}
      >
        {number}
      </div>

      <div className="flex items-stretch gap-2.5 p-2.5">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="self-stretch flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>

        {/* Optional photo */}
        {item.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photoUrl}
            alt=""
            className="w-14 h-14 rounded-lg object-cover shrink-0"
            loading="lazy"
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={onStatusCycle}
                  title={`${item.status} — tap to cycle`}
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    item.status === "confirmed"
                      ? "bg-emerald-500"
                      : item.status === "rejected"
                        ? "bg-red-400"
                        : "bg-amber-400"
                  }`}
                />
                <p
                  className={`font-bold text-[13px] leading-tight ${
                    item.status === "rejected" ? "line-through text-muted-foreground" : ""
                  }`}
                >
                  {item.title}
                </p>
                <span
                  className={`inline-flex items-center gap-1 text-[9px] font-bold tracking-widest uppercase ${TypeCfg.text}`}
                >
                  <TypeIcon className="w-2.5 h-2.5" />
                  {TypeCfg.label}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] text-muted-foreground">
                {item.startTime && (
                  <span className="inline-flex items-center gap-0.5 tabular-nums">
                    <Clock className="w-2.5 h-2.5" /> {item.startTime.slice(0, 5)}
                  </span>
                )}
                {item.rating != null && (
                  <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold">
                    ★ {item.rating.toFixed(1)}
                  </span>
                )}
                {item.costEstimate != null && (
                  <span className="tabular-nums">
                    {currencySymbol(currency)}
                    {fmtAmount(item.costEstimate)}
                    {localPrice != null && (
                      <span className="ms-1 opacity-70">
                        · {currencySymbol(localCurrency!)}
                        {fmtAmount(localPrice)}
                      </span>
                    )}
                  </span>
                )}
                {item.locationName && (
                  <span className="inline-flex items-center gap-0.5 truncate max-w-[160px]">
                    <MapPin className="w-2.5 h-2.5" /> {item.locationName}
                  </span>
                )}
              </div>

              {item.topTip && (
                <p className="mt-1 text-[10px] italic text-muted-foreground line-clamp-1">
                  💡 {item.topTip}
                </p>
              )}
            </div>

            <div className="shrink-0 flex items-center gap-0.5">
              {directionsUrl && (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open in Google Maps"
                  className="opacity-60 group-hover:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {canManage && (
                <>
                  <button
                    type="button"
                    onClick={onEdit}
                    title="Edit"
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    title="Delete"
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
