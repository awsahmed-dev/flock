"use client";

import { useMemo, useState, useTransition } from "react";
import { format, parseISO, isToday } from "date-fns";
import { Plus, Sparkles, Hotel, Calendar, ChevronUp, ChevronDown, ExternalLink, Search, Bed, Plane, Car, Utensils, Ticket, HelpCircle, Trash2, Pencil } from "lucide-react";
import dynamicImport from "next/dynamic";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { AddItemDialog } from "./add-item-dialog";
import { EditItemDialog } from "./edit-item-dialog";
import { AddPlaceSearch } from "./add-place-search";
import { AiPlannerPanel } from "@/components/trips/ai-planner-panel";
import { HotelSearchPanel } from "@/components/hotels/hotel-search-panel";
import { updateItemSortOrders, deleteItineraryItem, updateItemStatus } from "@/lib/actions/itinerary";
import { fmtAmount } from "@/lib/numerals";
import { inferLocalCurrency, currencySymbol } from "@/lib/country-currency";
import { convert, type RateBundle } from "@/lib/fx";
import { toast } from "sonner";
import type { InferSelectModel } from "drizzle-orm";
import type { itineraryItems } from "@/lib/db/schema";

// Mapbox is heavy + browser-only; ship it deferred.
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
  /** B5: pre-geocoded destination center [lng, lat] from server side. */
  destinationCenter: [number, number] | null;
  /** B5: live FX rates for dual-currency display. */
  fxRates: RateBundle | null;
  userId: string;
  isOwner: boolean;
}

const DAY_PALETTE = [
  "bg-blue-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500",
  "bg-violet-500", "bg-red-500", "bg-cyan-500", "bg-pink-500",
];

const TYPE_CONFIG = {
  activity:      { icon: Ticket,    text: "text-violet-600 dark:text-violet-400" },
  accommodation: { icon: Bed,       text: "text-blue-600 dark:text-blue-400" },
  transport:     { icon: Car,       text: "text-orange-600 dark:text-orange-400" },
  meal:          { icon: Utensils,  text: "text-green-600 dark:text-green-400" },
  other:         { icon: HelpCircle,text: "text-muted-foreground" },
} as const;

function MapPlaceholder() {
  return (
    <div className="absolute inset-0 bg-muted/40 flex items-center justify-center">
      <p className="text-xs text-muted-foreground animate-pulse">Loading map…</p>
    </div>
  );
}

/**
 * B5: Plan page. Mapbox covers the surface; itinerary controls float
 * above as a bottom sheet (mobile + desktop). Day-chip rail floats at
 * the top so day-switching is one tap.
 *
 * The old split-view + Leaflet map are gone entirely. Map view is the
 * only view — drag-and-drop list lives inside the bottom sheet.
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
  const [items, setItems] = useState(initialItems);
  const [addingDay, setAddingDay] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [hotelOpen, setHotelOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focusedDay, setFocusedDay] = useState<string | null>(days[0] ?? null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  // Bottom-sheet expand state — closed shows day chips + focused day items;
  // open shows all days scrollable.
  const [sheetOpen, setSheetOpen] = useState(true);
  const [, startTransition] = useTransition();

  const localCurrency = inferLocalCurrency(destination);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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

  // Map needs lng,lat ordering + only items with coords.
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
  const focusedItems = focusedDay ? getItemsForDay(focusedDay) : [];

  return (
    <div className="fixed inset-0 sm:relative sm:inset-auto sm:h-[calc(100vh-3.5rem)] sm:-mx-4 sm:-mt-6 lg:-mx-6">
      {/* ── Full-bleed map ─────────────────────────────────────────── */}
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

      {/* ── Top: day chip rail ─────────────────────────────────────── */}
      <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-4 z-20 flex items-center gap-2 overflow-x-auto scrollbar-none pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-card/95 backdrop-blur-md border border-border shadow-lg p-1">
          <button
            type="button"
            onClick={() => setFocusedDay(null)}
            className={`shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
              focusedDay === null
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {days.map((day, idx) => {
            const count = getItemsForDay(day).length;
            const active = focusedDay === day;
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
                <span className={`w-1.5 h-1.5 rounded-full ${DAY_PALETTE[idx % DAY_PALETTE.length]}`} />
                Day {idx + 1}
                {count > 0 && <span className="opacity-70 tabular-nums">· {count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Top-right floating actions: Hotels + AI ─────────────────── */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-16 z-20 flex flex-col gap-2 pointer-events-none">
        <button
          type="button"
          onClick={() => setAiOpen(true)}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-violet-600 text-white pl-2.5 pr-3 py-1.5 text-[11px] font-bold shadow-lg shadow-primary/30 hover:opacity-90 transition-opacity"
          title="AI plan"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">AI plan</span>
        </button>
        <button
          type="button"
          onClick={() => setHotelOpen(true)}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-card/95 backdrop-blur-md border border-border text-blue-600 dark:text-blue-400 pl-2.5 pr-3 py-1.5 text-[11px] font-bold shadow-lg hover:bg-card transition-colors"
          title="Find hotels"
        >
          <Hotel className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Hotels</span>
        </button>
      </div>

      {/* ── Bottom-left floating "Add by search" ────────────────────── */}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="absolute z-20 left-3 sm:left-4 bottom-[calc(env(safe-area-inset-bottom,0)+5rem)] sm:bottom-6 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground pl-3 pr-4 py-2.5 text-sm font-bold shadow-xl shadow-primary/40 hover:opacity-90 transition-opacity pointer-events-auto"
        title="Add a place"
      >
        <Search className="w-4 h-4" />
        Add a place
      </button>

      {/* ── Bottom sheet: day list ──────────────────────────────────── */}
      <div
        className={`absolute left-0 right-0 bottom-0 z-10 transition-transform duration-300 ${
          sheetOpen ? "translate-y-0" : "translate-y-[calc(100%-3.5rem)]"
        }`}
      >
        <div className="mx-auto max-w-3xl bg-card/95 backdrop-blur-xl border-t border-border rounded-t-3xl shadow-2xl overflow-hidden">
          {/* Handle / header */}
          <button
            type="button"
            onClick={() => setSheetOpen((o) => !o)}
            className="w-full px-5 pt-2.5 pb-2 flex flex-col items-stretch text-left hover:bg-accent/20 transition-colors"
          >
            <div className="flex justify-center mb-1">
              <span className="block w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">
                  {focusedDay
                    ? `Day ${days.indexOf(focusedDay) + 1} · ${format(parseISO(focusedDay), "EEE, MMM d")}`
                    : "All days"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {focusedDay
                    ? `${focusedItems.length} item${focusedItems.length !== 1 ? "s" : ""}`
                    : `${items.length} items across ${days.length} days`}
                </p>
              </div>
              <span className="shrink-0 text-muted-foreground">
                {sheetOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </span>
            </div>
          </button>

          {/* Scrollable list */}
          <div className="max-h-[55vh] overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom,0)+5rem)] sm:pb-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {(focusedDay ? [focusedDay] : days).map((day) => {
                const dayItems = getItemsForDay(day);
                const dayIdx = days.indexOf(day);
                return (
                  <div key={day} className="mb-3">
                    {/* Day strip — visible when "All" is selected */}
                    {!focusedDay && (
                      <div className="flex items-center gap-2 mb-2 px-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${DAY_PALETTE[dayIdx % DAY_PALETTE.length]}`} />
                        <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                          Day {dayIdx + 1} · {format(parseISO(day), "EEE MMM d")}
                        </p>
                      </div>
                    )}

                    <SortableContext
                      items={dayItems.map((i) => i.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ul className="space-y-1.5">
                        {dayItems.map((item, idx) => (
                          <SortableItemRow
                            key={item.id}
                            item={item}
                            number={idx + 1}
                            color={DAY_PALETTE[dayIdx % DAY_PALETTE.length]}
                            currency={currency}
                            localCurrency={localCurrency}
                            fxRates={fxRates}
                            canManage={isOwner || item.createdBy === userId}
                            highlighted={highlightedItemId === item.id}
                            onMouseEnter={() => setHighlightedItemId(item.id)}
                            onMouseLeave={() => setHighlightedItemId((p) => (p === item.id ? null : p))}
                            onEdit={() => setEditingItem(item)}
                            onDelete={() => {
                              startTransition(async () => {
                                try {
                                  await deleteItineraryItem(item.id, tripId);
                                  setItems((p) => p.filter((i) => i.id !== item.id));
                                } catch (err) {
                                  toast.error(err instanceof Error ? err.message : "Failed to delete");
                                }
                              });
                            }}
                            onStatusCycle={() => {
                              const next = item.status === "proposed" ? "confirmed" : item.status === "confirmed" ? "rejected" : "proposed";
                              setItems((p) => p.map((i) => (i.id === item.id ? { ...i, status: next } : i)));
                              startTransition(() => {
                                updateItemStatus(item.id, tripId, next).catch(() => toast.error("Failed to update status"));
                              });
                            }}
                          />
                        ))}
                      </ul>
                    </SortableContext>

                    {dayItems.length === 0 && (
                      <p className="text-[11px] text-muted-foreground italic px-2 py-1.5">
                        Nothing planned yet
                      </p>
                    )}

                    {/* Add row — bottom of each day */}
                    <button
                      type="button"
                      onClick={() => setAddingDay(day)}
                      className="mt-1.5 w-full inline-flex items-center gap-2 rounded-xl border border-dashed border-border hover:border-foreground/30 hover:bg-accent/30 px-3 py-2 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add manually
                    </button>
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
      </div>

      {/* Dialogs / panels */}
      <AddPlaceSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        tripId={tripId}
        destination={destination}
        destinationCenter={destinationCenter}
        days={days}
      />

      {addingDay && (
        <AddItemDialog
          tripId={tripId}
          dayDate={addingDay}
          sortOrder={getItemsForDay(addingDay).length}
          onClose={() => setAddingDay(null)}
          onAdded={(newItem) => {
            setItems((prev) => [...prev, newItem]);
            setAddingDay(null);
          }}
        />
      )}

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

/* ─── Sortable row ────────────────────────────────────────────────────── */

function SortableItemRow({
  item,
  number,
  color,
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
  color: string;
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

  // Dual-currency price hint.
  const localPrice =
    item.costEstimate != null && localCurrency && localCurrency !== currency && fxRates
      ? convert(item.costEstimate, currency, localCurrency, fxRates)
      : null;

  // Open in Google Maps deep link.
  const directionsUrl = item.locationLat != null && item.locationLng != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${item.locationLat},${item.locationLng}${item.locationName ? `&destination_place_id=${encodeURIComponent(item.locationName)}` : ""}`
    : null;

  return (
    <li
      ref={setNodeRef}
      style={style}
      id={`item-${item.id}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`group rounded-xl border bg-card transition-all ${
        isDragging ? "opacity-40" : ""
      } ${highlighted ? "border-primary/60 shadow-md shadow-primary/20" : "border-border hover:border-foreground/20"}`}
    >
      <div className="flex items-stretch">
        {/* Numbered marker matching map pin */}
        <button
          {...attributes}
          {...listeners}
          className={`shrink-0 w-9 flex items-center justify-center ${color} text-white text-xs font-extrabold rounded-l-xl cursor-grab active:cursor-grabbing`}
          aria-label="Drag to reorder"
        >
          {number}
        </button>

        {/* Optional photo */}
        {item.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.photoUrl}
            alt=""
            className="w-14 object-cover shrink-0"
            loading="lazy"
          />
        )}

        <div className="flex-1 min-w-0 p-2.5">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onStatusCycle}
                  title={`${item.status} — tap to cycle`}
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    item.status === "confirmed" ? "bg-emerald-500" :
                    item.status === "rejected" ? "bg-red-400" : "bg-amber-400"
                  }`}
                />
                <p className={`font-bold text-[13px] leading-tight truncate ${
                  item.status === "rejected" ? "line-through text-muted-foreground" : ""
                }`}>
                  {item.title}
                </p>
                <TypeIcon className={`w-3 h-3 shrink-0 ${TypeCfg.text}`} />
              </div>

              <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] text-muted-foreground">
                {item.startTime && (
                  <span className="tabular-nums">{item.startTime.slice(0, 5)}</span>
                )}
                {item.rating != null && (
                  <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold">
                    ★ {item.rating.toFixed(1)}
                  </span>
                )}
                {item.costEstimate != null && (
                  <span className="tabular-nums">
                    {currencySymbol(currency)}{fmtAmount(item.costEstimate)}
                    {localPrice != null && (
                      <span className="ml-1 opacity-70">
                        · {currencySymbol(localCurrency!)}{fmtAmount(localPrice)}
                      </span>
                    )}
                  </span>
                )}
                {item.locationName && (
                  <span className="truncate max-w-[140px]">{item.locationName}</span>
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
                  className="opacity-50 group-hover:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
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
