"use client";

import { useState, useTransition } from "react";
import { format, parseISO, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles, Hotel, Map } from "lucide-react";
import { TripMap } from "@/components/map/trip-map";
import { ItineraryCard } from "./itinerary-card";
import { AddItemDialog } from "./add-item-dialog";
import { AiPlannerPanel } from "@/components/trips/ai-planner-panel";
import { HotelSearchPanel } from "@/components/hotels/hotel-search-panel";
import { updateItemSortOrders } from "@/lib/actions/itinerary";
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
import type { InferSelectModel } from "drizzle-orm";
import type { itineraryItems } from "@/lib/db/schema";

type Item = InferSelectModel<typeof itineraryItems>;

interface Props {
  tripId: string;
  days: string[];
  items: Item[];
  currency: string;
  destination: string;
  /** Current viewer — needed for permission gates on edit/delete. */
  userId: string;
  /** Whether the viewer is the trip owner (sees every item's edit + delete). */
  isOwner: boolean;
}

interface PoiDefault {
  title: string;
  locationName: string;
}

export function ItineraryBoard({ tripId, days, items: initialItems, currency, destination, userId, isOwner }: Props) {
  const [items, setItems] = useState(initialItems);
  const [addingDay, setAddingDay] = useState<string | null>(null);
  const [poiDefault, setPoiDefault] = useState<PoiDefault | undefined>(undefined);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [hotelOpen, setHotelOpen] = useState(false);
  // Mobile-only map toggle (desktop map is always visible)
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  // B3-d: desktop view mode. Default to "split" so existing users see the
  // same layout; "map" gives the map ~2/3 width with the day list as a
  // scrollable rail. Mobile stays single-pane (map toggle as before).
  const [viewMode, setViewMode] = useState<"split" | "map">("split");
  // B3-d: focus state. focusedDay drives map refit + dimmed-other-markers;
  // highlightedItemId is the hover-emphasised marker.
  const [focusedDay, setFocusedDay] = useState<string | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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
    if (!activeItem || !overItem) return;

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

  // Called when user clicks "Add to itinerary" on a map POI recommendation
  function handleAddFromPoi(name: string, locationName: string) {
    setPoiDefault({ title: name, locationName });
    setAddingDay(days[0] ?? null);
  }

  // B3-d: when a marker is clicked on the map, scroll the matching day
  // card into view and highlight the item. Implementation uses the DOM
  // since DnD-kit already manages the list refs.
  function handleMarkerClick(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    setFocusedDay(item.dayDate);
    setHighlightedItemId(itemId);
    // Brief flash, then release the highlight so the next hover wins.
    setTimeout(() => setHighlightedItemId(null), 1600);
    requestAnimationFrame(() => {
      document
        .getElementById(`day-${item.dayDate}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null;

  const totalEstimated = items
    .filter((i) => i.status !== "rejected" && i.costEstimate)
    .reduce((sum, i) => sum + (i.costEstimate ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Itinerary</h2>
          {totalEstimated > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Estimated total: {currency} {totalEstimated.toLocaleString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile-only map toggle */}
          <button
            type="button"
            onClick={() => setMobileMapOpen((o) => !o)}
            className={`lg:hidden inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              mobileMapOpen
                ? "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-700 dark:text-emerald-400"
                : "border-border text-muted-foreground hover:text-emerald-600 hover:border-emerald-300"
            }`}
          >
            <Map className="w-3.5 h-3.5" />
            Map
          </button>

          {/* B3-d: desktop view toggle — Split (legacy) vs Map (map-first
              with day list as a narrow rail). Sits next to the AI Plan
              CTA so users discover it the first time they look for it. */}
          <div className="hidden lg:inline-flex items-center rounded-full border border-border p-0.5 bg-muted/40">
            <button
              type="button"
              onClick={() => { setViewMode("split"); setFocusedDay(null); }}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === "split"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Split view"
            >
              Split
            </button>
            <button
              type="button"
              onClick={() => { setViewMode("map"); setFocusedDay(days[0] ?? null); }}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
                viewMode === "map"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Map-first view"
            >
              <Map className="w-3 h-3" /> Map
            </button>
          </div>

          <button
            type="button"
            onClick={() => setHotelOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-950/50 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
            Hotels
          </button>
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 border-0 px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-primary/20 transition-opacity"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Plan
          </button>
        </div>
      </div>

      {/* Mobile map panel */}
      {mobileMapOpen && (
        <div className="lg:hidden rounded-xl border overflow-hidden shadow-sm" style={{ height: 400 }}>
          <TripMap
            items={items}
            destination={destination}
            tripId={tripId}
            onAddPoi={handleAddFromPoi}
            focusedDay={focusedDay}
            highlightedItemId={highlightedItemId}
            onItemClick={handleMarkerClick}
          />
        </div>
      )}

      {/* Status legend */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Proposed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Confirmed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Rejected
        </span>
      </div>

      {/* B3-d: day-chip rail. Horizontal-scrollable on mobile, wraps on
          desktop. Click a chip to focus the map on that day (and dim
          other days' markers); "All" resets. Visible in both view modes
          so day navigation is always one tap. */}
      <div className="flex items-center gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setFocusedDay(null)}
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition-all ${
            focusedDay === null
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
          }`}
        >
          All days
        </button>
        {days.map((day, idx) => {
          const count = getItemsForDay(day).length;
          const active = focusedDay === day;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setFocusedDay(active ? null : day)}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition-all ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              {format(parseISO(day), "EEE")} {format(parseISO(day), "d")}
              {count > 0 && (
                <span className={`tabular-nums ${active ? "opacity-100" : "opacity-50"}`}>
                  · {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Desktop: layout grid. Split = legacy (list 1fr + map 400px).
          Map-first = map 1.4fr + list rail 360px on the right (which is
          smaller and lives behind the map visually). */}
      <div
        className={`grid gap-6 items-start ${
          viewMode === "map"
            ? "lg:grid-cols-[360px_minmax(0,1.4fr)]"
            : "lg:grid-cols-[minmax(0,1fr)_400px]"
        }`}
      >

        {/* LEFT: day-by-day itinerary */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col gap-6">
            {days.map((day, idx) => {
              const dayItems = getItemsForDay(day);
              const parsed = parseISO(day);
              const today = isToday(parsed);

              const focused = focusedDay === day;

              return (
                <div
                  key={day}
                  id={`day-${day}`}
                  className={`flex flex-col gap-3 scroll-mt-24 rounded-xl transition-colors ${
                    focused ? "bg-primary/5 -mx-2 px-2 py-2" : ""
                  }`}
                  onMouseEnter={() => viewMode === "map" && setFocusedDay(day)}
                >
                  {/* Day header — clicking it focuses the map on this day. */}
                  <button
                    type="button"
                    onClick={() => setFocusedDay(focused ? null : day)}
                    className="flex items-center gap-3 text-left -mx-1 px-1 py-1 rounded-lg hover:bg-muted/40 transition-colors"
                  >
                    <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border-2 shrink-0 ${focused ? "border-primary bg-primary/15 text-primary" : today ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/30"}`}>
                      <span className="text-xs font-medium leading-none">{format(parsed, "EEE")}</span>
                      <span className="text-lg font-bold leading-tight">{format(parsed, "d")}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">
                        Day {idx + 1} · {format(parsed, "MMMM d, yyyy")}
                        {today && <Badge className="ml-2 text-xs" variant="default">Today</Badge>}
                        {focused && (
                          <span className="ml-2 text-[10px] font-bold tracking-widest uppercase text-primary">
                            on map
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dayItems.length} item{dayItems.length !== 1 ? "s" : ""}
                        {dayItems.filter((i) => i.status === "confirmed").length > 0 &&
                          ` · ${dayItems.filter((i) => i.status === "confirmed").length} confirmed`}
                      </p>
                    </div>
                  </button>

                  {/* Items */}
                  <div className="ml-15 pl-3 border-l-2 border-border/50 flex flex-col gap-2">
                    <SortableContext
                      items={dayItems.map((i) => i.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {dayItems.map((item) => (
                        <div
                          key={item.id}
                          onMouseEnter={() => setHighlightedItemId(item.id)}
                          onMouseLeave={() => setHighlightedItemId(null)}
                        >
                          <ItineraryCard
                            item={item}
                            tripId={tripId}
                            currency={currency}
                            canManage={isOwner || item.createdBy === userId}
                            onOptimisticUpdate={(updated) => {
                              setItems((prev) =>
                                prev.map((i) => (i.id === updated.id ? updated : i))
                              );
                            }}
                            onOptimisticDelete={(id) => {
                              setItems((prev) => prev.filter((i) => i.id !== id));
                            }}
                          />
                        </div>
                      ))}
                    </SortableContext>

                    {dayItems.length === 0 && (
                      <p className="text-xs text-muted-foreground py-2 italic">
                        Nothing planned yet
                      </p>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-fit gap-1.5 text-muted-foreground hover:text-foreground -ml-1 h-7"
                      onClick={() => {
                        setPoiDefault(undefined);
                        setAddingDay(day);
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add item
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <DragOverlay>
            {activeItem && (
              <ItineraryCard
                item={activeItem}
                tripId={tripId}
                currency={currency}
                canManage={isOwner || activeItem.createdBy === userId}
                isDragging
              />
            )}
          </DragOverlay>
        </DndContext>

        {/* RIGHT: sticky map — desktop only. In map-first view the map
            grows taller to dominate the canvas. Markers de-emphasise
            other days when focusedDay is set; clicking a pin scrolls the
            list to the matching card. */}
        <div className="hidden lg:block sticky top-20">
          <div
            className="rounded-xl border overflow-hidden shadow-sm"
            style={{
              height:
                viewMode === "map"
                  ? "calc(100vh - 110px)"
                  : "calc(100vh - 130px)",
              minHeight: viewMode === "map" ? 600 : 500,
            }}
          >
            <TripMap
              items={items}
              destination={destination}
              tripId={tripId}
              onAddPoi={handleAddFromPoi}
              focusedDay={focusedDay}
              highlightedItemId={highlightedItemId}
              onItemClick={handleMarkerClick}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {focusedDay
              ? `Showing ${format(parseISO(focusedDay), "EEE MMM d")} · click "All days" to reset`
              : "Purple pins are recommended places · Click to add"}
          </p>
        </div>

      </div>

      {/* Add item dialog */}
      {addingDay && (
        <AddItemDialog
          tripId={tripId}
          dayDate={addingDay}
          sortOrder={getItemsForDay(addingDay).length}
          defaultValues={poiDefault}
          onClose={() => {
            setAddingDay(null);
            setPoiDefault(undefined);
          }}
          onAdded={(newItem) => {
            setItems((prev) => [...prev, newItem]);
            setAddingDay(null);
            setPoiDefault(undefined);
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
