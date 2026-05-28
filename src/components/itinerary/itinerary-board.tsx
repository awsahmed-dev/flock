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

      {/* Desktop: split layout — itinerary list (left) + sticky map (right) */}
      <div className="grid lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">

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

              return (
                <div key={day} className="flex flex-col gap-3">
                  {/* Day header */}
                  <div className="flex items-center gap-3">
                    <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl border-2 shrink-0 ${today ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/30"}`}>
                      <span className="text-xs font-medium leading-none">{format(parsed, "EEE")}</span>
                      <span className="text-lg font-bold leading-tight">{format(parsed, "d")}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">
                        Day {idx + 1} · {format(parsed, "MMMM d, yyyy")}
                        {today && <Badge className="ml-2 text-xs" variant="default">Today</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dayItems.length} item{dayItems.length !== 1 ? "s" : ""}
                        {dayItems.filter((i) => i.status === "confirmed").length > 0 &&
                          ` · ${dayItems.filter((i) => i.status === "confirmed").length} confirmed`}
                      </p>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="ml-15 pl-3 border-l-2 border-border/50 flex flex-col gap-2">
                    <SortableContext
                      items={dayItems.map((i) => i.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {dayItems.map((item) => (
                        <ItineraryCard
                          key={item.id}
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

        {/* RIGHT: sticky map — desktop only */}
        <div className="hidden lg:block sticky top-20">
          <div className="rounded-xl border overflow-hidden shadow-sm" style={{ height: "calc(100vh - 130px)", minHeight: 500 }}>
            <TripMap
              items={items}
              destination={destination}
              tripId={tripId}
              onAddPoi={handleAddFromPoi}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Purple pins are recommended places · Click to add
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
